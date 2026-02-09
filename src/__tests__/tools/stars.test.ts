import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerStarTools } from "../../tools/stars.js";
import type { YonoteClient } from "../../api-client.js";

describe("star tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerStarTools, client);
  });

  it("registers 3 tools", () => {
    expect(tools).toHaveLength(3);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "stars_list",
      "stars_create",
      "stars_delete",
    ]);
  });

  const endpointMap: Record<string, string> = {
    stars_list: "stars.list",
    stars_create: "stars.create",
    stars_delete: "stars.delete",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("stars_create passes documentId", async () => {
    const handler = getToolHandler(tools, "stars_create");
    await handler({ documentId: "doc-1" });
    expect(client.request).toHaveBeenCalledWith("stars.create", {
      documentId: "doc-1",
    });
  });

  it("stars_create passes collectionId", async () => {
    const handler = getToolHandler(tools, "stars_create");
    await handler({ collectionId: "col-1" });
    expect(client.request).toHaveBeenCalledWith("stars.create", {
      collectionId: "col-1",
    });
  });

  it("stars_delete passes id", async () => {
    const handler = getToolHandler(tools, "stars_delete");
    await handler({ id: "star-1" });
    expect(client.request).toHaveBeenCalledWith("stars.delete", {
      id: "star-1",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: [] };
    client = createMockClient(responseData);
    tools = collectTools(registerStarTools, client);
    const handler = getToolHandler(tools, "stars_list");
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
