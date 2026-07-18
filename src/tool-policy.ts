export type ToolCapability = "read" | "export" | "write" | "admin";
export type ToolProfile = "readonly" | "export" | "editor" | "admin";
export type ToolApiChannel = "stable" | "preview" | "legacy";

export interface ToolPolicy {
  capability: ToolCapability;
  destructive: boolean;
  idempotent: boolean;
  apiChannel: ToolApiChannel;
}

const read: ToolPolicy = {
  capability: "read",
  destructive: false,
  idempotent: true,
  apiChannel: "stable",
};

const exportData: ToolPolicy = {
  capability: "export",
  destructive: false,
  idempotent: false,
  apiChannel: "stable",
};

const write: ToolPolicy = {
  capability: "write",
  destructive: false,
  idempotent: false,
  apiChannel: "stable",
};

const idempotentWrite: ToolPolicy = {
  capability: "write",
  destructive: false,
  idempotent: true,
  apiChannel: "stable",
};

const destructiveWrite: ToolPolicy = {
  capability: "write",
  destructive: true,
  idempotent: true,
  apiChannel: "stable",
};

const admin: ToolPolicy = {
  capability: "admin",
  destructive: false,
  idempotent: false,
  apiChannel: "stable",
};

const idempotentAdmin: ToolPolicy = {
  capability: "admin",
  destructive: false,
  idempotent: true,
  apiChannel: "stable",
};

const destructiveAdmin: ToolPolicy = {
  capability: "admin",
  destructive: true,
  idempotent: true,
  apiChannel: "stable",
};

const previewRead: ToolPolicy = { ...read, apiChannel: "preview" };
const previewAdmin: ToolPolicy = { ...admin, apiChannel: "preview" };
const previewDestructiveAdmin: ToolPolicy = {
  ...destructiveAdmin,
  apiChannel: "preview",
};
const legacyRead: ToolPolicy = { ...read, apiChannel: "legacy" };
const legacyWrite: ToolPolicy = { ...write, apiChannel: "legacy" };
const legacyAdmin: ToolPolicy = { ...admin, apiChannel: "legacy" };
const legacyDestructiveAdmin: ToolPolicy = {
  ...destructiveAdmin,
  apiChannel: "legacy",
};
const legacyDestructiveWrite: ToolPolicy = {
  ...destructiveWrite,
  apiChannel: "legacy",
};

export const TOOL_POLICIES = {
  events_list: read,
  provider_enable: idempotentAdmin,
  provider_delete: destructiveAdmin,
  provider_info: read,
  attachments_list: read,
  attachments_size: read,
  attachments_create: write,
  attachments_redirect: exportData,
  attachments_download: exportData,
  attachments_delete: destructiveWrite,
  revisions_list: read,
  revisions_info: read,
  documents_list: read,
  documents_info: read,
  documents_search: read,
  documents_search_titles: read,
  documents_create: write,
  documents_update: idempotentWrite,
  documents_delete: destructiveWrite,
  documents_archive: idempotentWrite,
  documents_restore: idempotentWrite,
  documents_move: idempotentWrite,
  documents_copy: write,
  documents_drafts: read,
  documents_viewed: read,
  documents_unpublish: idempotentWrite,
  documents_users: legacyRead,
  documents_add_user: legacyAdmin,
  documents_remove_user: legacyDestructiveAdmin,
  documents_children: legacyRead,
  documents_import: write,
  documents_export: exportData,
  documents_starred: read,
  documents_pinned: read,
  documents_templatize: idempotentWrite,
  documents_star: idempotentWrite,
  documents_unstar: idempotentWrite,
  documents_pin: idempotentWrite,
  documents_unpin: idempotentWrite,
  collections_list: read,
  collections_info: read,
  collections_create: write,
  collections_update: idempotentWrite,
  collections_delete: destructiveAdmin,
  collections_documents: read,
  collections_add_user: admin,
  collections_remove_user: destructiveAdmin,
  collections_memberships: read,
  collections_export: exportData,
  collections_add_group: admin,
  collections_remove_group: destructiveAdmin,
  collections_group_memberships: read,
  collections_export_all: exportData,
  users_list: read,
  users_info: read,
  users_create: legacyAdmin,
  users_suspend: idempotentAdmin,
  users_activate: idempotentAdmin,
  users_update: idempotentWrite,
  users_promote: idempotentAdmin,
  users_demote: idempotentAdmin,
  users_delete: destructiveAdmin,
  stars_list: legacyRead,
  stars_create: legacyWrite,
  stars_delete: legacyDestructiveWrite,
  views_list: read,
  views_create: write,
  auth_info: read,
  auth_config: read,
  loop_teams: read,
  loop_channels: read,
  loop_commands: admin,
  loop_post: admin,
  telegram_commands: admin,
  telegram_post: admin,
  ldap_ping: admin,
  ldap_create: admin,
  ldap_login: admin,
  comments_list: read,
  comments_create: write,
  comments_update: idempotentWrite,
  comments_delete: destructiveWrite,
  comments_resolve: idempotentWrite,
  comments_info: read,
  comments_thread: read,
  sync_blocks_create: write,
  sync_blocks_delete: destructiveWrite,
  sync_blocks_list: read,
  sync_blocks_list_inserts: read,
  subscriptions_create: write,
  subscriptions_info: read,
  subscriptions_delete: destructiveWrite,
  file_operations_info: read,
  file_operations_redirect: exportData,
  file_operations_download: exportData,
  file_operations_list: read,
  database_rows_list: read,
  database_transaction: write,
  share_passwords_list: previewRead,
  share_passwords_create: previewAdmin,
  share_passwords_set: previewAdmin,
  share_passwords_delete_all: previewDestructiveAdmin,
  share_passwords_delete: previewDestructiveAdmin,
  groups_list: read,
  groups_info: read,
  groups_create: admin,
  groups_update: idempotentAdmin,
  groups_delete: destructiveAdmin,
  groups_memberships: read,
  groups_add_user: admin,
  groups_remove_user: destructiveAdmin,
  shares_list: read,
  shares_info: read,
  shares_create: admin,
  shares_revoke: destructiveAdmin,
  shares_update: idempotentAdmin,
} satisfies Record<string, ToolPolicy>;

export type YonoteToolName = keyof typeof TOOL_POLICIES;

const PROFILE_CAPABILITIES: Record<ToolProfile, ReadonlySet<ToolCapability>> = {
  readonly: new Set(["read"]),
  export: new Set(["read", "export"]),
  editor: new Set(["read", "export", "write"]),
  admin: new Set(["read", "export", "write", "admin"]),
};

export interface ToolFilter {
  profile: ToolProfile;
  apiChannel: ToolApiChannel;
  enabledTools?: ReadonlySet<string>;
  disabledTools?: ReadonlySet<string>;
}

export function isToolEnabled(
  name: YonoteToolName,
  filter: ToolFilter,
): boolean {
  const policy = TOOL_POLICIES[name];
  if (!PROFILE_CAPABILITIES[filter.profile].has(policy.capability)) {
    return false;
  }
  if (!API_CHANNELS[filter.apiChannel].has(policy.apiChannel)) {
    return false;
  }
  if (filter.enabledTools?.size && !filter.enabledTools.has(name)) {
    return false;
  }
  return !filter.disabledTools?.has(name);
}

const API_CHANNELS: Record<ToolApiChannel, ReadonlySet<ToolApiChannel>> = {
  stable: new Set(["stable"]),
  preview: new Set(["stable", "preview"]),
  legacy: new Set(["stable", "preview", "legacy"]),
};
