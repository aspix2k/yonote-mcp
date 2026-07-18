import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs } from "../config.js";

describe("parseArgs", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((path) => rm(path, { recursive: true, force: true })),
    );
  });

  it("uses safe defaults", () => {
    const config = parseArgs([], { YONOTE_API_TOKEN: "token" });

    expect(config).toMatchObject({
      token: "token",
      baseUrl: "https://app.yonote.ru/api",
      transport: "stdio",
      host: "127.0.0.1",
      port: 3000,
      profile: "readonly",
      apiChannel: "stable",
      timeoutMs: 30_000,
      maxRetries: 2,
      maxDownloadBytes: 512 * 1024 * 1024,
      maxImportBytes: 50 * 1024 * 1024,
      allowInsecureHttp: false,
      allowedHosts: [],
      allowedOrigins: [],
      warnings: [],
    });
    expect(config.enabledTools).toEqual(new Set());
    expect(config.disabledTools).toEqual(new Set());
  });

  it("trims secrets and ignores an empty HTTP bearer token", () => {
    const config = parseArgs([], {
      YONOTE_API_TOKEN: "  token  ",
      MCP_HTTP_BEARER_TOKEN: "   ",
    });

    expect(config.token).toBe("token");
    expect(config.httpBearerToken).toBeUndefined();
    expect(() => parseArgs([], { YONOTE_API_TOKEN: "   " })).toThrow(
      "YONOTE_API_TOKEN",
    );
  });

  it("builds a project-specific URL", () => {
    const config = parseArgs(["--project", "acme-team"], {
      YONOTE_API_TOKEN: "token",
    });
    expect(config.baseUrl).toBe("https://acme-team.yonote.ru/api");
    expect(config.warnings).toEqual([]);

    expect(
      parseArgs(["--project", "a"], { YONOTE_API_TOKEN: "token" }).baseUrl,
    ).toBe("https://a.yonote.ru/api");
  });

  it("parses the public runtime options", () => {
    const config = parseArgs(
      [
        "--base-url",
        "https://knowledge.example/api",
        "--transport",
        "http",
        "--host",
        "127.0.0.1",
        "--port",
        "4100",
        "--profile",
        "export",
        "--api-channel",
        "preview",
        "--enable-tools",
        "documents_info,documents_export",
        "--disable-tools",
        "documents_export",
        "--timeout-ms",
        "1000",
        "--max-retries",
        "1",
        "--export-dir",
        "/tmp/exports",
        "--import-dir",
        "/tmp/imports",
        "--max-download-bytes",
        "2048",
        "--max-import-bytes",
        "1024",
        "--allowed-hosts",
        " localhost, mcp.example.com ",
        "--allowed-origins",
        " https://one.example,https://two.example ",
        "--allow-insecure-http",
      ],
      { YONOTE_API_TOKEN: "token" },
    );

    expect(config).toMatchObject({
      baseUrl: "https://knowledge.example/api",
      transport: "http",
      port: 4100,
      profile: "export",
      apiChannel: "preview",
      timeoutMs: 1000,
      maxRetries: 1,
      exportDir: "/tmp/exports",
      importDir: "/tmp/imports",
      maxDownloadBytes: 2048,
      maxImportBytes: 1024,
      allowInsecureHttp: true,
    });
    expect(config.enabledTools).toEqual(
      new Set(["documents_info", "documents_export"]),
    );
    expect(config.disabledTools).toEqual(new Set(["documents_export"]));
    expect(config.allowedHosts).toEqual(["localhost", "mcp.example.com"]);
    expect(config.allowedOrigins).toEqual([
      "https://one.example",
      "https://two.example",
    ]);
  });

  it.each(["readonly", "export", "editor", "admin"])(
    "accepts the %s profile",
    (profile) => {
      expect(
        parseArgs(["--profile", profile], { YONOTE_API_TOKEN: "token" })
          .profile,
      ).toBe(profile);
    },
  );

  it.each(["stable", "preview", "legacy"])(
    "accepts the %s API channel",
    (apiChannel) => {
      expect(
        parseArgs(["--api-channel", apiChannel], {
          YONOTE_API_TOKEN: "token",
        }).apiChannel,
      ).toBe(apiChannel);
    },
  );

  it("reads a token from a file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "yonote-config-test-"));
    temporaryDirectories.push(directory);
    const tokenFile = join(directory, "token");
    await writeFile(tokenFile, "file-token\n", { mode: 0o600 });

    const config = parseArgs(["--token-file", tokenFile], {
      YONOTE_API_TOKEN: "environment-token",
    });
    expect(config.token).toBe("file-token");
  });

  it("warns about command-line tokens", () => {
    const config = parseArgs(["--token", "token"], {});
    expect(config.warnings).toContainEqual(expect.stringContaining("--token"));
  });

  it("does not warn when the token comes from the environment", () => {
    expect(parseArgs([], { YONOTE_API_TOKEN: "token" }).warnings).toEqual([]);
  });

  it("supports legacy transport variables with a warning", () => {
    const config = parseArgs([], {
      YONOTE_API_TOKEN: "token",
      TRANSPORT: "http",
      PORT: "4000",
    });
    expect(config.transport).toBe("http");
    expect(config.port).toBe(4000);
    expect(config.warnings).toContainEqual(
      expect.stringContaining("deprecated"),
    );

    expect(
      parseArgs([], {
        YONOTE_API_TOKEN: "token",
        TRANSPORT: "stdio",
      }).warnings,
    ).toContainEqual(expect.stringContaining("deprecated"));
    expect(
      parseArgs([], { YONOTE_API_TOKEN: "token", PORT: "3000" }).warnings,
    ).toContainEqual(expect.stringContaining("deprecated"));
  });

  it("requires a Yonote token", () => {
    expect(() => parseArgs([], {})).toThrow("YONOTE_API_TOKEN");
  });

  it("rejects unknown and incomplete arguments", () => {
    expect(() =>
      parseArgs(["--unknown", "value"], { YONOTE_API_TOKEN: "token" }),
    ).toThrow("Unknown argument");
    expect(() =>
      parseArgs(["--project"], { YONOTE_API_TOKEN: "token" }),
    ).toThrow("Missing value");
    expect(() =>
      parseArgs(["--project", "--profile", "admin"], {
        YONOTE_API_TOKEN: "token",
      }),
    ).toThrow("Missing value");
  });

  it("rejects unknown tools and profiles", () => {
    expect(() =>
      parseArgs(["--enable-tools", "does_not_exist"], {
        YONOTE_API_TOKEN: "token",
      }),
    ).toThrow("Unknown Yonote tool");
    expect(() =>
      parseArgs(["--profile", "full"], { YONOTE_API_TOKEN: "token" }),
    ).toThrow("must be readonly, export, editor, or admin");
    expect(() =>
      parseArgs(["--api-channel", "nightly"], {
        YONOTE_API_TOKEN: "token",
      }),
    ).toThrow("must be stable, preview, or legacy");
  });

  it("rejects unsupported transports", () => {
    expect(() =>
      parseArgs(["--transport", "ftp"], { YONOTE_API_TOKEN: "token" }),
    ).toThrow("must be stdio or http");
  });

  it.each([
    ["--port", "-1"],
    ["--port", "65536"],
    ["--port", "1.5"],
    ["--timeout-ms", "0"],
    ["--timeout-ms", "600001"],
    ["--max-retries", "-1"],
    ["--max-retries", "11"],
    ["--max-download-bytes", "0"],
    ["--max-import-bytes", "0"],
  ])("rejects invalid numeric option %s=%s", (argument, value) => {
    expect(() =>
      parseArgs([argument, value], { YONOTE_API_TOKEN: "token" }),
    ).toThrow("Invalid");
  });

  it.each([
    ["--port", "-1", "Invalid MCP port: -1"],
    ["--timeout-ms", "0", "Invalid request timeout: 0"],
    ["--max-retries", "-1", "Invalid maximum retries: -1"],
    ["--max-download-bytes", "0", "Invalid maximum download bytes: 0"],
    ["--max-import-bytes", "0", "Invalid maximum import bytes: 0"],
  ])(
    "reports the exact numeric configuration error",
    (argument, value, error) => {
      expect(() =>
        parseArgs([argument, value], { YONOTE_API_TOKEN: "token" }),
      ).toThrow(error);
    },
  );

  it("accepts numeric upper bounds", () => {
    expect(
      parseArgs(
        ["--port", "65535", "--timeout-ms", "600000", "--max-retries", "10"],
        { YONOTE_API_TOKEN: "token" },
      ),
    ).toMatchObject({ port: 65_535, timeoutMs: 600_000, maxRetries: 10 });
  });

  it.each(["1", "true", "yes", "on", "TRUE"])(
    "accepts true boolean value %s",
    (value) => {
      expect(
        parseArgs([], {
          YONOTE_API_TOKEN: "token",
          YONOTE_ALLOW_INSECURE_HTTP: value,
        }).allowInsecureHttp,
      ).toBe(true);
    },
  );

  it.each(["0", "false", "no", "off", "FALSE"])(
    "accepts false boolean value %s",
    (value) => {
      expect(
        parseArgs([], {
          YONOTE_API_TOKEN: "token",
          YONOTE_ALLOW_INSECURE_HTTP: value,
        }).allowInsecureHttp,
      ).toBe(false);
    },
  );

  it("rejects an invalid boolean value", () => {
    expect(() =>
      parseArgs([], {
        YONOTE_API_TOKEN: "token",
        YONOTE_ALLOW_INSECURE_HTTP: "sometimes",
      }),
    ).toThrow("Invalid boolean value");
  });

  it.each(["-leading", "trailing-", "contains_underscore", "a".repeat(64)])(
    "rejects invalid project name %s",
    (project) => {
      expect(() =>
        parseArgs(["--project", project], { YONOTE_API_TOKEN: "token" }),
      ).toThrow("Invalid Yonote project name");
    },
  );

  it("requires HTTP authentication and host validation off loopback", () => {
    expect(() =>
      parseArgs(["--transport", "http", "--host", "0.0.0.0"], {
        YONOTE_API_TOKEN: "token",
      }),
    ).toThrow("MCP_HTTP_BEARER_TOKEN");
    expect(() =>
      parseArgs(["--transport", "http", "--host", "0.0.0.0"], {
        YONOTE_API_TOKEN: "token",
        MCP_HTTP_BEARER_TOKEN: "mcp-token",
      }),
    ).toThrow("MCP_ALLOWED_HOSTS");

    const config = parseArgs(["--transport", "http", "--host", "0.0.0.0"], {
      YONOTE_API_TOKEN: "token",
      MCP_HTTP_BEARER_TOKEN: "mcp-token",
      MCP_ALLOWED_HOSTS: "mcp.example.com",
    });
    expect(config.allowedHosts).toEqual(["mcp.example.com"]);
  });

  it.each(["127.0.0.1", "localhost", "::1"])(
    "allows unauthenticated HTTP on loopback host %s",
    (host) => {
      const config = parseArgs(["--transport", "http", "--host", host], {
        YONOTE_API_TOKEN: "token",
      });
      expect(config.host).toBe(host);
      expect(config.httpBearerToken).toBeUndefined();
    },
  );

  it("does not require HTTP server controls for stdio", () => {
    const config = parseArgs(["--host", "0.0.0.0"], {
      YONOTE_API_TOKEN: "token",
    });
    expect(config.transport).toBe("stdio");
    expect(config.host).toBe("0.0.0.0");
  });
});
