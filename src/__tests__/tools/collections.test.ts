import { describe, it, expect, beforeEach, vi } from "vitest";
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

  it("registers 14 tools", () => {
    expect(tools).toHaveLength(14);
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
      "collections_add_group",
      "collections_remove_group",
      "collections_group_memberships",
      "collections_export_all",
    ]);
  });

  const endpointMap: Record<string, string> = {
    collections_list: "collections.list",
    collections_info: "collections.info",
    collections_create: "collections.create",
    collections_update: "collections.update",
    collections_delete: "collections.delete",
    collections_add_user: "collections.add_user",
    collections_remove_user: "collections.remove_user",
    collections_memberships: "collections.memberships",
    collections_export: "collections.export",
    collections_add_group: "collections.add_group",
    collections_remove_group: "collections.remove_group",
    collections_group_memberships: "collections.group_memberships",
    collections_export_all: "collections.export_all",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("collections_documents builds a paginated hierarchy", async () => {
    vi.mocked(client.request)
      .mockResolvedValueOnce({
        total: "3",
        data: [
          { id: "child", title: "Child", parentDocumentId: "root" },
          { id: "root", title: "Root" },
        ],
      })
      .mockResolvedValueOnce({
        total: 3,
        data: [{ id: "orphan", title: "Orphan", parentDocumentId: "missing" }],
      });

    const handler = getToolHandler(tools, "collections_documents");
    const result = await handler({ id: "col-1", limit: 10 });

    expect(client.request).toHaveBeenNthCalledWith(1, "documents.list", {
      collectionId: "col-1",
      limit: 10,
      offset: 0,
    });
    expect(client.request).toHaveBeenNthCalledWith(2, "documents.list", {
      collectionId: "col-1",
      limit: 8,
      offset: 2,
    });
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              collectionId: "col-1",
              total: 3,
              returned: 3,
              truncated: false,
              data: [
                {
                  id: "root",
                  title: "Root",
                  children: [
                    {
                      id: "child",
                      title: "Child",
                      parentDocumentId: "root",
                      children: [],
                    },
                  ],
                },
                {
                  id: "orphan",
                  title: "Orphan",
                  parentDocumentId: "missing",
                  children: [],
                },
              ],
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("collections_documents bounds cyclic data and reports truncation", async () => {
    vi.mocked(client.request).mockResolvedValueOnce({
      total: 3,
      data: [
        { id: "first", title: "First", parentDocumentId: "second" },
        { id: "second", title: "Second", parentDocumentId: "first" },
      ],
    });

    const handler = getToolHandler(tools, "collections_documents");
    const result = await handler({ id: "col-1", limit: 2 });

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              collectionId: "col-1",
              total: 3,
              returned: 2,
              truncated: true,
              data: [
                {
                  id: "first",
                  title: "First",
                  parentDocumentId: "second",
                  children: [
                    {
                      id: "second",
                      title: "Second",
                      parentDocumentId: "first",
                      children: [],
                    },
                  ],
                },
              ],
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("collections_documents stops at the last uncounted page", async () => {
    vi.mocked(client.request).mockResolvedValueOnce({
      total: "unknown",
      data: [{ id: "only" }],
    });

    const handler = getToolHandler(tools, "collections_documents");
    const result = await handler({ id: "col-1", limit: 10 });

    expect(client.request).toHaveBeenCalledOnce();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              collectionId: "col-1",
              total: 1,
              returned: 1,
              truncated: false,
              data: [{ id: "only", title: "", children: [] }],
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("collections_documents paginates uncounted full pages", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `doc-${index}`,
      title: `Document ${index}`,
    }));
    vi.mocked(client.request)
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({
        data: [{ id: "doc-100", title: "Document 100" }],
      });

    const handler = getToolHandler(tools, "collections_documents");
    const result = await handler({ id: "col-1", limit: 101 });
    const content = result.content[0];
    expect(content.type).toBe("text");
    if (content.type !== "text") throw new Error("Expected a text result");
    const payload = JSON.parse(content.text);

    expect(client.request).toHaveBeenNthCalledWith(1, "documents.list", {
      collectionId: "col-1",
      limit: 100,
      offset: 0,
    });
    expect(client.request).toHaveBeenNthCalledWith(2, "documents.list", {
      collectionId: "col-1",
      limit: 1,
      offset: 100,
    });
    expect(client.request).toHaveBeenCalledTimes(2);
    expect(payload).toMatchObject({
      total: 101,
      returned: 101,
      truncated: false,
    });
    expect(payload.data).toHaveLength(101);
  });

  it("collections_documents stops on an empty counted page", async () => {
    vi.mocked(client.request).mockResolvedValueOnce({ total: 1, data: [] });

    const handler = getToolHandler(tools, "collections_documents");
    const result = await handler({ id: "col-1", limit: 10 });

    expect(client.request).toHaveBeenCalledOnce();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              collectionId: "col-1",
              total: 1,
              returned: 0,
              truncated: true,
              data: [],
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("collections_create passes name, description, private", async () => {
    const handler = getToolHandler(tools, "collections_create");
    await handler({
      name: "My Collection",
      description: "desc",
      private: true,
    });
    expect(client.request).toHaveBeenCalledWith("collections.create", {
      name: "My Collection",
      description: "desc",
      private: true,
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

  it("collections_add_user passes id and userId", async () => {
    const handler = getToolHandler(tools, "collections_add_user");
    await handler({ id: "col-1", userId: "u-1" });
    expect(client.request).toHaveBeenCalledWith("collections.add_user", {
      id: "col-1",
      userId: "u-1",
    });
  });

  it("collections_export passes id", async () => {
    const handler = getToolHandler(tools, "collections_export");
    await handler({ id: "col-1" });
    expect(client.request).toHaveBeenCalledWith("collections.export", {
      id: "col-1",
    });
  });

  it("collections_add_group passes id and groupId", async () => {
    const handler = getToolHandler(tools, "collections_add_group");
    await handler({ id: "col-1", groupId: "g-1" });
    expect(client.request).toHaveBeenCalledWith("collections.add_group", {
      id: "col-1",
      groupId: "g-1",
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
