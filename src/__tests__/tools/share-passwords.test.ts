import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerSharePasswordTools } from "../../tools/share-passwords.js";
import type { YonoteClient } from "../../api-client.js";

describe("share password tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerSharePasswordTools, client);
  });

  it("registers 1 tool", () => {
    expect(tools).toHaveLength(1);
  });

  it("registers share_passwords_create tool", () => {
    expect(tools[0].name).toBe("share_passwords_create");
  });

  it("share_passwords_create calls correct endpoint with shareId", async () => {
    const handler = getToolHandler(tools, "share_passwords_create");
    await handler({ shareId: "share-123" });
    expect(client.request).toHaveBeenCalledWith(
      "v2/shares/share-123/passwords",
      {},
    );
  });
});
