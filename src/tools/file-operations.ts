import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerFileOperationTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
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
    "Get a temporary signed download URL for a file operation result.",
    {
      id: z.string().describe("File operation ID"),
    },
    async (params) =>
      textResult(await client.getRedirect("fileOperations.redirect", params)),
  );

  server.tool(
    "file_operations_download",
    "Download a completed file operation into the configured export directory.",
    {
      id: z.string().describe("File operation ID"),
      filename: z.string().optional().describe("Output filename"),
    },
    async ({ filename, ...params }) =>
      textResult(
        await client.download("fileOperations.redirect", params, filename),
      ),
  );

  server.tool(
    "file_operations_list",
    "List file operations.",
    {
      type: z.enum(["export", "import"]).describe("Operation type"),
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
