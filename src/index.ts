import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Failed to start Yonote MCP server:", error);
  process.exit(1);
});
