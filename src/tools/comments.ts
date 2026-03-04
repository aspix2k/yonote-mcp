import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerCommentTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "comments_list",
    'List comments for an entity (e.g. entityType: "document").',
    {
      entityType: z.string().describe('Entity type, e.g. "document"'),
      entityId: z.string().optional().describe("Entity ID"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("comments.list", params)),
  );

  server.tool(
    "comments_create",
    'Add a comment to an entity (e.g. entityType: "document").',
    {
      entityType: z.string().describe('Entity type, e.g. "document"'),
      entityId: z.string().describe("Entity ID"),
      text: z.string().describe("Comment text in Markdown"),
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
      text: z.string().describe("Updated comment text in Markdown"),
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

  server.tool(
    "comments_resolve",
    "Resolve a comment thread.",
    {
      id: z.string().describe("Comment ID"),
    },
    async (params) =>
      textResult(await client.request("comments.resolve", params)),
  );

  server.tool(
    "comments_info",
    "Get information about a comment.",
    {
      id: z.string().optional().describe("Comment ID"),
      paranoid: z.boolean().optional().describe("Include deleted comments"),
    },
    async (params) =>
      textResult(await client.request("comments.info", params)),
  );

  server.tool(
    "comments_thread",
    "Get a comment thread.",
    {
      id: z.string().optional().describe("Comment ID"),
      paranoid: z.boolean().optional().describe("Include deleted comments"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("comments.thread", params)),
  );
}
