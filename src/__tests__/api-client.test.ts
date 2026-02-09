import { describe, it, expect, vi, beforeEach } from "vitest";
import { YonoteClient, YonoteApiError } from "../api-client.js";

describe("YonoteClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  function mockFetchOk(data: unknown) {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });
  }

  function mockFetchError(status: number, statusText: string, body?: unknown) {
    fetchMock.mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: body !== undefined
        ? () => Promise.resolve(body)
        : () => Promise.reject(new Error("no json")),
    });
  }

  it("builds correct URL from baseUrl and method", async () => {
    mockFetchOk({ ok: true });
    const client = new YonoteClient("token", "https://app.yonote.ru/api");
    await client.request("documents.list");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.yonote.ru/api/documents.list",
      expect.any(Object),
    );
  });

  it("removes trailing slash from baseUrl", async () => {
    mockFetchOk({ ok: true });
    const client = new YonoteClient("token", "https://app.yonote.ru/api/");
    await client.request("auth.info");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.yonote.ru/api/auth.info",
      expect.any(Object),
    );
  });

  it("sends POST request", async () => {
    mockFetchOk({});
    const client = new YonoteClient("token", "https://test.api/api");
    await client.request("test.method");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
  });

  it("sends Bearer token in Authorization header", async () => {
    mockFetchOk({});
    const client = new YonoteClient("my-secret-token", "https://test.api/api");
    await client.request("test.method");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer my-secret-token");
  });

  it("sends Content-Type and Accept as application/json", async () => {
    mockFetchOk({});
    const client = new YonoteClient("token", "https://test.api/api");
    await client.request("test.method");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Accept).toBe("application/json");
  });

  it("filters out undefined, null, and empty string from body", async () => {
    mockFetchOk({});
    const client = new YonoteClient("token", "https://test.api/api");
    await client.request("test.method", {
      keep: "value",
      zero: 0,
      falsy: false,
      removeUndefined: undefined,
      removeNull: null,
      removeEmpty: "",
    });

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toEqual({ keep: "value", zero: 0, falsy: false });
  });

  it("sends empty JSON object when no body provided", async () => {
    mockFetchOk({});
    const client = new YonoteClient("token", "https://test.api/api");
    await client.request("test.method");

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({});
  });

  it("returns parsed JSON response on success", async () => {
    const data = { data: [{ id: "1", title: "Test" }] };
    mockFetchOk(data);
    const client = new YonoteClient("token", "https://test.api/api");
    const result = await client.request("documents.list");
    expect(result).toEqual(data);
  });

  it("throws YonoteApiError on HTTP error with parsed body", async () => {
    mockFetchError(404, "Not Found", {
      error: "not_found",
      message: "Document not found",
    });
    const client = new YonoteClient("token", "https://test.api/api");

    await expect(client.request("documents.info", { id: "bad" })).rejects.toThrow(
      YonoteApiError,
    );
    await expect(client.request("documents.info", { id: "bad" })).rejects.toThrow(
      /404/,
    );
  });

  it("throws YonoteApiError with errorId and message from response body", async () => {
    mockFetchError(422, "Unprocessable", {
      error: "validation_error",
      message: "title is required",
    });
    const client = new YonoteClient("token", "https://test.api/api");

    try {
      await client.request("documents.create");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(YonoteApiError);
      const err = e as YonoteApiError;
      expect(err.status).toBe(422);
      expect(err.errorId).toBe("validation_error");
      expect(err.message).toContain("title is required");
    }
  });

  it("throws YonoteApiError with statusText fallback when body is not parseable", async () => {
    mockFetchError(500, "Internal Server Error");
    const client = new YonoteClient("token", "https://test.api/api");

    try {
      await client.request("test.method");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(YonoteApiError);
      const err = e as YonoteApiError;
      expect(err.status).toBe(500);
      expect(err.errorId).toBe("unknown");
      expect(err.message).toContain("Internal Server Error");
    }
  });
});
