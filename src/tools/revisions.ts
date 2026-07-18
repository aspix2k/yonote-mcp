import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerRevisionTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "revisions_list",
    "List version history of a document.",
    {
      documentId: z.string().describe("Document ID"),
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) =>
      textResult(await client.request("revisions.list", params)),
  );

  server.tool(
    "revisions_info",
    "Get a specific document revision/snapshot.",
    {
      id: z.string().describe("Revision ID"),
    },
    async (params) =>
      textResult(await client.request("revisions.info", params)),
  );
}
