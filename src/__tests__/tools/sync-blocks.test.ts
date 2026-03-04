import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerSyncBlockTools } from "../../tools/sync-blocks.js";
import type { YonoteClient } from "../../api-client.js";

describe("sync block tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerSyncBlockTools, client);
  });

  it("registers 4 tools", () => {
    expect(tools).toHaveLength(4);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "sync_blocks_create",
      "sync_blocks_delete",
      "sync_blocks_list",
      "sync_blocks_list_inserts",
    ]);
  });

  const endpointMap: Record<string, string> = {
    sync_blocks_create: "syncBlocks.create",
    sync_blocks_delete: "syncBlocks.delete",
    sync_blocks_list: "syncBlocks.list",
    sync_blocks_list_inserts: "syncBlocks.list_inserts",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("sync_blocks_create passes ids and documentId", async () => {
    const handler = getToolHandler(tools, "sync_blocks_create");
    await handler({ ids: ["b1", "b2"], documentId: "doc-1" });
    expect(client.request).toHaveBeenCalledWith("syncBlocks.create", {
      ids: ["b1", "b2"],
      documentId: "doc-1",
    });
  });
});
