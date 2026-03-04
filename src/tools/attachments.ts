import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerAttachmentTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "attachments_list",
    "List all attachments.",
    {},
    async (params) =>
      textResult(await client.request("attachments.list", params)),
  );

  server.tool(
    "attachments_size",
    "Get total size of all attachments.",
    {},
    async (params) =>
      textResult(await client.request("attachments.size", params)),
  );

  server.tool(
    "attachments_create",
    "Create an attachment upload URL.",
    {
      name: z.string().describe("File name"),
      contentType: z.string().describe("MIME content type"),
      size: z.number().describe("File size in bytes"),
      documentId: z.string().optional().describe("Associated document ID"),
    },
    async (params) =>
      textResult(await client.request("attachments.create", params)),
  );

  server.tool(
    "attachments_redirect",
    "Get redirect URL for an attachment.",
    {
      id: z.string().describe("Attachment ID"),
    },
    async (params) =>
      textResult(await client.request("attachments.redirect", params)),
  );

  server.tool(
    "attachments_delete",
    "Delete an attachment.",
    {
      id: z.string().describe("Attachment ID"),
    },
    async (params) =>
      textResult(await client.request("attachments.delete", params)),
  );
}
