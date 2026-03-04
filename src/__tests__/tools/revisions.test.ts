import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerRevisionTools } from "../../tools/revisions.js";
import type { YonoteClient } from "../../api-client.js";

describe("revision tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerRevisionTools, client);
  });

  it("registers 2 tools", () => {
    expect(tools).toHaveLength(2);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["revisions_list", "revisions_info"]);
  });

  const endpointMap: Record<string, string> = {
    revisions_list: "revisions.list",
    revisions_info: "revisions.info",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("revisions_list passes sort and direction", async () => {
    const handler = getToolHandler(tools, "revisions_list");
    await handler({ sort: "createdAt", direction: "DESC", limit: 10 });
    expect(client.request).toHaveBeenCalledWith("revisions.list", {
      sort: "createdAt",
      direction: "DESC",
      limit: 10,
    });
  });

  it("revisions_info passes id", async () => {
    const handler = getToolHandler(tools, "revisions_info");
    await handler({ id: "rev-1" });
    expect(client.request).toHaveBeenCalledWith("revisions.info", {
      id: "rev-1",
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: { id: "rev-1", text: "v1" } };
    client = createMockClient(responseData);
    tools = collectTools(registerRevisionTools, client);
    const handler = getToolHandler(tools, "revisions_info");
    const result = await handler({ id: "rev-1" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
