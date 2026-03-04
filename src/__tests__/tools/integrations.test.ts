import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerIntegrationTools } from "../../tools/integrations.js";
import type { YonoteClient } from "../../api-client.js";

describe("integration tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerIntegrationTools, client);
  });

  it("registers 6 tools", () => {
    expect(tools).toHaveLength(6);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "loop_teams",
      "loop_channels",
      "loop_commands",
      "loop_post",
      "telegram_commands",
      "telegram_post",
    ]);
  });

  const endpointMap: Record<string, string> = {
    loop_teams: "loop.teams",
    loop_channels: "loop.channels",
    loop_commands: "loop.commands",
    loop_post: "loop.post",
    telegram_commands: "telegram.commands",
    telegram_post: "telegram.post",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("loop_post passes collectionId and channel", async () => {
    const handler = getToolHandler(tools, "loop_post");
    await handler({ collectionId: "col-1", channel: "#general" });
    expect(client.request).toHaveBeenCalledWith("loop.post", {
      collectionId: "col-1",
      channel: "#general",
    });
  });
});
