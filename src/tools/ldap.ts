import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerLdapTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "ldap_ping",
    "Test LDAP connection.",
    {
      base: z.string().describe("LDAP base DN"),
      user: z.string().describe("LDAP bind user"),
      password: z.string().describe("LDAP bind password"),
      filter: z.string().describe("LDAP search filter"),
      hostName: z.string().describe("LDAP host name"),
      port: z.string().describe("LDAP port"),
      ssl: z.string().describe("Use SSL"),
      certificate: z.string().optional().describe("SSL certificate"),
    },
    async (params) =>
      textResult(await client.request("ldap.ping", params)),
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
      ssl: z.string().describe("Use SSL"),
      certificate: z.string().optional().describe("SSL certificate"),
      customButtonName: z.string().optional().describe("Custom login button name"),
    },
    async (params) =>
      textResult(await client.request("ldap.create", params)),
  );

  server.tool(
    "ldap_login",
    "Login via LDAP.",
    {
      email: z.string().describe("User email"),
      password: z.string().describe("User password"),
      providerId: z.string().describe("LDAP provider ID"),
    },
    async (params) =>
      textResult(await client.request("ldap.login", params)),
  );
}
