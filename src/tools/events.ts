import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerEventTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "events_list",
    "List workspace events (audit log).",
    {
      name: z.string().optional().describe("Event type name"),
      actorId: z.string().optional().describe("Filter by actor user ID"),
      documentId: z.string().optional().describe("Filter by document ID"),
      collectionId: z.string().optional().describe("Filter by collection ID"),
      auditLog: z
        .boolean()
        .optional()
        .describe("Show audit log entries"),
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) => textResult(await client.request("events.list", params)),
  );
}
