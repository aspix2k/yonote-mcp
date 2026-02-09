import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerShareTools } from "../../tools/shares.js";
import type { YonoteClient } from "../../api-client.js";

describe("share tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerShareTools, client);
  });

  it("registers 4 tools", () => {
    expect(tools).toHaveLength(4);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "shares_list",
      "shares_info",
      "shares_create",
      "shares_delete",
    ]);
  });

  const endpointMap: Record<string, string> = {
    shares_list: "shares.list",
    shares_info: "shares.info",
    shares_create: "shares.create",
    shares_delete: "shares.delete",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("shares_create passes documentId", async () => {
    const handler = getToolHandler(tools, "shares_create");
    await handler({ documentId: "doc-1" });
    expect(client.request).toHaveBeenCalledWith("shares.create", {
      documentId: "doc-1",
    });
  });

  it("shares_delete passes id", async () => {
    const handler = getToolHandler(tools, "shares_delete");
    await handler({ id: "share-1" });
    expect(client.request).toHaveBeenCalledWith("shares.delete", {
      id: "share-1",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: { id: "s-1" } };
    client = createMockClient(responseData);
    tools = collectTools(registerShareTools, client);
    const handler = getToolHandler(tools, "shares_info");
    const result = await handler({ id: "s-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
