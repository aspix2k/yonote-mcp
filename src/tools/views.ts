import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerViewTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "views_list",
    "List view statistics for a document.",
    {
      documentId: z.string().describe("Document ID"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) => textResult(await client.request("views.list", params)),
  );

  server.tool(
    "views_create",
    "Record a document view.",
    {
      documentId: z.string().describe("Document ID"),
    },
    async (params) => textResult(await client.request("views.create", params)),
  );
}
