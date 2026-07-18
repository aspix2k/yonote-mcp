import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerGroupTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "groups_list",
    "List all groups in the workspace.",
    {
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) => textResult(await client.request("groups.list", params)),
  );

  server.tool(
    "groups_info",
    "Get detailed information about a group.",
    {
      id: z.string().describe("Group ID"),
    },
    async (params) => textResult(await client.request("groups.info", params)),
  );

  server.tool(
    "groups_create",
    "Create a new user group.",
    {
      name: z.string().describe("Group name"),
    },
    async (params) => textResult(await client.request("groups.create", params)),
  );

  server.tool(
    "groups_update",
    "Update a group's name.",
    {
      id: z.string().describe("Group ID"),
      name: z.string().describe("New group name"),
    },
    async (params) => textResult(await client.request("groups.update", params)),
  );

  server.tool(
    "groups_delete",
    "Delete a group.",
    {
      id: z.string().describe("Group ID"),
    },
    async (params) => textResult(await client.request("groups.delete", params)),
  );

  server.tool(
    "groups_memberships",
    "List members of a group.",
    {
      id: z.string().describe("Group ID"),
      query: z.string().optional().describe("Filter by member name"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("groups.memberships", params)),
  );

  server.tool(
    "groups_add_user",
    "Add a user to a group.",
    {
      id: z.string().describe("Group ID"),
      userId: z.string().describe("User ID"),
    },
    async (params) =>
      textResult(await client.request("groups.add_user", params)),
  );

  server.tool(
    "groups_remove_user",
    "Remove a user from a group.",
    {
      id: z.string().describe("Group ID"),
      userId: z.string().describe("User ID"),
    },
    async (params) =>
      textResult(await client.request("groups.remove_user", params)),
  );
}
