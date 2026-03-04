import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerSubscriptionTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "subscriptions_create",
    "Subscribe to document events.",
    {
      documentId: z.string().describe("Document ID"),
      event: z.string().describe("Event type to subscribe to"),
    },
    async (params) =>
      textResult(await client.request("subscriptions.create", params)),
  );

  server.tool(
    "subscriptions_info",
    "Get subscription information.",
    {
      documentId: z.string().describe("Document ID"),
      event: z.string().describe("Event type"),
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
