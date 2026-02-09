import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerViewTools } from "../../tools/views.js";
import type { YonoteClient } from "../../api-client.js";

describe("view tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerViewTools, client);
  });

  it("registers 2 tools", () => {
    expect(tools).toHaveLength(2);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["views_list", "views_create"]);
  });

  const endpointMap: Record<string, string> = {
    views_list: "views.list",
    views_create: "views.create",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("views_list passes documentId", async () => {
    const handler = getToolHandler(tools, "views_list");
    await handler({ documentId: "doc-1", limit: 20 });
    expect(client.request).toHaveBeenCalledWith("views.list", {
      documentId: "doc-1",
      limit: 20,
    });
  });

  it("views_create passes documentId", async () => {
    const handler = getToolHandler(tools, "views_create");
    await handler({ documentId: "doc-1" });
    expect(client.request).toHaveBeenCalledWith("views.create", {
      documentId: "doc-1",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: [{ count: 42 }] };
    client = createMockClient(responseData);
    tools = collectTools(registerViewTools, client);
    const handler = getToolHandler(tools, "views_list");
    const result = await handler({ documentId: "doc-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
