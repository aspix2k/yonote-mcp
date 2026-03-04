import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerLdapTools } from "../../tools/ldap.js";
import type { YonoteClient } from "../../api-client.js";

describe("ldap tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerLdapTools, client);
  });

  it("registers 3 tools", () => {
    expect(tools).toHaveLength(3);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["ldap_ping", "ldap_create", "ldap_login"]);
  });

  const endpointMap: Record<string, string> = {
    ldap_ping: "ldap.ping",
    ldap_create: "ldap.create",
    ldap_login: "ldap.login",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("ldap_login passes email, password, providerId", async () => {
    const handler = getToolHandler(tools, "ldap_login");
    await handler({ email: "user@test.com", password: "pass", providerId: "p-1" });
    expect(client.request).toHaveBeenCalledWith("ldap.login", {
      email: "user@test.com",
      password: "pass",
      providerId: "p-1",
    });
  });
});
