import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerShareTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "shares_list",
    "List shared documents/collections.",
    {
      documentId: z.string().optional().describe("Filter by document ID"),
      collectionId: z.string().optional().describe("Filter by collection ID"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) => textResult(await client.request("shares.list", params)),
  );

  server.tool(
    "shares_info",
    "Get information about a share link.",
    {
      id: z.string().optional().describe("Share ID"),
      shareId: z.string().optional().describe("Public share ID"),
    },
    async (params) => textResult(await client.request("shares.info", params)),
  );

  server.tool(
    "shares_create",
    "Create a public share link for a document.",
    {
      documentId: z.string().describe("Document ID to share"),
    },
    async (params) => textResult(await client.request("shares.create", params)),
  );

  server.tool(
    "shares_delete",
    "Revoke a public share link.",
    {
      id: z.string().describe("Share ID to revoke"),
    },
    async (params) => textResult(await client.request("shares.delete", params)),
  );
}
