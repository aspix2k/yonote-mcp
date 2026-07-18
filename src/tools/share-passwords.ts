import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerSharePasswordTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "share_passwords_list",
    "List passwords configured for a share link (Yonote API v2 preview).",
    {
      shareId: z.string().describe("Share ID"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results"),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("Pagination offset"),
      direction: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
      sort: z.string().optional().describe("Sort field"),
    },
    async ({ shareId, ...query }) =>
      textResult(
        await client.request(sharePasswordsPath(shareId), undefined, {
          method: "GET",
          query,
        }),
      ),
  );

  server.tool(
    "share_passwords_create",
    "Create a password for a share link (Yonote API v2 preview).",
    {
      shareId: z.string().describe("Share ID"),
      name: z.string().describe("Password name"),
      password: z.string().describe("Password value"),
      isDisposable: z
        .boolean()
        .optional()
        .describe("Delete the password after its first use"),
    },
    async ({ shareId, ...body }) =>
      textResult(await client.request(sharePasswordsPath(shareId), body)),
  );

  server.tool(
    "share_passwords_set",
    "Set a share password for access validation (Yonote API v2 preview).",
    {
      shareId: z.string().describe("Share ID"),
      password: z.string().describe("Password value"),
    },
    async ({ shareId, ...body }) =>
      textResult(
        await client.request(sharePasswordsPath(shareId), body, {
          method: "PUT",
        }),
      ),
  );

  server.tool(
    "share_passwords_delete_all",
    "Permanently delete all passwords for a share link (Yonote API v2 preview).",
    {
      shareId: z.string().describe("Share ID"),
    },
    async ({ shareId }) =>
      textResult(
        await client.request(
          sharePasswordsPath(shareId),
          {},
          {
            method: "DELETE",
          },
        ),
      ),
  );

  server.tool(
    "share_passwords_delete",
    "Permanently delete one share password (Yonote API v2 preview).",
    {
      shareId: z.string().describe("Share ID"),
      sharePasswordId: z.string().describe("Share password ID"),
    },
    async ({ shareId, sharePasswordId }) =>
      textResult(
        await client.request(
          `${sharePasswordsPath(shareId)}/${encodeURIComponent(sharePasswordId)}`,
          {},
          { method: "DELETE" },
        ),
      ),
  );
}

function sharePasswordsPath(shareId: string): string {
  return `v2/shares/${encodeURIComponent(shareId)}/passwords`;
}
