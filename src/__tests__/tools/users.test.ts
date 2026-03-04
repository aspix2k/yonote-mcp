import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerUserTools } from "../../tools/users.js";
import type { YonoteClient } from "../../api-client.js";

describe("user tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerUserTools, client);
  });

  it("registers 9 tools", () => {
    expect(tools).toHaveLength(9);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "users_list",
      "users_info",
      "users_create",
      "users_suspend",
      "users_activate",
      "users_update",
      "users_promote",
      "users_demote",
      "users_delete",
    ]);
  });

  const endpointMap: Record<string, string> = {
    users_list: "users.list",
    users_info: "users.info",
    users_create: "users.create",
    users_suspend: "users.suspend",
    users_activate: "users.activate",
    users_update: "users.update",
    users_promote: "users.promote",
    users_demote: "users.demote",
    users_delete: "users.delete",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("users_list passes query and filter", async () => {
    const handler = getToolHandler(tools, "users_list");
    await handler({ query: "john", filter: "active" });
    expect(client.request).toHaveBeenCalledWith("users.list", {
      query: "john",
      filter: "active",
    });
  });

  it("users_create passes email, name, role", async () => {
    const handler = getToolHandler(tools, "users_create");
    await handler({ email: "test@test.com", name: "Test User", role: "member" });
    expect(client.request).toHaveBeenCalledWith("users.create", {
      email: "test@test.com",
      name: "Test User",
      role: "member",
    });
  });

  it("users_update passes name and avatarUrl", async () => {
    const handler = getToolHandler(tools, "users_update");
    await handler({ name: "New Name", avatarUrl: "https://example.com/avatar.png" });
    expect(client.request).toHaveBeenCalledWith("users.update", {
      name: "New Name",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: { id: "u-1", name: "User" } };
    client = createMockClient(responseData);
    tools = collectTools(registerUserTools, client);
    const handler = getToolHandler(tools, "users_info");
    const result = await handler({ id: "u-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
