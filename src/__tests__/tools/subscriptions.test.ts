import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerSubscriptionTools } from "../../tools/subscriptions.js";
import type { YonoteClient } from "../../api-client.js";

describe("subscription tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerSubscriptionTools, client);
  });

  it("registers 3 tools", () => {
    expect(tools).toHaveLength(3);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "subscriptions_create",
      "subscriptions_info",
      "subscriptions_delete",
    ]);
  });

  const endpointMap: Record<string, string> = {
    subscriptions_create: "subscriptions.create",
    subscriptions_info: "subscriptions.info",
    subscriptions_delete: "subscriptions.delete",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("subscriptions_create passes documentId and event", async () => {
    const handler = getToolHandler(tools, "subscriptions_create");
    await handler({ documentId: "doc-1", event: "documents.update" });
    expect(client.request).toHaveBeenCalledWith("subscriptions.create", {
      documentId: "doc-1",
      event: "documents.update",
    });
  });
});
