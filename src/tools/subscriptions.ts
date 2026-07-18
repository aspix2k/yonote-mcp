import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerSubscriptionTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "subscriptions_create",
    "Subscribe to document events.",
    {
      documentId: z.string().describe("Document ID"),
      event: z
        .literal("document.update")
        .describe("Event type to subscribe to"),
    },
    async (params) =>
      textResult(await client.request("subscriptions.create", params)),
  );

  server.tool(
    "subscriptions_info",
    "Get subscription information.",
    {
      documentId: z.string().describe("Document ID"),
      event: z.literal("document.update").describe("Event type"),
    },
    async (params) =>
      textResult(await client.request("subscriptions.info", params)),
  );

  server.tool(
    "subscriptions_delete",
    "Delete a subscription.",
    {
      id: z.string().describe("Subscription ID"),
    },
    async (params) =>
      textResult(await client.request("subscriptions.delete", params)),
  );
}
