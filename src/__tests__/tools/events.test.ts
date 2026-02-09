import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerEventTools } from "../../tools/events.js";
import type { YonoteClient } from "../../api-client.js";

describe("event tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerEventTools, client);
  });

  it("registers 1 tool", () => {
    expect(tools).toHaveLength(1);
  });

  it("registers events_list tool", () => {
    expect(tools[0].name).toBe("events_list");
  });

  it("events_list calls events.list", async () => {
    const handler = getToolHandler(tools, "events_list");
    await handler({});
    expect(client.request).toHaveBeenCalledWith("events.list", {});
  });

  it("events_list passes actorId and documentId", async () => {
    const handler = getToolHandler(tools, "events_list");
    await handler({ actorId: "u-1", documentId: "doc-1", auditLog: true });
    expect(client.request).toHaveBeenCalledWith("events.list", {
      actorId: "u-1",
      documentId: "doc-1",
      auditLog: true,
    });
  });

  it("returns formatted text result", async () => {
    const responseData = { data: [{ name: "documents.create" }] };
    client = createMockClient(responseData);
    tools = collectTools(registerEventTools, client);
    const handler = getToolHandler(tools, "events_list");
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
