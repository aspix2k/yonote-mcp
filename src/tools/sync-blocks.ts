import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerSyncBlockTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "sync_blocks_create",
    "Create sync blocks.",
    {
      ids: z.array(z.string()).optional().describe("Block IDs"),
      documentId: z.string().optional().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("syncBlocks.create", params)),
  );

  server.tool(
    "sync_blocks_delete",
    "Delete sync blocks.",
    {
      ids: z.array(z.string()).optional().describe("Block IDs"),
      documentId: z.string().optional().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("syncBlocks.delete", params)),
  );

  server.tool(
    "sync_blocks_list",
    "List sync blocks for a document.",
    {
      documentId: z.string().optional().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("syncBlocks.list", params)),
  );

  server.tool(
    "sync_blocks_list_inserts",
    "List inserts of a sync block.",
    {
      syncBlockId: z.string().optional().describe("Sync block ID"),
    },
    async (params) =>
      textResult(await client.request("syncBlocks.list_inserts", params)),
  );
}
