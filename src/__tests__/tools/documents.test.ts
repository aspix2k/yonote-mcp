import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerDocumentTools } from "../../tools/documents.js";
import type { YonoteClient } from "../../api-client.js";

describe("document tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerDocumentTools, client);
  });

  it("registers 27 tools", () => {
    expect(tools).toHaveLength(27);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "documents_list",
      "documents_info",
      "documents_search",
      "documents_search_titles",
      "documents_create",
      "documents_update",
      "documents_delete",
      "documents_archive",
      "documents_restore",
      "documents_move",
      "documents_copy",
      "documents_drafts",
      "documents_viewed",
      "documents_unpublish",
      "documents_users",
      "documents_add_user",
      "documents_remove_user",
      "documents_children",
      "documents_import",
      "documents_export",
      "documents_starred",
      "documents_pinned",
      "documents_templatize",
      "documents_star",
      "documents_unstar",
      "documents_pin",
      "documents_unpin",
    ]);
  });

  const endpointMap: Record<string, string> = {
    documents_list: "documents.list",
    documents_info: "documents.info",
    documents_search: "documents.search",
    documents_search_titles: "documents.search_titles",
    documents_create: "documents.create",
    documents_update: "documents.update",
    documents_delete: "documents.delete",
    documents_archive: "documents.archive",
    documents_restore: "documents.restore",
    documents_move: "documents.move",
    documents_copy: "documents.copy",
    documents_drafts: "documents.drafts",
    documents_viewed: "documents.viewed",
    documents_unpublish: "documents.unpublish",
    documents_users: "documents.users",
    documents_add_user: "documents.add_user",
    documents_remove_user: "documents.remove_user",
    documents_children: "documents.documents",
    documents_import: "documents.import",
    documents_export: "documents.export",
    documents_starred: "documents.starred",
    documents_pinned: "documents.pinned",
    documents_templatize: "documents.templatize",
    documents_star: "documents.star",
    documents_unstar: "documents.unstar",
    documents_pin: "documents.pin",
    documents_unpin: "documents.unpin",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("documents_list passes collectionId and limit", async () => {
    const handler = getToolHandler(tools, "documents_list");
    await handler({ collectionId: "col-1", limit: 5 });
    expect(client.request).toHaveBeenCalledWith("documents.list", {
      collectionId: "col-1",
      limit: 5,
    });
  });

  it("documents_info passes id", async () => {
    const handler = getToolHandler(tools, "documents_info");
    await handler({ id: "doc-123" });
    expect(client.request).toHaveBeenCalledWith("documents.info", {
      id: "doc-123",
    });
  });

  it("documents_search passes query and dateFilter", async () => {
    const handler = getToolHandler(tools, "documents_search");
    await handler({ query: "test", dateFilter: "week" });
    expect(client.request).toHaveBeenCalledWith("documents.search", {
      query: "test",
      dateFilter: "week",
    });
  });

  it("documents_create passes title, text, collectionId, publish", async () => {
    const handler = getToolHandler(tools, "documents_create");
    await handler({ title: "New Doc", text: "# Hello", collectionId: "c1", publish: true });
    expect(client.request).toHaveBeenCalledWith("documents.create", {
      title: "New Doc",
      text: "# Hello",
      collectionId: "c1",
      publish: true,
    });
  });

  it("documents_update passes id, title, text, append", async () => {
    const handler = getToolHandler(tools, "documents_update");
    await handler({ id: "doc-1", title: "Updated", append: true });
    expect(client.request).toHaveBeenCalledWith("documents.update", {
      id: "doc-1",
      title: "Updated",
      append: true,
    });
  });

  it("documents_delete passes id", async () => {
    const handler = getToolHandler(tools, "documents_delete");
    await handler({ id: "doc-1" });
    expect(client.request).toHaveBeenCalledWith("documents.delete", {
      id: "doc-1",
    });
  });

  it("documents_move passes id, collectionId, parentDocumentId", async () => {
    const handler = getToolHandler(tools, "documents_move");
    await handler({ id: "doc-1", collectionId: "c2", parentDocumentId: "parent-1" });
    expect(client.request).toHaveBeenCalledWith("documents.move", {
      id: "doc-1",
      collectionId: "c2",
      parentDocumentId: "parent-1",
    });
  });

  it("documents_add_user passes id, userId, permission", async () => {
    const handler = getToolHandler(tools, "documents_add_user");
    await handler({ id: "doc-1", userId: "u-1", permission: "read_write" });
    expect(client.request).toHaveBeenCalledWith("documents.add_user", {
      id: "doc-1",
      userId: "u-1",
      permission: "read_write",
    });
  });

  it("documents_copy passes id and collectionId", async () => {
    const handler = getToolHandler(tools, "documents_copy");
    await handler({ id: "doc-1", collectionId: "c2" });
    expect(client.request).toHaveBeenCalledWith("documents.copy", {
      id: "doc-1",
      collectionId: "c2",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: [{ id: "1" }] };
    client = createMockClient(responseData);
    tools = collectTools(registerDocumentTools, client);
    const handler = getToolHandler(tools, "documents_list");
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
