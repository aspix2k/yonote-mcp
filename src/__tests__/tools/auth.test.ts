import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerAuthTools } from "../../tools/auth.js";
import type { YonoteClient } from "../../api-client.js";

describe("auth tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: { user: { id: "u-1" } } });
    tools = collectTools(registerAuthTools, client);
  });

  it("registers 1 tool", () => {
    expect(tools).toHaveLength(1);
  });

  it("registers auth_info tool", () => {
    expect(tools[0].name).toBe("auth_info");
  });

  it("auth_info calls auth.info with no params", async () => {
    const handler = getToolHandler(tools, "auth_info");
    await handler({});
    expect(client.request).toHaveBeenCalledWith("auth.info");
  });

  it("returns formatted text result", async () => {
    const responseData = { data: { user: { id: "u-1", name: "Admin" } } };
    client = createMockClient(responseData);
    tools = collectTools(registerAuthTools, client);
    const handler = getToolHandler(tools, "auth_info");
    const result = await handler({});
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(responseData, null, 2) }],
    });
  });
});
