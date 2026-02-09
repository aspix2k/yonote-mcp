import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerCollectionTools } from "../../tools/collections.js";
import type { YonoteClient } from "../../api-client.js";

describe("collection tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerCollectionTools, client);
  });

  it("registers 10 tools", () => {
    expect(tools).toHaveLength(10);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "collections_list",
      "collections_info",
      "collections_create",
      "collections_update",
      "collections_delete",
      "collections_documents",
      "collections_add_user",
      "collections_remove_user",
      "collections_memberships",
      "collections_export",
    ]);
  });

  const endpointMap: Record<string, string> = {
    collections_list: "collections.list",
    collections_info: "collections.info",
    collections_create: "collections.create",
    collections_update: "collections.update",
    collections_delete: "collections.delete",
    collections_documents: "collections.documents",
    collections_add_user: "collections.add_user",
    collections_remove_user: "collections.remove_user",
    collections_memberships: "collections.memberships",
    collections_export: "collections.export",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("collections_create passes name, description, permission", async () => {
    const handler = getToolHandler(tools, "collections_create");
    await handler({ name: "My Collection", description: "desc", permission: "read_write" });
    expect(client.request).toHaveBeenCalledWith("collections.create", {
      name: "My Collection",
      description: "desc",
      permission: "read_write",
    });
  });

  it("collections_update passes id and name", async () => {
    const handler = getToolHandler(tools, "collections_update");
    await handler({ id: "col-1", name: "Renamed" });
    expect(client.request).toHaveBeenCalledWith("collections.update", {
      id: "col-1",
      name: "Renamed",
    });
  });

  it("collections_add_user passes id, userId, permission", async () => {
    const handler = getToolHandler(tools, "collections_add_user");
    await handler({ id: "col-1", userId: "u-1", permission: "admin" });
    expect(client.request).toHaveBeenCalledWith("collections.add_user", {
      id: "col-1",
      userId: "u-1",
      permission: "admin",
    });
  });

  it("collections_export passes id and format", async () => {
    const handler = getToolHandler(tools, "collections_export");
    await handler({ id: "col-1", format: "html" });
    expect(client.request).toHaveBeenCalledWith("collections.export", {
      id: "col-1",
      format: "html",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: { id: "col-1", name: "Test" } };
    client = createMockClient(responseData);
    tools = collectTools(registerCollectionTools, client);
    const handler = getToolHandler(tools, "collections_info");
    const result = await handler({ id: "col-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
