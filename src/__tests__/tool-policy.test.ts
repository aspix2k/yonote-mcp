import { describe, expect, it } from "vitest";
import {
  isToolEnabled,
  TOOL_POLICIES,
  type ToolApiChannel,
  type ToolProfile,
} from "../tool-policy.js";

describe("tool policies", () => {
  it("keeps the reviewed capability and channel inventory", () => {
    const combinations = new Map<string, number>();
    for (const policy of Object.values(TOOL_POLICIES)) {
      const key = [
        policy.capability,
        policy.destructive,
        policy.idempotent,
        policy.apiChannel,
      ].join("|");
      combinations.set(key, (combinations.get(key) ?? 0) + 1);
    }

    expect(Object.keys(TOOL_POLICIES)).toHaveLength(116);
    expect(
      Object.values(TOOL_POLICIES).filter((it) => it.destructive),
    ).toHaveLength(17);
    expect(
      Object.values(TOOL_POLICIES).filter((it) => it.idempotent),
    ).toHaveLength(82);
    expect(Object.fromEntries(combinations)).toEqual({
      "read|false|true|stable": 39,
      "admin|false|true|stable": 7,
      "admin|true|true|stable": 8,
      "write|false|false|stable": 10,
      "export|false|false|stable": 7,
      "write|true|true|stable": 5,
      "write|false|true|stable": 14,
      "read|false|true|legacy": 4,
      "admin|false|false|legacy": 2,
      "admin|true|true|legacy": 1,
      "admin|false|false|stable": 12,
      "write|false|false|legacy": 1,
      "write|true|true|legacy": 1,
      "read|false|true|preview": 1,
      "admin|false|false|preview": 2,
      "admin|true|true|preview": 2,
    });
  });

  it("keeps representative high-risk tools in the intended policy", () => {
    expect(TOOL_POLICIES).toMatchObject({
      documents_info: policy("read", false, true, "stable"),
      attachments_redirect: policy("export", false, false, "stable"),
      documents_create: policy("write", false, false, "stable"),
      documents_update: policy("write", false, true, "stable"),
      documents_delete: policy("write", true, true, "stable"),
      users_promote: policy("admin", false, true, "stable"),
      groups_create: policy("admin", false, false, "stable"),
      loop_commands: policy("admin", false, false, "stable"),
      telegram_commands: policy("admin", false, false, "stable"),
      users_delete: policy("admin", true, true, "stable"),
      share_passwords_list: policy("read", false, true, "preview"),
      share_passwords_create: policy("admin", false, false, "preview"),
      share_passwords_delete: policy("admin", true, true, "preview"),
      documents_users: policy("read", false, true, "legacy"),
      users_create: policy("admin", false, false, "legacy"),
      stars_create: policy("write", false, false, "legacy"),
      stars_delete: policy("write", true, true, "legacy"),
    });
  });

  it.each([
    ["readonly", "stable", 39],
    ["export", "stable", 46],
    ["editor", "stable", 75],
    ["admin", "stable", 102],
    ["admin", "preview", 107],
    ["admin", "legacy", 116],
  ] satisfies [ToolProfile, ToolApiChannel, number][])(
    "exposes the reviewed %s/%s inventory",
    (profile, apiChannel, expected) => {
      const enabled = Object.keys(TOOL_POLICIES).filter((name) =>
        isToolEnabled(name as keyof typeof TOOL_POLICIES, {
          profile,
          apiChannel,
        }),
      );
      expect(enabled).toHaveLength(expected);
    },
  );

  it("applies allow and deny lists after profile and channel checks", () => {
    expect(
      isToolEnabled("documents_info", {
        profile: "readonly",
        apiChannel: "stable",
        enabledTools: new Set(["documents_info"]),
      }),
    ).toBe(true);
    expect(
      isToolEnabled("documents_search", {
        profile: "readonly",
        apiChannel: "stable",
        enabledTools: new Set(["documents_info"]),
      }),
    ).toBe(false);
    expect(
      isToolEnabled("documents_info", {
        profile: "readonly",
        apiChannel: "stable",
        disabledTools: new Set(["documents_info"]),
      }),
    ).toBe(false);
    expect(
      isToolEnabled("documents_info", {
        profile: "readonly",
        apiChannel: "stable",
        enabledTools: new Set(),
        disabledTools: new Set(),
      }),
    ).toBe(true);
    expect(
      isToolEnabled("share_passwords_list", {
        profile: "readonly",
        apiChannel: "stable",
        enabledTools: new Set(["share_passwords_list"]),
      }),
    ).toBe(false);
    expect(
      isToolEnabled("documents_create", {
        profile: "readonly",
        apiChannel: "stable",
        enabledTools: new Set(["documents_create"]),
      }),
    ).toBe(false);
  });
});

function policy(
  capability: "read" | "export" | "write" | "admin",
  destructive: boolean,
  idempotent: boolean,
  apiChannel: ToolApiChannel,
) {
  return { capability, destructive, idempotent, apiChannel };
}
