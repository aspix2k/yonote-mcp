import { createServer } from "node:http";
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

const token = process.env.YONOTE_API_TOKEN;
if (!token) {
  console.error("YONOTE_API_TOKEN environment variable is required");
  process.exit(1);
}

const baseUrl =
  process.env.YONOTE_API_BASE_URL || "https://app.yonote.ru/api";

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "yonote-mcp",
    version: "1.0.0",
  });

  const client = new YonoteClient(token!, baseUrl);

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

  return server;
}

async function main() {
  const transportType = process.env.TRANSPORT || "stdio";

  if (transportType === "http") {
    const port = parseInt(process.env.PORT || "3000");

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === "/mcp") {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        const server = createMcpServer();
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

    httpServer.listen(port, () => {
      console.error(
        `Yonote MCP server (HTTP) listening on http://0.0.0.0:${port}/mcp`,
      );
    });
  } else {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((error) => {
  console.error("Failed to start Yonote MCP server:", error);
  process.exit(1);
});
