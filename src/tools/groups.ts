import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerGroupTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "groups_list",
    "List all groups in the workspace.",
    {
      query: z.string().optional().describe("Search by group name"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
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
    },
    async (params) =>
      textResult(await client.request("groups.memberships", params)),
  );
}
