import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerUserTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "users_list",
    "List workspace members. Can filter by query or status.",
    {
      query: z.string().optional().describe("Search by name or email"),
      status: z
        .enum(["active", "suspended", "invited", "all"])
        .optional()
        .describe("Filter by user status"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
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
}
