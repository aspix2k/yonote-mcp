import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerFileOperationTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "file_operations_info",
    "Get information about a file operation.",
    {
      id: z.string().describe("File operation ID"),
    },
    async (params) =>
      textResult(await client.request("fileOperations.info", params)),
  );

  server.tool(
    "file_operations_redirect",
    "Get redirect URL for a file operation result.",
    {
      id: z.string().describe("File operation ID"),
    },
    async (params) =>
      textResult(await client.request("fileOperations.redirect", params)),
  );

  server.tool(
    "file_operations_list",
    "List file operations.",
    {
      type: z.string().describe("Operation type (e.g. export, import)"),
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("fileOperations.list", params)),
  );
}
