import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerProviderTools } from "../../tools/providers.js";
import type { YonoteClient } from "../../api-client.js";

describe("provider tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerProviderTools, client);
  });

  it("registers 3 tools", () => {
    expect(tools).toHaveLength(3);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["provider_enable", "provider_delete", "provider_info"]);
  });

  const endpointMap: Record<string, string> = {
    provider_enable: "provider.enable",
    provider_delete: "provider.delete",
    provider_info: "provider.info",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("provider_enable passes isActive and type", async () => {
    const handler = getToolHandler(tools, "provider_enable");
    await handler({ isActive: true, type: "saml" });
    expect(client.request).toHaveBeenCalledWith("provider.enable", {
      isActive: true,
      type: "saml",
    });
  });
});
