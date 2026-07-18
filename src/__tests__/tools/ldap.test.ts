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
    await handler({
      email: "user@test.com",
      password: "pass",
      providerId: "p-1",
    });
    expect(client.request).toHaveBeenCalledWith("ldap.login", {
      email: "user@test.com",
      password: "pass",
      providerId: "p-1",
    });
  });

  it("sends LDAP configuration as multipart data", async () => {
    const handler = getToolHandler(tools, "ldap_ping");
    await handler({
      base: "dc=example,dc=org",
      user: "admin",
      password: "secret",
      filter: "(objectClass=person)",
      hostName: "ldap.example.com",
      port: "636",
      ssl: true,
    });
    expect(client.requestMultipart).toHaveBeenCalledWith(
      "ldap.ping",
      {
        base: "dc=example,dc=org",
        user: "admin",
        password: "secret",
        filter: "(objectClass=person)",
        hostName: "ldap.example.com",
        port: "636",
        ssl: true,
      },
      undefined,
    );
  });

  it("loads an optional LDAP certificate from the import directory", async () => {
    const handler = getToolHandler(tools, "ldap_create");
    await handler({
      base: "dc=example,dc=org",
      user: "admin",
      password: "secret",
      filter: "(objectClass=person)",
      hostName: "ldap.example.com",
      port: "636",
      ssl: true,
      certificateFile: "ldap.pem",
    });
    expect(client.requestMultipart).toHaveBeenCalledWith(
      "ldap.create",
      expect.not.objectContaining({ certificateFile: expect.anything() }),
      {
        field: "certificate",
        filename: "ldap.pem",
        contentType: "application/x-pem-file",
      },
    );
  });
});
