import { fileURLToPath } from "node:url";
import { createServer, type Server } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { YonoteClient } from "./api-client.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerCollectionTools } from "./tools/collections.js";
import { registerUserTools } from "./tools/users.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerGroupTools } from "./tools/groups.js";
import { registerShareTools } from "./tools/shares.js";
import { registerStarTools } from "./tools/stars.js";
import { registerRevisionTools } from "./tools/revisions.js";
import { registerEventTools } from "./tools/events.js";
import { registerViewTools } from "./tools/views.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerDatabaseTools } from "./tools/database.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerFileOperationTools } from "./tools/file-operations.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerSyncBlockTools } from "./tools/sync-blocks.js";
import { registerIntegrationTools } from "./tools/integrations.js";
import { registerLdapTools } from "./tools/ldap.js";
import { registerProviderTools } from "./tools/providers.js";
import { registerSharePasswordTools } from "./tools/share-passwords.js";

export function parseArgs(argv: string[] = process.argv.slice(2)) {
  let token: string | undefined;
  let project: string | undefined;
  let baseUrl: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--token" && argv[i + 1]) {
      token = argv[++i];
    } else if (argv[i] === "--project" && argv[i + 1]) {
      project = argv[++i];
    } else if (argv[i] === "--base-url" && argv[i + 1]) {
      baseUrl = argv[++i];
    }
  }

  const resolvedBaseUrl =
    baseUrl || process.env.YONOTE_API_BASE_URL ||
    `https://${project || process.env.YONOTE_PROJECT || "app"}.yonote.ru/api`;

  return {
    token: token || process.env.YONOTE_API_TOKEN,
    baseUrl: resolvedBaseUrl,
  };
}

export function createMcpServer(token: string, baseUrl: string): McpServer {
  const server = new McpServer({
    name: "yonote-mcp",
    version: "1.0.0",
  });

  const client = new YonoteClient(token, baseUrl);

  registerDocumentTools(server, client);
  registerCollectionTools(server, client);
  registerUserTools(server, client);
  registerCommentTools(server, client);
  registerGroupTools(server, client);
  registerShareTools(server, client);
  registerStarTools(server, client);
  registerRevisionTools(server, client);
  registerEventTools(server, client);
  registerViewTools(server, client);
  registerAuthTools(server, client);
  registerDatabaseTools(server, client);
  registerAttachmentTools(server, client);
  registerFileOperationTools(server, client);
  registerSubscriptionTools(server, client);
  registerSyncBlockTools(server, client);
  registerIntegrationTools(server, client);
  registerLdapTools(server, client);
  registerProviderTools(server, client);
  registerSharePasswordTools(server, client);

  return server;
}

export async function main(): Promise<Server | void> {
  const config = parseArgs();

  if (!config.token) {
    console.error("YONOTE_API_TOKEN is required. Pass via --token argument or YONOTE_API_TOKEN env variable.");
    process.exit(1);
  }

  const token: string = config.token;
  const baseUrl: string = config.baseUrl;
  const transportType = process.env.TRANSPORT || "stdio";

  if (transportType === "http") {
    const port = parseInt(process.env.PORT || "3000");

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === "/mcp") {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        const server = createMcpServer(token, baseUrl);
        await server.connect(transport);
        await transport.handleRequest(req, res);
        res.on("close", () => {
          transport.close();
          server.close();
        });
      } else if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    return new Promise((resolve) => {
      httpServer.listen(port, () => {
        console.error(
          `Yonote MCP server (HTTP) listening on http://0.0.0.0:${port}/mcp`,
        );
        resolve(httpServer);
      });
    });
  } else {
    const server = createMcpServer(token, baseUrl);
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

/* v8 ignore start */
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error("Failed to start Yonote MCP server:", error);
    process.exit(1);
  });
}
/* v8 ignore stop */
