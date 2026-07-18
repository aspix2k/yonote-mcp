import { createServer as createHttpServer, type Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../config.js";
import {
  createMcpServer,
  main,
  SERVER_VERSION,
  startHttpServer,
} from "../index.js";
import {
  TOOL_POLICIES,
  type ToolApiChannel,
  type ToolCapability,
  type ToolProfile,
} from "../tool-policy.js";

describe("createMcpServer", () => {
  it.each([
    ["readonly", ["read"]],
    ["export", ["read", "export"]],
    ["editor", ["read", "export", "write"]],
    ["admin", ["read", "export", "write", "admin"]],
  ] as const)("exposes only the %s profile", async (profile, capabilities) => {
    const tools = await listTools(runtimeConfig({ profile }));
    const allowedCapabilities = new Set<ToolCapability>(capabilities);
    const expected = Object.entries(TOOL_POLICIES)
      .filter(
        ([, policy]) =>
          allowedCapabilities.has(policy.capability) &&
          policy.apiChannel === "stable",
      )
      .map(([name]) => name)
      .sort();

    expect(tools.map((tool) => tool.name).sort()).toEqual(expected);
  });

  it.each([
    ["stable", ["stable"]],
    ["preview", ["stable", "preview"]],
    ["legacy", ["stable", "preview", "legacy"]],
  ] as const)(
    "exposes only the %s API channel",
    async (apiChannel, channels) => {
      const tools = await listTools(
        runtimeConfig({ profile: "admin", apiChannel }),
      );
      const allowedChannels = new Set<ToolApiChannel>(channels);
      const expected = Object.entries(TOOL_POLICIES)
        .filter(([, policy]) => allowedChannels.has(policy.apiChannel))
        .map(([name]) => name)
        .sort();

      expect(tools.map((tool) => tool.name).sort()).toEqual(expected);
    },
  );

  it("applies enable and disable filters without elevating the profile", async () => {
    const tools = await listTools(
      runtimeConfig({
        profile: "readonly",
        enabledTools: new Set(["documents_info", "documents_create"]),
        disabledTools: new Set(),
      }),
    );
    expect(tools.map((tool) => tool.name)).toEqual(["documents_info"]);
  });

  it("publishes accurate annotations", async () => {
    const tools = await listTools(runtimeConfig({ profile: "admin" }));
    const read = tools.find((tool) => tool.name === "documents_info");
    const destructive = tools.find(
      (tool) => tool.name === "collections_delete",
    );

    expect(read?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
    expect(destructive?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it("supports a search-to-document flow through a real MCP client", async () => {
    const requests: Array<{
      path: string;
      body: unknown;
      authorization?: string;
    }> = [];
    const apiServer = createHttpServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      request.on("end", () => {
        const body = chunks.length
          ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
          : undefined;
        requests.push({
          path: request.url ?? "",
          body,
          authorization: request.headers.authorization,
        });
        const payload = request.url?.endsWith("documents.search")
          ? { data: [{ id: "doc-1", title: "Coroutines" }] }
          : { data: { id: "doc-1", title: "Coroutines", text: "# Guide" } };
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(payload));
      });
    });
    await listen(apiServer);
    const address = apiServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Test API server has no TCP address");
    }

    const server = createMcpServer(
      runtimeConfig({
        baseUrl: `http://127.0.0.1:${address.port}/api`,
        allowInsecureHttp: true,
      }),
    );
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([
        server.connect(serverTransport),
        client.connect(clientTransport),
      ]);
      const search = await client.callTool({
        name: "documents_search",
        arguments: { query: "coroutines" },
      });
      const document = await client.callTool({
        name: "documents_info",
        arguments: { id: "doc-1" },
      });

      expect(search.content).toEqual([
        {
          type: "text",
          text: JSON.stringify(
            { data: [{ id: "doc-1", title: "Coroutines" }] },
            null,
            2,
          ),
        },
      ]);
      expect(document.content).toEqual([
        {
          type: "text",
          text: JSON.stringify(
            {
              data: {
                id: "doc-1",
                title: "Coroutines",
                text: "# Guide",
              },
            },
            null,
            2,
          ),
        },
      ]);
      expect(requests).toEqual([
        {
          path: "/api/documents.search",
          body: { query: "coroutines" },
          authorization: "Bearer test-token",
        },
        {
          path: "/api/documents.info",
          body: { id: "doc-1" },
          authorization: "Bearer test-token",
        },
      ]);
    } finally {
      await client.close();
      await server.close();
      await close(apiServer);
    }
  });

  it("returns actionable configuration errors through MCP", async () => {
    const server = createMcpServer(runtimeConfig({ profile: "export" }));
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const result = await client.callTool({
      name: "attachments_download",
      arguments: { id: "attachment-1" },
    });
    expect(result).toMatchObject({ isError: true });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify(
          {
            error: "export_not_configured",
            message: "Set YONOTE_EXPORT_DIR before using download tools",
          },
          null,
          2,
        ),
      },
    ]);
    await client.close();
    await server.close();
  });
});

