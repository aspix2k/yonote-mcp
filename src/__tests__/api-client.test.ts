import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeBaseUrl,
  YonoteApiError,
  YonoteClient,
} from "../api-client.js";

describe("YonoteClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const temporaryDirectories: string[] = [];

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((path) => rm(path, { recursive: true, force: true })),
    );
  });

  function client(
    overrides: Partial<ConstructorParameters<typeof YonoteClient>[0]> = {},
  ): YonoteClient {
    return new YonoteClient({
      token: "test-token",
      baseUrl: "https://app.yonote.ru/api",
      maxRetries: 0,
      fetch: fetchMock as typeof fetch,
      ...overrides,
    });
  }

  it("supports the legacy constructor and rejects blank tokens", () => {
    expect(
      new YonoteClient("token", "https://app.yonote.ru/api"),
    ).toBeInstanceOf(YonoteClient);
    expect(
      () =>
        new YonoteClient({
          token: "   ",
          baseUrl: "https://app.yonote.ru/api",
        }),
    ).toThrow("Yonote API token is required");
  });

  it("builds a URL below the configured API base", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await client().request("documents.list");

    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "https://app.yonote.ru/api/documents.list",
    );
  });

  it("sends the token, user agent, and JSON headers", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await client({ userAgent: "yonote-mcp/test" }).request("auth.info");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      Accept: "application/json, application/octet-stream",
      "User-Agent": "yonote-mcp/test",
    });
  });

  it("omits undefined while preserving null and empty values", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await client().request("documents.update", {
      id: "doc-1",
      title: "",
      cover: null,
      publish: false,
      ignored: undefined,
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      id: "doc-1",
      title: "",
      cover: null,
      publish: false,
    });
  });

  it("parses JSON responses", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: "1" }] }));
    await expect(client().request("documents.list")).resolves.toEqual({
      data: [{ id: "1" }],
    });
  });

  it("rejects an unexpected success content type", async () => {
    fetchMock.mockResolvedValue(
      new Response("binary", {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    );
    await expect(client().request("documents.info")).rejects.toMatchObject({
      errorId: "unexpected_response",
    });

    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await expect(client().request("documents.info")).rejects.toMatchObject({
      publicMessage: "Expected JSON but received an unknown content type",
    });
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(client().request("test.method")).resolves.toBeUndefined();
  });

  it("supports GET query parameters without a request body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [] }));
    await client().request("v2/shares/share-1/passwords", undefined, {
      method: "GET",
      query: {
        limit: 10,
        active: false,
        empty: "",
        ignoredNull: null,
        ignoredUndefined: undefined,
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.search).toBe("?limit=10&active=false&empty=");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("parses API errors and redacts the token", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: "forbidden", message: "token test-token is invalid" },
        403,
      ),
    );

    try {
      await client({ maxRetries: 2, retryDelayMs: 0 }).request(
        "documents.info",
      );
      expect.fail("request should fail");
    } catch (error) {
      expect(error).toBeInstanceOf(YonoteApiError);
      expect(error).toMatchObject({
        status: 403,
        errorId: "forbidden",
        publicMessage: "token [redacted] is invalid",
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries idempotent Yonote endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await client({ maxRetries: 1, retryDelayMs: 0 }).request("documents.list");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([408, 429, 502, 503, 504])(
    "retries idempotent requests after HTTP %s",
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ error: "busy" }, status))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      await expect(
        client({ maxRetries: 1, retryDelayMs: 0 }).request("documents.info"),
      ).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("honors explicit idempotency overrides", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(
      client({ maxRetries: 1, retryDelayMs: 0 }).request(
        "documents.create",
        {},
        { idempotent: true },
      ),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock
      .mockReset()
      .mockResolvedValue(jsonResponse({ error: "busy" }, 503));
    await expect(
      client({ maxRetries: 2, retryDelayMs: 0 }).request(
        "documents.list",
        {},
        { idempotent: false },
      ),
    ).rejects.toBeInstanceOf(YonoteApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses validated fallback retry settings", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "busy" }, 503));
    await expect(
      client({ maxRetries: 0, retryDelayMs: 0 }).request("documents.info"),
    ).rejects.toBeInstanceOf(YonoteApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock
      .mockReset()
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(
      client({ maxRetries: -1, retryDelayMs: -1 }).request("documents.info"),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry mutating endpoints", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "busy" }, 503));

    await expect(
      client({ maxRetries: 2, retryDelayMs: 0 }).request("documents.create"),
    ).rejects.toBeInstanceOf(YonoteApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries transient network failures only for idempotent requests", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    await expect(
      client({ maxRetries: 1, retryDelayMs: 0 }).request("documents.info"),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset().mockRejectedValue(new TypeError("network down"));
    await expect(
      client({ maxRetries: 2, retryDelayMs: 0 }).request("documents.create"),
    ).rejects.toThrow("network down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an endpoint that escapes the API base", async () => {
    await expect(client().request("../auth.info")).rejects.toThrow(
      "Invalid Yonote API endpoint",
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(
      client().request("https://evil.example/auth.info"),
    ).rejects.toThrow("escaped the configured base URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts only manual responses in the redirect status range", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }, 300));
    await expect(
      client().request("documents.info", undefined, { redirect: "manual" }),
    ).resolves.toEqual({ ok: true });

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "redirect" }, 302));
    await expect(client().request("documents.info")).rejects.toMatchObject({
      status: 302,
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "bad" }, 400));
    await expect(
      client().request("documents.info", undefined, { redirect: "manual" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns a validated temporary redirect URL", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://storage.example/export.zip" },
      }),
    );

    await expect(
      client().getRedirect("fileOperations.redirect", { id: "op-1" }),
    ).resolves.toEqual({ url: "https://storage.example/export.zip" });
  });

  it("does not retry non-idempotent redirect operations", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"));

    await expect(
      client({ maxRetries: 2, retryDelayMs: 0 }).getRedirect(
        "telegram.commands",
        { group: true },
        false,
      ),
    ).rejects.toThrow("network down");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects missing or unsafe temporary redirect URLs", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(
      client().getRedirect("fileOperations.redirect", { id: "op-1" }),
    ).rejects.toMatchObject({ errorId: "redirect_missing" });

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://storage.example/export.zip" },
      }),
    );
    await expect(
      client().getRedirect("fileOperations.redirect", { id: "op-1" }),
    ).rejects.toThrow("must use HTTPS");

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://user:pass@storage.example/export.zip" },
      }),
    );
    await expect(
      client().getRedirect("fileOperations.redirect", { id: "op-1" }),
    ).rejects.toThrow("embedded credentials");
  });

  it("allows an HTTP download URL only when explicitly configured", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://localhost/export.zip" },
      }),
    );
    await expect(
      client({ allowInsecureHttp: true }).getRedirect(
        "fileOperations.redirect",
        { id: "op-1" },
      ),
    ).resolves.toEqual({ url: "http://localhost/export.zip" });

    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "ftp://storage.example/export.zip" },
      }),
    );
    await expect(
      client({ allowInsecureHttp: true }).getRedirect(
        "fileOperations.redirect",
        { id: "op-1" },
      ),
    ).rejects.toThrow("must use HTTPS");
  });

  it("downloads without forwarding the Yonote authorization header", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://storage.example/export.zip" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("archive", {
          status: 200,
          headers: {
            "content-type": "application/zip",
            "content-length": "7",
          },
        }),
      );

    const result = await client({ exportDir }).download(
      "fileOperations.redirect",
      { id: "op-1" },
      "export.zip",
    );

    expect(await readFile(result.path, "utf8")).toBe("archive");
    expect(result).toMatchObject({ size: 7, contentType: "application/zip" });
    const firstHeaders = fetchMock.mock.calls[0][1].headers;
    const secondRequest = fetchMock.mock.calls[1][1] as RequestInit;
    const secondHeaders = secondRequest.headers;
    expect(firstHeaders).toMatchObject({ Authorization: "Bearer test-token" });
    expect(secondHeaders).toEqual({ Accept: "application/octet-stream" });
    expect(secondRequest.redirect).toBe("follow");
  });

  it("rejects unsafe download filenames", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("archive", {
        status: 200,
        headers: { "content-type": "application/zip" },
      }),
    );

    await expect(
      client({ exportDir }).download(
        "fileOperations.redirect",
        { id: "op-1" },
        "../export.zip",
      ),
    ).rejects.toMatchObject({ errorId: "invalid_download_filename" });
  });

  it("uses a UTF-8 content-disposition filename for direct downloads", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("lesson", {
        status: 200,
        headers: {
          "content-type": "text/markdown",
          "content-disposition": "attachment; filename*=UTF-8''lesson%20one.md",
        },
      }),
    );

    const downloaded = await client({ exportDir }).download(
      "fileOperations.redirect",
      { id: "op-1" },
    );
    expect(downloaded.path).toBe(join(exportDir, "lesson one.md"));
    expect(await readFile(downloaded.path, "utf8")).toBe("lesson");
  });

  it.each([
    ["application/zip", ".zip"],
    ["application/json", ".json"],
    ["text/markdown", ".md"],
    ["text/plain", ".txt"],
    ["application/octet-stream", ".bin"],
  ])("derives a %s download filename", async (contentType, extension) => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("data", {
        status: 200,
        headers: { "content-type": contentType },
      }),
    );

    const downloaded = await client({ exportDir }).download(
      "fileOperations.redirect",
      { id: "op-1" },
    );
    expect(downloaded.path).toBe(
      join(exportDir, `fileOperations-redirect-op-1${extension}`),
    );
  });

  it.each([
    ['attachment; filename="quoted export.zip"', "quoted export.zip"],
    ["attachment; filename=plain-export.zip", "plain-export.zip"],
  ])("uses a plain content-disposition filename", async (disposition, name) => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("data", {
        status: 200,
        headers: { "content-disposition": disposition },
      }),
    );

    const downloaded = await client({ exportDir }).download(
      "fileOperations.redirect",
      undefined,
    );
    expect(downloaded.path).toBe(join(exportDir, name));
  });

  it.each(["", "bad\0.md", `file.${"x".repeat(16)}`])(
    "rejects invalid download filename %j",
    async (filename) => {
      const exportDir = await temporaryDirectory();
      fetchMock.mockResolvedValue(new Response("data", { status: 200 }));

      await expect(
        client({ exportDir }).download(
          "fileOperations.redirect",
          { id: "op-1" },
          filename,
        ),
      ).rejects.toMatchObject({ errorId: "invalid_download_filename" });
    },
  );

  it("enforces the configured download limit", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("archive", {
        status: 200,
        headers: { "content-length": "7" },
      }),
    );

    await expect(
      client({ exportDir, maxDownloadBytes: 3 }).download(
        "fileOperations.redirect",
        { id: "op-1" },
      ),
    ).rejects.toMatchObject({ errorId: "download_too_large" });
  });

  it("enforces the download limit when content-length is absent", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("archive", {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      }),
    );

    await expect(
      client({ exportDir, maxDownloadBytes: 3 }).download(
        "fileOperations.redirect",
        { id: "op-1" },
      ),
    ).rejects.toMatchObject({ errorId: "download_too_large" });
  });

  it("falls back to the default download limit for invalid options", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock.mockResolvedValue(
      new Response("data", {
        status: 200,
        headers: { "content-length": String(600 * 1024) },
      }),
    );

    await expect(
      client({ exportDir, maxDownloadBytes: 0 }).download(
        "fileOperations.redirect",
        { id: "op-1" },
        "export.bin",
      ),
    ).resolves.toMatchObject({ size: 4 });
  });

  it("reports signed-storage HTTP failures", async () => {
    const exportDir = await temporaryDirectory();
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://storage.example/export.zip" },
        }),
      )
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));

    await expect(
      client({ exportDir }).download("fileOperations.redirect", { id: "op-1" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("imports only a supported file from the configured directory", async () => {
    const importDir = await temporaryDirectory();
    await writeFile(join(importDir, "lesson.md"), "# Lesson");
    fetchMock.mockResolvedValue(jsonResponse({ data: { id: "doc-1" } }));

    await expect(
      client({ importDir }).importDocument("lesson.md", {
        collectionId: "collection-1",
        publish: true,
      }),
    ).resolves.toEqual({ data: { id: "doc-1" } });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("collectionId")).toBe("collection-1");
    expect(
      (init.headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
  });

  it.each([
    ["lesson.markdown", "text/markdown"],
    ["lesson.txt", "text/plain"],
    ["lesson.html", "text/html"],
    ["lesson.htm", "text/html"],
    [
      "lesson.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  ])("uses the documented MIME type for %s", async (filename, contentType) => {
    const importDir = await temporaryDirectory();
    await writeFile(join(importDir, filename), "lesson");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await client({ importDir }).importDocument(filename, {});
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect((form.get("file") as File).type).toBe(contentType);
  });

  it("sends multipart fields and an optional local certificate", async () => {
    const importDir = await temporaryDirectory();
    await writeFile(join(importDir, "ldap.pem"), "certificate");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await expect(
      client({ importDir }).requestMultipart(
        "ldap.ping",
        { hostName: "ldap.example.com", ssl: true, ignored: undefined },
        {
          field: "certificate",
          filename: "ldap.pem",
          contentType: "application/x-pem-file",
        },
      ),
    ).resolves.toEqual({ ok: true });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const form = init.body as FormData;
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer test-token",
      Accept: "application/json",
      "User-Agent": "yonote-mcp",
    });
    expect(form.get("hostName")).toBe("ldap.example.com");
    expect(form.get("ssl")).toBe("true");
    expect(form.has("ignored")).toBe(false);
    expect((form.get("certificate") as File).type).toBe(
      "application/x-pem-file",
    );
  });

  it("sends multipart fields without requiring an import directory", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await expect(
      client().requestMultipart("ldap.ping", {
        hostName: "ldap.example.com",
        ssl: false,
      }),
    ).resolves.toEqual({ ok: true });

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get("hostName")).toBe("ldap.example.com");
    expect(form.get("ssl")).toBe("false");
    expect(form.has("certificate")).toBe(false);
  });

  it("falls back to the default import limit for invalid options", async () => {
    const importDir = await temporaryDirectory();
    await writeFile(join(importDir, "lesson.md"), Buffer.alloc(60 * 1024));
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await expect(
      client({ importDir, maxImportBytes: 0 }).importDocument("lesson.md", {}),
    ).resolves.toEqual({ ok: true });
  });

  it("rejects unsupported import files", async () => {
    const importDir = await temporaryDirectory();
    await writeFile(join(importDir, "script.sh"), "exit 0");

    await expect(
      client({ importDir }).importDocument("script.sh", {}),
    ).rejects.toThrow("Yonote imports support");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects import traversal, symlink escape, directories, and oversized files", async () => {
    const importDir = await temporaryDirectory();
    const outsideDir = await temporaryDirectory();
    await writeFile(join(outsideDir, "outside.md"), "outside");
    await symlink(join(outsideDir, "outside.md"), join(importDir, "link.md"));
    await mkdir(join(importDir, "directory.md"));
    await writeFile(join(importDir, "large.md"), "12345");

    await expect(
      client({ importDir }).importDocument("../outside.md", {}),
    ).rejects.toMatchObject({ errorId: "invalid_import_file" });
    await expect(
      client({ importDir }).importDocument("link.md", {}),
    ).rejects.toMatchObject({ errorId: "invalid_import_file" });
    await expect(
      client({ importDir }).importDocument("directory.md", {}),
    ).rejects.toMatchObject({ errorId: "invalid_import_file" });
    await expect(
      client({ importDir, maxImportBytes: 4 }).importDocument("large.md", {}),
    ).rejects.toMatchObject({ errorId: "import_too_large" });
  });

  it("reports Yonote errors during multipart import", async () => {
    const importDir = await temporaryDirectory();
    await writeFile(join(importDir, "lesson.txt"), "Lesson");
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "forbidden", message: "No access" }, 403),
    );

    await expect(
      client({ importDir }).importDocument("lesson.txt", {}),
    ).rejects.toMatchObject({ status: 403, errorId: "forbidden" });
  });

  it("falls back safely for malformed API error bodies", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-json", { status: 500, statusText: "Upstream failed" }),
    );
    await expect(client().request("documents.info")).rejects.toMatchObject({
      errorId: "unknown",
      publicMessage: "Upstream failed",
    });
  });

  it("uses stable fallbacks and bounds public API error messages", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(client().request("documents.info")).rejects.toMatchObject({
      errorId: "unknown",
      publicMessage: "Request failed",
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "long", message: "x".repeat(1_100) }, 500),
    );
    try {
      await client().request("documents.info");
      expect.fail("request should fail");
    } catch (error) {
      expect(error).toMatchObject({
        errorId: "long",
        publicMessage: "x".repeat(1_000),
      });
    }
  });

  it("requires explicit directories for host file access", async () => {
    await expect(
      client().download("fileOperations.redirect", { id: "op-1" }),
    ).rejects.toMatchObject({ errorId: "export_not_configured" });
    await expect(
      client().importDocument("lesson.md", {}),
    ).rejects.toMatchObject({ errorId: "import_not_configured" });
  });

  it("reports unavailable import directories and missing files", async () => {
    const importDir = await temporaryDirectory();

    await expect(
      client({ importDir: join(importDir, "missing") }).importDocument(
        "lesson.md",
        {},
      ),
    ).rejects.toMatchObject({ errorId: "import_directory_unavailable" });
    await expect(
      client({ importDir }).importDocument("missing.md", {}),
    ).rejects.toMatchObject({ errorId: "import_file_not_found" });
  });

  async function temporaryDirectory(): Promise<string> {
    const path = await mkdtemp(join(tmpdir(), "yonote-mcp-test-"));
    temporaryDirectories.push(path);
    return path;
  }
});

