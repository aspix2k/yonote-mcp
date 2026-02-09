import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerRevisionTools(
  server: McpServer,
  client: YonoteClient,
) {
  server.tool(
    "revisions_list",
    "List version history of a document.",
    {
      documentId: z.string().describe("Document ID"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) =>
      textResult(await client.request("revisions.list", params)),
  );

  server.tool(
    "revisions_info",
    "Get a specific document revision/snapshot.",
    {
      id: z.string().describe("Revision ID"),
    },
    async (params) =>
      textResult(await client.request("revisions.info", params)),
  );
}
