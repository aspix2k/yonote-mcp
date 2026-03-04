import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerUserTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "users_list",
    "List workspace members.",
    {
      query: z.string().optional().describe("Search by name or email"),
      filter: z.string().optional().describe("Filter users"),
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) => textResult(await client.request("users.list", params)),
  );

  server.tool(
    "users_info",
    "Get detailed information about a user.",
    {
      id: z.string().describe("User ID"),
    },
    async (params) => textResult(await client.request("users.info", params)),
  );

  server.tool(
    "users_create",
    "Invite a new user to the workspace.",
    {
      email: z.string().describe("User email address"),
      name: z.string().describe("User display name"),
      role: z
        .enum(["admin", "member", "viewer"])
        .optional()
        .describe("User role"),
    },
    async (params) => textResult(await client.request("users.create", params)),
  );

  server.tool(
    "users_suspend",
    "Suspend (disable) a user account.",
    {
      id: z.string().describe("User ID to suspend"),
    },
    async (params) => textResult(await client.request("users.suspend", params)),
  );

  server.tool(
    "users_activate",
    "Re-activate a suspended user account.",
    {
      id: z.string().describe("User ID to activate"),
    },
    async (params) =>
      textResult(await client.request("users.activate", params)),
  );

  server.tool(
    "users_update",
    "Update current user's profile.",
    {
      name: z.string().optional().describe("New display name"),
      avatarUrl: z.string().optional().describe("New avatar URL"),
    },
    async (params) => textResult(await client.request("users.update", params)),
  );

  server.tool(
    "users_promote",
    "Promote a user to admin.",
    {
      id: z.string().describe("User ID to promote"),
    },
    async (params) => textResult(await client.request("users.promote", params)),
  );

  server.tool(
    "users_demote",
    "Demote a user from admin.",
    {
      id: z.string().describe("User ID to demote"),
    },
    async (params) => textResult(await client.request("users.demote", params)),
  );

  server.tool(
    "users_delete",
    "Delete a user account.",
    {
      id: z.string().describe("User ID to delete"),
    },
    async (params) => textResult(await client.request("users.delete", params)),
  );
}
