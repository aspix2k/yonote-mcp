# Tools

The server currently defines 116 tools. MCP `tools/list` is the canonical
machine-readable reference and includes each tool's input schema and safety
annotations.

## Profiles

| Profile    | Stable tools | Capabilities                                                      |
| ---------- | -----------: | ----------------------------------------------------------------- |
| `readonly` |           40 | Read and search Yonote data                                       |
| `export`   |           47 | Read plus export and local download                               |
| `editor`   |           76 | Export plus content changes                                       |
| `admin`    |          103 | All capabilities, including membership and destructive operations |

Profiles are cumulative. Destructive tools are only present in `editor` or
`admin`, depending on their scope.

## API channels

| Channel   | Tools | Purpose                                                                      |
| --------- | ----: | ---------------------------------------------------------------------------- |
| `stable`  |   103 | All 100 published API v1 operations plus three local helpers; default        |
| `preview` |   108 | Stable plus five documented API v2 preview tools                             |
| `legacy`  |   116 | Preview plus eight undocumented compatibility tools from the upstream server |

Legacy tools are retained for existing installations but are not claimed to be
part of Yonote's public API contract.

API availability can also depend on the Yonote deployment, enabled
integrations, and plan. When an operation is unavailable, the server returns
Yonote's error unchanged. Use `--enable-tools` to keep the catalog focused on
the operations available in your workspace.

## Groups

| Group                     | Count |
| ------------------------- | ----: |
| Documents                 |    27 |
| Collections               |    14 |
| Users                     |     9 |
| Groups                    |     8 |
| Comments                  |     7 |
| Integrations              |     6 |
| Attachments               |     6 |
| Shares                    |     5 |
| Share passwords (preview) |     5 |
| File operations           |     4 |
| Sync blocks               |     4 |
| Providers                 |     3 |
| LDAP                      |     3 |
| Stars (legacy)            |     3 |
| Subscriptions             |     3 |
| Auth                      |     2 |
| Database                  |     2 |
| Revisions                 |     2 |
| Views                     |     2 |
| Events                    |     1 |

Every tool carries MCP `readOnlyHint`, `destructiveHint`, `idempotentHint`, and
`openWorldHint` annotations derived from a central policy table.

Use `--enable-tools` to expose a smaller task-specific catalog. An allow-list
cannot elevate the selected profile or API channel.
