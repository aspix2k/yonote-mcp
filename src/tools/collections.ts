import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerCollectionTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "collections_list",
    "List all accessible collections.",
    {
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
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
      color: z.string().optional().describe("Collection color (hex)"),
      private: z.boolean().optional().describe("Make collection private"),
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
      color: z.string().optional().describe("New color (hex)"),
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
        .enum(["read", "read_write", "maintainer"])
        .optional()
        .describe("Filter by permission"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("collections.memberships", params)),
  );

  server.tool(
    "collections_export",
    "Export a collection.",
    {
      id: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.request("collections.export", params)),
  );

  server.tool(
    "collections_add_group",
    "Grant a group access to a collection.",
    {
      id: z.string().describe("Collection ID"),
      groupId: z.string().describe("Group ID"),
    },
    async (params) =>
      textResult(await client.request("collections.add_group", params)),
  );

  server.tool(
    "collections_remove_group",
    "Revoke a group's access to a collection.",
    {
      id: z.string().describe("Collection ID"),
      groupId: z.string().describe("Group ID"),
    },
    async (params) =>
      textResult(await client.request("collections.remove_group", params)),
  );

  server.tool(
    "collections_group_memberships",
    "List group memberships of a collection.",
    {
      id: z.string().describe("Collection ID"),
      query: z.string().optional().describe("Filter by group name"),
      permission: z
        .enum(["read", "read_write", "maintainer"])
        .optional()
        .describe("Filter by permission"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("collections.group_memberships", params)),
  );

  server.tool(
    "collections_export_all",
    "Export all collections.",
    {},
    async (params) =>
      textResult(await client.request("collections.export_all", params)),
  );
}
