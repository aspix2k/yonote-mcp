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

  it("registers all v2 preview tools", () => {
    expect(tools.map((tool) => tool.name)).toEqual([
      "share_passwords_list",
      "share_passwords_create",
      "share_passwords_set",
      "share_passwords_delete_all",
      "share_passwords_delete",
    ]);
  });

  it("share_passwords_list uses GET with pagination", async () => {
    const handler = getToolHandler(tools, "share_passwords_list");
    await handler({ shareId: "share/123", limit: 10, direction: "desc" });
    expect(client.request).toHaveBeenCalledWith(
      "v2/shares/share%2F123/passwords",
      undefined,
      {
        method: "GET",
        query: { limit: 10, direction: "desc" },
      },
    );
  });

  it("share_passwords_create sends the documented body", async () => {
    const handler = getToolHandler(tools, "share_passwords_create");
    await handler({
      shareId: "share-123",
      name: "Mentors",
      password: "secret",
      isDisposable: true,
    });
    expect(client.request).toHaveBeenCalledWith(
      "v2/shares/share-123/passwords",
      { name: "Mentors", password: "secret", isDisposable: true },
    );
  });

  it("share_passwords_set uses PUT", async () => {
    const handler = getToolHandler(tools, "share_passwords_set");
    await handler({ shareId: "share-123", password: "secret" });
    expect(client.request).toHaveBeenCalledWith(
      "v2/shares/share-123/passwords",
      { password: "secret" },
      { method: "PUT" },
    );
  });

  it("share_passwords_delete_all uses DELETE", async () => {
    const handler = getToolHandler(tools, "share_passwords_delete_all");
    await handler({ shareId: "share-123" });
    expect(client.request).toHaveBeenCalledWith(
      "v2/shares/share-123/passwords",
      {},
      { method: "DELETE" },
    );
  });

  it("share_passwords_delete encodes both identifiers", async () => {
    const handler = getToolHandler(tools, "share_passwords_delete");
    await handler({ shareId: "share/123", sharePasswordId: "password/1" });
    expect(client.request).toHaveBeenCalledWith(
      "v2/shares/share%2F123/passwords/password%2F1",
      {},
      { method: "DELETE" },
    );
  });
});
