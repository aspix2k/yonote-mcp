import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerStarTools(server: ToolRegistrar, client: YonoteClient) {
  server.tool(
    "stars_list",
    "List user's favorite (starred) documents and collections.",
    {
      limit: z.number().optional().describe("Number of results"),
      offset: z.number().optional().describe("Pagination offset"),
    },
    async (params) => textResult(await client.request("stars.list", params)),
  );

  server.tool(
    "stars_create",
    "Add a document or collection to favorites; provide exactly one ID.",
    {
      documentId: z.string().optional().describe("Document ID to star"),
      collectionId: z.string().optional().describe("Collection ID to star"),
    },
    async (params) => textResult(await client.request("stars.create", params)),
  );

  server.tool(
    "stars_delete",
    "Remove an item from favorites.",
    {
      id: z.string().describe("Star ID to remove"),
    },
    async (params) => textResult(await client.request("stars.delete", params)),
  );
}
