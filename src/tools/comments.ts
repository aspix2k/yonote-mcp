import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerCommentTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "comments_list",
    "List document comments; provide entityId or shareId.",
    {
      entityType: z.literal("document").describe("Entity type"),
      entityId: z.string().optional().describe("Entity ID"),
      shareId: z.string().optional().describe("Public share ID"),
      threadId: z.string().optional().describe("Comment thread ID"),
      isResolved: z.boolean().optional().describe("Filter by resolved state"),
      paranoid: z.boolean().optional().describe("Include deleted comments"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) => textResult(await client.request("comments.list", params)),
  );

  server.tool(
    "comments_create",
    "Add a comment to a document.",
    {
      entityType: z.literal("document").describe("Entity type"),
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
    "Set the resolved state of a comment thread.",
    {
      id: z.string().describe("Comment ID"),
      isResolved: z.boolean().describe("Whether the thread is resolved"),
    },
    async (params) =>
      textResult(await client.request("comments.resolve", params)),
  );

  server.tool(
    "comments_info",
    "Get information about a comment.",
    {
      id: z.string().describe("Comment ID"),
      paranoid: z.boolean().optional().describe("Include deleted comments"),
    },
    async (params) => textResult(await client.request("comments.info", params)),
  );

  server.tool(
    "comments_thread",
    "Get a comment thread.",
    {
      id: z.string().describe("Comment ID"),
      paranoid: z.boolean().optional().describe("Include deleted comments"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("comments.thread", params)),
  );
}
