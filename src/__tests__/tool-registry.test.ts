import { describe, expect, it, vi } from "vitest";
import { YonoteApiError, YonoteClientError } from "../api-client.js";
import { YonoteToolRegistry } from "../tool-registry.js";

describe("YonoteToolRegistry", () => {
  it("does not register tools outside the active profile or API channel", () => {
    const registerTool = vi.fn();
    const registry = createRegistry(registerTool, "readonly", "stable");

    registry.tool("documents_create", "Create", {}, async () => result("ok"));
    registry.tool("share_passwords_list", "Preview", {}, async () =>
      result("ok"),
    );

    expect(registerTool).not.toHaveBeenCalled();
  });

  it("registers MCP annotations from the policy", () => {
    const registerTool = vi.fn();
    const registry = createRegistry(registerTool, "admin", "stable");

    registry.tool("collections_delete", "Delete", {}, async () => result("ok"));

    expect(registerTool.mock.calls[0][1]).toMatchObject({
      description: "Delete",
      annotations: {
        title: "Collections Delete",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  });

  it("returns structured Yonote API errors without throwing protocol errors", async () => {
    const registerTool = vi.fn();
    const registry = createRegistry(registerTool, "admin", "stable");
    registry.tool("documents_info", "Read", {}, async () => {
      throw new YonoteApiError(403, "forbidden", "Access denied");
    });

    const handler = registerTool.mock.calls[0][2];
    await expect(handler({})).resolves.toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { error: "forbidden", message: "Access denied", status: 403 },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("does not expose unexpected internal error details", async () => {
    const registerTool = vi.fn();
    const registry = createRegistry(registerTool, "admin", "stable");
    registry.tool("documents_info", "Read", {}, async () => {
      throw new Error("secret filesystem path");
    });

    const handler = registerTool.mock.calls[0][2];
    const response = await handler({});
    expect(response).toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "internal_error",
              message: "Yonote request failed",
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("returns actionable local configuration errors", async () => {
    const registerTool = vi.fn();
    const registry = createRegistry(registerTool, "admin", "stable");
    registry.tool("attachments_download", "Download", {}, async () => {
      throw new YonoteClientError(
        "export_not_configured",
        "Set YONOTE_EXPORT_DIR before using download tools",
      );
    });

    const handler = registerTool.mock.calls[0][2];
    await expect(handler({})).resolves.toEqual({
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: "export_not_configured",
              message: "Set YONOTE_EXPORT_DIR before using download tools",
            },
            null,
            2,
          ),
        },
      ],
    });
  });
});

function createRegistry(
  registerTool: ReturnType<typeof vi.fn>,
  profile: "readonly" | "admin",
  apiChannel: "stable",
): YonoteToolRegistry {
  return new YonoteToolRegistry({ registerTool } as never, {
    profile,
    apiChannel,
    enabledTools: new Set(),
    disabledTools: new Set(),
  });
}

function result(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
