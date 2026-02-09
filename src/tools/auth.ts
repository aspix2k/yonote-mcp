import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerAuthTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "auth_info",
    "Get authentication details for the current API key (current user, team info).",
    {},
    async () => textResult(await client.request("auth.info")),
  );
}