describe("Streamable HTTP", () => {
  let httpServer: Server | undefined;

  afterEach(async () => {
    if (httpServer) {
      await new Promise<void>((resolve, reject) =>
        httpServer?.close((error) => (error ? reject(error) : resolve())),
      );
      httpServer = undefined;
    }
  });

  it("supports a standards-based MCP client", async () => {
    const baseUrl = await startServer();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)),
    );

    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "documents_info")).toBe(
      true,
    );
    expect(tools.tools.some((tool) => tool.name === "documents_create")).toBe(
      false,
    );
    await client.close();
  });

  it("reports a non-sensitive health response", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/health`);
    expect(await response.json()).toEqual({
      status: "ok",
      version: SERVER_VERSION,
      profile: "readonly",
      apiChannel: "stable",
    });
  });

  it("rejects browser origins unless explicitly allowed", async () => {
    const baseUrl = await startServer();
    const response = await fetch(`${baseUrl}/mcp`, {
      headers: { Origin: "https://attacker.example" },
    });
    expect(response.status).toBe(403);
  });

  it("accepts explicitly allowed browser origins", async () => {
    const baseUrl = await startServer({
      allowedOrigins: ["https://client.example"],
    });
    const response = await fetch(`${baseUrl}/mcp`, {
      headers: { Origin: "https://client.example" },
    });
    expect(response.status).toBe(405);
  });

  it("enforces an optional HTTP bearer token", async () => {
    const baseUrl = await startServer({ httpBearerToken: "mcp-token" });
    const unauthorized = await fetch(`${baseUrl}/mcp`);
    const authorized = await fetch(`${baseUrl}/mcp`, {
      headers: { Authorization: "Bearer mcp-token" },
    });
    expect(unauthorized.status).toBe(401);
    expect(authorized.status).toBe(405);
  });

  it("rejects malformed bearer headers and unsupported DELETE requests", async () => {
    const baseUrl = await startServer({ httpBearerToken: "mcp-token" });
    const malformed = await fetch(`${baseUrl}/mcp`, {
      headers: { Authorization: "Basic mcp-token" },
    });
    const wrongLength = await fetch(`${baseUrl}/mcp`, {
      headers: { Authorization: "Bearer x" },
    });
    const deleted = await fetch(`${baseUrl}/mcp`, {
      method: "DELETE",
      headers: { Authorization: "Bearer mcp-token" },
    });
    expect(malformed.status).toBe(401);
    expect(wrongLength.status).toBe(401);
    expect(deleted.status).toBe(405);
  });

  it("validates the HTTP Host header", async () => {
    const baseUrl = await startServer({ allowedHosts: ["localhost"] });
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(403);
  });

  async function startServer(
    overrides: Partial<RuntimeConfig> = {},
  ): Promise<string> {
    httpServer = await startHttpServer(
      runtimeConfig({ transport: "http", port: 0, ...overrides }),
    );
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("HTTP server has no TCP address");
    }
    return `http://127.0.0.1:${address.port}`;
  }
});

describe("main", () => {
  it("prints help and version without requiring a token", async () => {
    const output = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await main(["--help"], {});
    await main(["--version"], {});
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining("--api-channel"),
    );
    expect(output).toHaveBeenCalledWith(`${SERVER_VERSION}\n`);
    output.mockRestore();
  });

  it("starts HTTP mode and reports warnings", async () => {
    const errorOutput = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const server = await main([], {
      YONOTE_API_TOKEN: "token",
      TRANSPORT: "http",
      PORT: "0",
    });
    expect(server).toBeDefined();
    expect(errorOutput).toHaveBeenCalledWith(
      expect.stringContaining("deprecated"),
    );
    expect(errorOutput).toHaveBeenCalledWith(
      expect.stringContaining("Yonote MCP listening"),
    );
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve())),
    );
    errorOutput.mockRestore();
  });
});

async function listTools(config: RuntimeConfig) {
  const server = createMcpServer(config);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const result = await client.listTools();
  await client.close();
  await server.close();
  return result.tools;
}

async function listen(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function runtimeConfig(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    token: "test-token",
    baseUrl: "https://app.yonote.ru/api",
    transport: "stdio",
    host: "127.0.0.1",
    port: 3000,
    profile: "readonly" as ToolProfile,
    apiChannel: "stable" as ToolApiChannel,
    enabledTools: new Set(),
    disabledTools: new Set(),
    timeoutMs: 30_000,
    maxRetries: 0,
    maxDownloadBytes: 512 * 1024 * 1024,
    maxImportBytes: 50 * 1024 * 1024,
    allowInsecureHttp: false,
    allowedHosts: [],
    allowedOrigins: [],
    warnings: [],
    ...overrides,
  };
}
