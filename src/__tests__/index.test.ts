import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import http from "node:http";
import { parseArgs, createMcpServer, main } from "../index.js";

describe("parseArgs", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.YONOTE_API_TOKEN;
    delete process.env.YONOTE_PROJECT;
    delete process.env.YONOTE_API_BASE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("parses --token argument", () => {
    const result = parseArgs(["--token", "my-token"]);
    expect(result.token).toBe("my-token");
  });

  it("parses --project argument", () => {
    const result = parseArgs(["--project", "acme"]);
    expect(result.baseUrl).toBe("https://acme.yonote.ru/api");
  });

  it("parses --base-url argument", () => {
    const result = parseArgs(["--base-url", "https://custom.example.com/api"]);
    expect(result.baseUrl).toBe("https://custom.example.com/api");
  });

  it("parses all arguments together", () => {
    const result = parseArgs(["--token", "t", "--project", "p", "--base-url", "https://x.com/api"]);
    expect(result.token).toBe("t");
    expect(result.baseUrl).toBe("https://x.com/api");
  });

  it("--base-url takes priority over --project", () => {
    const result = parseArgs(["--project", "acme", "--base-url", "https://override.com/api"]);
    expect(result.baseUrl).toBe("https://override.com/api");
  });

  it("falls back to YONOTE_API_TOKEN env variable", () => {
    process.env.YONOTE_API_TOKEN = "env-token";
    const result = parseArgs([]);
    expect(result.token).toBe("env-token");
  });

  it("--token overrides YONOTE_API_TOKEN env variable", () => {
    process.env.YONOTE_API_TOKEN = "env-token";
    const result = parseArgs(["--token", "cli-token"]);
    expect(result.token).toBe("cli-token");
  });

  it("falls back to YONOTE_API_BASE_URL env variable", () => {
    process.env.YONOTE_API_BASE_URL = "https://env.example.com/api";
    const result = parseArgs([]);
    expect(result.baseUrl).toBe("https://env.example.com/api");
  });

  it("falls back to YONOTE_PROJECT env variable for base URL", () => {
    process.env.YONOTE_PROJECT = "env-project";
    const result = parseArgs([]);
    expect(result.baseUrl).toBe("https://env-project.yonote.ru/api");
  });

  it("uses default base URL when no arguments or env variables", () => {
    const result = parseArgs([]);
    expect(result.baseUrl).toBe("https://app.yonote.ru/api");
    expect(result.token).toBeUndefined();
  });

  it("ignores --token without a value", () => {
    const result = parseArgs(["--token"]);
    expect(result.token).toBeUndefined();
  });

  it("ignores --project without a value", () => {
    const result = parseArgs(["--project"]);
    expect(result.baseUrl).toBe("https://app.yonote.ru/api");
  });

  it("ignores --base-url without a value", () => {
    const result = parseArgs(["--base-url"]);
    expect(result.baseUrl).toBe("https://app.yonote.ru/api");
  });

  it("ignores unknown arguments", () => {
    const result = parseArgs(["--unknown", "value", "--token", "t"]);
    expect(result.token).toBe("t");
  });
});

describe("createMcpServer", () => {
  it("returns an McpServer instance", () => {
    const server = createMcpServer("test-token", "https://test.yonote.ru/api");
    expect(server).toBeDefined();
    expect(server).toHaveProperty("connect");
    expect(server).toHaveProperty("close");
    expect(server).toHaveProperty("tool");
  });
});

describe("main", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.YONOTE_API_TOKEN;
    delete process.env.YONOTE_PROJECT;
    delete process.env.YONOTE_API_BASE_URL;
    delete process.env.TRANSPORT;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("exits with error when token is missing", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(main()).rejects.toThrow("process.exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "YONOTE_API_TOKEN is required. Pass via --token argument or YONOTE_API_TOKEN env variable.",
    );

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("starts stdio transport when TRANSPORT is not set", async () => {
    process.env.YONOTE_API_TOKEN = "test-token";

    const mockConnect = vi.fn().mockResolvedValue(undefined);

    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    vi.spyOn(StdioServerTransport.prototype, "constructor" as never);

    const { McpServer } = await import(
      "@modelcontextprotocol/sdk/server/mcp.js"
    );
    vi.spyOn(McpServer.prototype, "connect").mockImplementation(mockConnect);

    await main();

    expect(mockConnect).toHaveBeenCalledWith(
      expect.any(StdioServerTransport),
    );

    vi.restoreAllMocks();
  });

  describe("HTTP transport", () => {
    let server: http.Server | undefined;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
        server = undefined;
      }
    });

    async function startHttpServer(): Promise<{ server: http.Server; baseUrl: string }> {
      process.env.YONOTE_API_TOKEN = "test-token";
      process.env.TRANSPORT = "http";
      process.env.PORT = "0";

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await main();
      errorSpy.mockRestore();

      server = result as http.Server;
      const address = server.address() as { port: number };
      return { server, baseUrl: `http://127.0.0.1:${address.port}` };
    }

    function get(url: string): Promise<{ status: number; body: string }> {
      return new Promise((resolve, reject) => {
        http.get(url, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ status: res.statusCode!, body: data }));
        }).on("error", reject);
      });
    }

    it("starts and listens on the specified port", async () => {
      const { server: s } = await startHttpServer();
      const address = s.address() as { port: number };
      expect(address.port).toBeGreaterThan(0);
    });

    it("/health returns 200 with status ok", async () => {
      const { baseUrl } = await startHttpServer();
      const res = await get(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ status: "ok" });
    });

    it("unknown route returns 404", async () => {
      const { baseUrl } = await startHttpServer();
      const res = await get(`${baseUrl}/unknown`);
      expect(res.status).toBe(404);
      expect(res.body).toBe("Not Found");
    });

    it("/mcp responds to GET requests", async () => {
      const { baseUrl } = await startHttpServer();
      const res = await get(`${baseUrl}/mcp`);
      // MCP StreamableHTTP транспорт принимает только POST, GET для SSE
      // Но сервер не должен упасть — возвращает ответ от транспорта
      expect(res.status).toBeDefined();
    });

    it("logs startup message", async () => {
      process.env.YONOTE_API_TOKEN = "test-token";
      process.env.TRANSPORT = "http";
      process.env.PORT = "0";

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await main();
      server = result as http.Server;

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Yonote MCP server (HTTP) listening on"),
      );
      errorSpy.mockRestore();
    });
  });

});
