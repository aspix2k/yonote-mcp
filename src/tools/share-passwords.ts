import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerSharePasswordTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "share_passwords_create",
    "Create a password for a share link.",
    {
      shareId: z.string().describe("Share ID"),
    },
    async (params) =>
      textResult(
        await client.request(`v2/shares/${params.shareId}/passwords`, {}),
      ),
  );
}
