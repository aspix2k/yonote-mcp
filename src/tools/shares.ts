import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerShareTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "shares_list",
    "List shared documents.",
    {
      sort: z.string().optional().describe("Sort field"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
      nextPath: z.string().optional().describe("Next page path for pagination"),
    },
    async (params) => textResult(await client.request("shares.list", params)),
  );

  server.tool(
    "shares_info",
    "Get a share link by id or documentId; provide exactly one.",
    {
      id: z.string().optional().describe("Share ID"),
      documentId: z.string().optional().describe("Document ID"),
    },
    async (params) => textResult(await client.request("shares.info", params)),
  );

  server.tool(
    "shares_create",
    "Create a public share link for a document.",
    {
      documentId: z.string().describe("Document ID to share"),
    },
    async (params) => textResult(await client.request("shares.create", params)),
  );

  server.tool(
    "shares_revoke",
    "Revoke a public share link.",
    {
      id: z.string().describe("Share ID to revoke"),
    },
    async (params) => textResult(await client.request("shares.revoke", params)),
  );

  server.tool(
    "shares_update",
    "Update a share link's properties.",
    {
      id: z.string().describe("Share ID"),
      published: z.boolean().optional().describe("Published status"),
      includeChildDocuments: z
        .boolean()
        .optional()
        .describe("Include child documents"),
      exposesAt: z.string().optional().describe("Expose at date (ISO 8601)"),
      expiresAt: z.string().optional().describe("Expire at date (ISO 8601)"),
      link: z.string().optional().describe("Custom link slug"),
    },
    async (params) => textResult(await client.request("shares.update", params)),
  );
}
