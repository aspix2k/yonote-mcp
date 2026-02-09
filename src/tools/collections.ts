import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerCollectionTools(
  server: McpServer,
  client: YonoteClient,
) {
  server.tool(
    "collections_list",
    "List all accessible collections.",
    {
      query: z.string().optional().describe("Search query"),
      statusFilter: z
        .enum(["active", "archived"])
        .optional()
        .describe("Filter by status"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) =>
      textResult(await client.request("collections.list", params)),
  );

  server.tool(
    "collections_info",
    "Get detailed information about a collection.",
    {
      id: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.request("collections.info", params)),
  );

  server.tool(
    "collections_create",
    "Create a new collection.",
    {
      name: z.string().describe("Collection name"),
      description: z.string().optional().describe("Collection description"),
      permission: z
        .enum(["read", "read_write"])
        .optional()
        .describe("Default permission for workspace members"),
      color: z.string().optional().describe("Collection color (hex)"),
      icon: z.string().optional().describe("Collection icon (emoji)"),
      sharing: z
        .boolean()
        .optional()
        .describe("Allow sharing documents publicly"),
    },
    async (params) =>
      textResult(await client.request("collections.create", params)),
  );

  server.tool(
    "collections_update",
    "Update a collection's properties.",
    {
      id: z.string().describe("Collection ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      permission: z
        .enum(["read", "read_write"])
        .optional()
        .describe("Default permission"),
      color: z.string().optional().describe("New color (hex)"),
      icon: z.string().optional().describe("New icon (emoji)"),
      sharing: z.boolean().optional().describe("Allow sharing"),
    },
    async (params) =>
      textResult(await client.request("collections.update", params)),
  );

  server.tool(
    "collections_delete",
    "Delete a collection and all its documents.",
    {
      id: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.request("collections.delete", params)),
  );

  server.tool(
    "collections_documents",
    "Get the document hierarchy tree of a collection.",
    {
      id: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.request("collections.documents", params)),
  );

  server.tool(
    "collections_add_user",
    "Grant a user access to a collection.",
    {
      id: z.string().describe("Collection ID"),
      userId: z.string().describe("User ID"),
      permission: z
        .enum(["read", "read_write", "admin"])
        .optional()
        .describe("Permission level"),
    },
    async (params) =>
      textResult(await client.request("collections.add_user", params)),
  );

  server.tool(
    "collections_remove_user",
    "Revoke a user's access to a collection.",
    {
      id: z.string().describe("Collection ID"),
      userId: z.string().describe("User ID"),
    },
    async (params) =>
      textResult(await client.request("collections.remove_user", params)),
  );

  server.tool(
    "collections_memberships",
    "List individual user memberships of a collection.",
    {
      id: z.string().describe("Collection ID"),
      query: z.string().optional().describe("Filter by user name"),
      permission: z
        .enum(["read", "read_write", "admin"])
        .optional()
        .describe("Filter by permission"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) =>
      textResult(await client.request("collections.memberships", params)),
  );

  server.tool(
    "collections_export",
    "Export a collection in the specified format.",
    {
      id: z.string().describe("Collection ID"),
      format: z
        .enum(["outline-markdown", "html", "json"])
        .optional()
        .describe("Export format"),
    },
    async (params) =>
      textResult(await client.request("collections.export", params)),
  );
}
