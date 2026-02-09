import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerGroupTools } from "../../tools/groups.js";
import type { YonoteClient } from "../../api-client.js";

describe("group tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerGroupTools, client);
  });

  it("registers 6 tools", () => {
    expect(tools).toHaveLength(6);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "groups_list",
      "groups_info",
      "groups_create",
      "groups_update",
      "groups_delete",
      "groups_memberships",
    ]);
  });

  const endpointMap: Record<string, string> = {
    groups_list: "groups.list",
    groups_info: "groups.info",
    groups_create: "groups.create",
    groups_update: "groups.update",
    groups_delete: "groups.delete",
    groups_memberships: "groups.memberships",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("groups_create passes name", async () => {
    const handler = getToolHandler(tools, "groups_create");
    await handler({ name: "Developers" });
    expect(client.request).toHaveBeenCalledWith("groups.create", {
      name: "Developers",
    });
  });

  it("groups_update passes id and name", async () => {
    const handler = getToolHandler(tools, "groups_update");
    await handler({ id: "g-1", name: "Engineers" });
    expect(client.request).toHaveBeenCalledWith("groups.update", {
      id: "g-1",
      name: "Engineers",
    });
  });

  it("groups_memberships passes id and query", async () => {
    const handler = getToolHandler(tools, "groups_memberships");
    await handler({ id: "g-1", query: "john" });
    expect(client.request).toHaveBeenCalledWith("groups.memberships", {
      id: "g-1",
      query: "john",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: { id: "g-1" } };
    client = createMockClient(responseData);
    tools = collectTools(registerGroupTools, client);
    const handler = getToolHandler(tools, "groups_info");
    const result = await handler({ id: "g-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
