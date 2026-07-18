import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerViewTools(server: ToolRegistrar, client: YonoteClient) {
  server.tool(
    "views_list",
    "List view statistics for a document.",
    {
      documentId: z.string().describe("Document ID"),
    },
    async (params) => textResult(await client.request("views.list", params)),
  );

  server.tool(
    "views_create",
    "Record a document view.",
    {
      documentId: z.string().describe("Document ID"),
    },
    async (params) => textResult(await client.request("views.create", params)),
  );
}
