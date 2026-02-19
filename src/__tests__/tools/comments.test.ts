import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerCommentTools } from "../../tools/comments.js";
import type { YonoteClient } from "../../api-client.js";

describe("comment tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerCommentTools, client);
  });

  it("registers 4 tools", () => {
    expect(tools).toHaveLength(4);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "comments_list",
      "comments_create",
      "comments_update",
      "comments_delete",
    ]);
  });

  const endpointMap: Record<string, string> = {
    comments_list: "comments.list",
    comments_create: "comments.create",
    comments_update: "comments.update",
    comments_delete: "comments.delete",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("comments_create passes entityType, entityId and text", async () => {
    const handler = getToolHandler(tools, "comments_create");
    await handler({ entityType: "document", entityId: "doc-1", text: "Nice doc!" });
    expect(client.request).toHaveBeenCalledWith("comments.create", {
      entityType: "document",
      entityId: "doc-1",
      text: "Nice doc!",
    });
  });

  it("comments_update passes id and data", async () => {
    const handler = getToolHandler(tools, "comments_update");
    await handler({ id: "c-1", data: { type: "doc" } });
    expect(client.request).toHaveBeenCalledWith("comments.update", {
      id: "c-1",
      data: { type: "doc" },
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: [] };
    client = createMockClient(responseData);
    tools = collectTools(registerCommentTools, client);
    const handler = getToolHandler(tools, "comments_list");
    const result = await handler({ entityType: "document", entityId: "d1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
