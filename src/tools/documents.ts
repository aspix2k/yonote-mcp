import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerDocumentTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "documents_list",
    "List documents. Filter by collection, user, or other criteria.",
    {
      collectionId: z.string().optional().describe("Filter by collection ID"),
      userId: z.string().optional().describe("Filter by user ID"),
      backlinkDocumentId: z.string().optional().describe("Filter by backlink document ID"),
      parentDocumentId: z.string().optional().describe("Filter by parent document ID"),
      template: z.boolean().optional().describe("Filter templates"),
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results (default 25)"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) => textResult(await client.request("documents.list", params)),
  );

  server.tool(
    "documents_info",
    "Get detailed information about a document by ID or share ID.",
    {
      id: z.string().optional().describe("Document UUID or urlId"),
      shareId: z.string().optional().describe("Share ID"),
    },
    async (params) => textResult(await client.request("documents.info", params)),
  );

  server.tool(
    "documents_search",
    "Full-text search across all documents.",
    {
      query: z.string().describe("Search query"),
      collectionId: z.string().optional().describe("Filter by collection"),
      userId: z.string().optional().describe("Filter by author"),
      dateFilter: z.string().optional().describe("Date range filter"),
      includeArchived: z.boolean().optional().describe("Include archived documents"),
      includeDrafts: z.boolean().optional().describe("Include draft documents"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("documents.search", params)),
  );

  server.tool(
    "documents_search_titles",
    "Fast search by document titles only.",
    {
      query: z.string().describe("Title search query"),
      collectionId: z.string().optional().describe("Filter by collection"),
      isPublished: z.boolean().optional().describe("Filter by published status"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("documents.search_titles", params)),
  );

  server.tool(
    "documents_create",
    "Create a new document. Provide title and text in Markdown.",
    {
      title: z.string().describe("Document title"),
      text: z.string().optional().describe("Document body in Markdown"),
      collectionId: z.string().describe("Collection to place document in"),
      parentDocumentId: z
        .string()
        .optional()
        .describe("Parent document ID for nesting"),
      templateId: z.string().optional().describe("Template ID to use"),
      template: z.boolean().optional().describe("Create as template"),
      publish: z.boolean().optional().describe("Publish immediately (default false)"),
    },
    async (params) =>
      textResult(await client.request("documents.create", params)),
  );

  server.tool(
    "documents_update",
    "Update an existing document's title, text, or other properties.",
    {
      id: z.string().describe("Document ID"),
      title: z.string().optional().describe("New title"),
      text: z.string().optional().describe("New body in Markdown"),
      append: z
        .boolean()
        .optional()
        .describe("Append text instead of replacing"),
      publish: z.boolean().optional().describe("Publish the document"),
      template: z.boolean().optional().describe("Set as template"),
      done: z.boolean().optional().describe("Mark task as done"),
    },
    async (params) =>
      textResult(await client.request("documents.update", params)),
  );

  server.tool(
    "documents_delete",
    "Move a document to trash.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.delete", params)),
  );

  server.tool(
    "documents_archive",
    "Archive a document to hide it from the main view.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.archive", params)),
  );

  server.tool(
    "documents_restore",
    "Restore an archived or deleted document.",
    {
      id: z.string().describe("Document ID"),
      revisionId: z
        .string()
        .optional()
        .describe("Specific revision to restore"),
    },
    async (params) =>
      textResult(await client.request("documents.restore", params)),
  );

  server.tool(
    "documents_move",
    "Move a document to a different collection or parent.",
    {
      id: z.string().describe("Document ID"),
      collectionId: z.string().optional().describe("Target collection ID"),
      parentDocumentId: z
        .string()
        .optional()
        .describe("Target parent document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.move", params)),
  );

  server.tool(
    "documents_copy",
    "Create a copy of a document.",
    {
      id: z.string().describe("Document ID to copy"),
      collectionId: z.string().optional().describe("Target collection ID"),
      parentDocumentId: z.string().optional().describe("Target parent document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.copy", params)),
  );

  server.tool(
    "documents_drafts",
    "List current user's draft documents.",
    {
      collectionId: z.string().optional().describe("Filter by collection"),
      dateFilter: z.string().optional().describe("Date range filter"),
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("documents.drafts", params)),
  );

  server.tool(
    "documents_viewed",
    "List recently viewed documents.",
    {
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("documents.viewed", params)),
  );

  server.tool(
    "documents_unpublish",
    "Move a published document back to draft status.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.unpublish", params)),
  );

  server.tool(
    "documents_users",
    "List all users who have access to a document.",
    {
      id: z.string().describe("Document ID"),
      query: z.string().optional().describe("Filter users by name"),
    },
    async (params) =>
      textResult(await client.request("documents.users", params)),
  );

  server.tool(
    "documents_add_user",
    "Grant a user access to a document.",
    {
      id: z.string().describe("Document ID"),
      userId: z.string().describe("User ID to grant access"),
      permission: z
        .enum(["read", "read_write"])
        .optional()
        .describe("Permission level"),
    },
    async (params) =>
      textResult(await client.request("documents.add_user", params)),
  );

  server.tool(
    "documents_remove_user",
    "Revoke a user's access to a document.",
    {
      id: z.string().describe("Document ID"),
      userId: z.string().describe("User ID to revoke access"),
    },
    async (params) =>
      textResult(await client.request("documents.remove_user", params)),
  );

  server.tool(
    "documents_children",
    "Get the nested child document structure of a document.",
    {
      id: z.string().describe("Parent document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.documents", params)),
  );

  server.tool(
    "documents_import",
    "Import a document from a file.",
    {
      file: z.string().describe("File content or URL"),
      collectionId: z.string().optional().describe("Collection ID"),
      parentDocumentId: z.string().optional().describe("Parent document ID"),
      template: z.boolean().optional().describe("Import as template"),
      publish: z.boolean().optional().describe("Publish immediately"),
    },
    async (params) =>
      textResult(await client.request("documents.import", params)),
  );

  server.tool(
    "documents_export",
    "Export a document.",
    {
      id: z.string().optional().describe("Document ID"),
      shareId: z.string().optional().describe("Share ID"),
    },
    async (params) =>
      textResult(await client.request("documents.export", params)),
  );

  server.tool(
    "documents_starred",
    "List starred documents.",
    {
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("documents.starred", params)),
  );

  server.tool(
    "documents_pinned",
    "List pinned documents in a collection.",
    {
      collectionId: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.request("documents.pinned", params)),
  );

  server.tool(
    "documents_templatize",
    "Convert a document into a template.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.templatize", params)),
  );

  server.tool(
    "documents_star",
    "Star a document.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.star", params)),
  );

  server.tool(
    "documents_unstar",
    "Remove star from a document.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.unstar", params)),
  );

  server.tool(
    "documents_pin",
    "Pin a document in its collection.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.pin", params)),
  );

  server.tool(
    "documents_unpin",
    "Unpin a document from its collection.",
    {
      id: z.string().describe("Document ID"),
    },
    async (params) =>
      textResult(await client.request("documents.unpin", params)),
  );
}