describe("normalizeBaseUrl", () => {
  it("normalizes trailing slashes", () => {
    expect(normalizeBaseUrl("https://app.yonote.ru/api///").toString()).toBe(
      "https://app.yonote.ru/api",
    );
  });

  it("requires HTTPS by default", () => {
    expect(() => normalizeBaseUrl("http://localhost:3000/api")).toThrow(
      "must use HTTPS",
    );
  });

  it("allows explicitly configured development HTTP", () => {
    expect(normalizeBaseUrl("http://localhost:3000/api", true).toString()).toBe(
      "http://localhost:3000/api",
    );
  });

  it("rejects embedded credentials", () => {
    expect(() =>
      normalizeBaseUrl("https://user:password@app.yonote.ru/api"),
    ).toThrow("cannot contain credentials");
  });

  it.each([
    "https://user@app.yonote.ru/api",
    "https://:password@app.yonote.ru/api",
    "https://app.yonote.ru/api?project=one",
    "https://app.yonote.ru/api#fragment",
  ])("rejects unsafe base URL %s", (url) => {
    expect(() => normalizeBaseUrl(url)).toThrow(
      "cannot contain credentials, query, or fragment",
    );
  });

  it("rejects non-HTTP protocols even in insecure mode", () => {
    expect(() => normalizeBaseUrl("ftp://app.yonote.ru/api", true)).toThrow(
      "must use HTTPS",
    );
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status >= 400 ? "Request failed" : "OK",
    headers: { "content-type": "application/json" },
  });
}
