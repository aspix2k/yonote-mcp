import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerLdapTools(server: ToolRegistrar, client: YonoteClient) {
  server.tool(
    "ldap_ping",
    "Test an LDAP connection without saving it.",
    {
      base: z.string().describe("LDAP base DN"),
      user: z.string().describe("LDAP bind user"),
      password: z.string().describe("LDAP bind password"),
      filter: z.string().describe("LDAP search filter"),
      hostName: z.string().describe("LDAP host name"),
      port: z.string().describe("LDAP port"),
      ssl: z.boolean().describe("Use LDAPS"),
      certificateFile: z
        .string()
        .optional()
        .describe("Certificate filename inside YONOTE_IMPORT_DIR"),
    },
    async ({ certificateFile, ...params }) =>
      textResult(
        await client.requestMultipart(
          "ldap.ping",
          params,
          certificateFile
            ? {
                field: "certificate",
                filename: certificateFile,
                contentType: "application/x-pem-file",
              }
            : undefined,
        ),
      ),
  );

  server.tool(
    "ldap_create",
    "Create LDAP authentication provider.",
    {
      base: z.string().describe("LDAP base DN"),
      user: z.string().describe("LDAP bind user"),
      password: z.string().describe("LDAP bind password"),
      filter: z.string().describe("LDAP search filter"),
      hostName: z.string().describe("LDAP host name"),
      port: z.string().describe("LDAP port"),
      ssl: z.boolean().describe("Use LDAPS"),
      certificateFile: z
        .string()
        .optional()
        .describe("Certificate filename inside YONOTE_IMPORT_DIR"),
      customButtonName: z
        .string()
        .optional()
        .describe("Custom login button name"),
    },
    async ({ certificateFile, ...params }) =>
      textResult(
        await client.requestMultipart(
          "ldap.create",
          params,
          certificateFile
            ? {
                field: "certificate",
                filename: certificateFile,
                contentType: "application/x-pem-file",
              }
            : undefined,
        ),
      ),
  );

  server.tool(
    "ldap_login",
    "Login via LDAP.",
    {
      email: z.string().describe("User email"),
      password: z.string().describe("User password"),
      providerId: z.string().describe("LDAP provider ID"),
    },
    async (params) => textResult(await client.request("ldap.login", params)),
  );
}
