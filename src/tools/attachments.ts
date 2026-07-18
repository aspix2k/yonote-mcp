import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerAttachmentTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool("attachments_list", "List all attachments.", {}, async (params) =>
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
    "Get a temporary signed download URL for an attachment.",
    {
      id: z.string().describe("Attachment ID"),
    },
    async (params) =>
      textResult(await client.getRedirect("attachments.redirect", params)),
  );

  server.tool(
    "attachments_download",
    "Download an attachment into the configured export directory.",
    {
      id: z.string().describe("Attachment ID"),
      filename: z.string().optional().describe("Output filename"),
    },
    async ({ filename, ...params }) =>
      textResult(
        await client.download("attachments.redirect", params, filename),
      ),
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
