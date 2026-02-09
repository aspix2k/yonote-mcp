import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerCommentTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "comments_list",
    "List comments on a document or in a collection.",
    {
      documentId: z.string().optional().describe("Filter by document ID"),
      collectionId: z.string().optional().describe("Filter by collection ID"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) =>
      textResult(await client.request("comments.list", params)),
  );

  server.tool(
    "comments_create",
    "Add a comment to a document.",
    {
      documentId: z.string().describe("Document ID to comment on"),
      text: z.string().optional().describe("Comment text in Markdown"),
      data: z.any().optional().describe("Comment data (ProseMirror JSON)"),
      parentCommentId: z
        .string()
        .optional()
        .describe("Parent comment ID for replies"),
    },
    async (params) =>
      textResult(await client.request("comments.create", params)),
  );

  server.tool(
    "comments_update",
    "Update an existing comment.",
    {
      id: z.string().describe("Comment ID"),
      data: z.any().describe("Updated comment data (ProseMirror JSON)"),
    },
    async (params) =>
      textResult(await client.request("comments.update", params)),
  );

  server.tool(
    "comments_delete",
    "Delete a comment.",
    {
      id: z.string().describe("Comment ID"),
    },
    async (params) =>
      textResult(await client.request("comments.delete", params)),
  );
}
