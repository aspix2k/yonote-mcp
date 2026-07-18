# yonote-mcp

[![CI](https://github.com/aspix2k/yonote-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/aspix2k/yonote-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/yonote-mcp)](https://www.npmjs.com/package/yonote-mcp)
[![Node.js 22+](https://img.shields.io/badge/node-%3E%3D22-339933)](https://nodejs.org/)
[![GPL-2.0](https://img.shields.io/github/license/aspix2k/yonote-mcp)](LICENSE)

An MCP server for [Yonote](https://yonote.ru). It works with Codex, Claude Code,
Cursor, and any other client that supports MCP over stdio or Streamable HTTP.
This is a community project and is not affiliated with or endorsed by Yonote.

- all 105 operations in Yonote's published OpenAPI document are covered
- opt-in API v2 preview and legacy compatibility tools
- least-privilege `readonly`, `export`, `editor`, and `admin` profiles
- bounded file import and export directories
- retries, timeouts, structured errors, and MCP tool annotations
- localhost-only HTTP by default, with Host, Origin, and bearer-token checks

## Quick start

Requires Node.js 22 or newer and a Yonote API key. Create a key as described in
the [official API documentation](https://yonote.ru/developers), then store it in
a file readable only by your user. Yonote API keys have full access to workspace
documents; treat them as passwords.

```bash
mkdir -p ~/.config/yonote-mcp
chmod 700 ~/.config/yonote-mcp
printf '%s\n' 'YOUR_YONOTE_TOKEN' > ~/.config/yonote-mcp/token
chmod 600 ~/.config/yonote-mcp/token
```

Use absolute paths in client configuration.

### Codex

Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.yonote]
command = "npx"
args = [
  "-y",
  "yonote-mcp@1.0.1",
  "--token-file",
  "/absolute/path/to/token",
  "--project",
  "your-project"
]
```

### Claude Code

```bash
claude mcp add yonote --scope user -- \
  npx -y "yonote-mcp@1.0.1" \
  --token-file /absolute/path/to/token \
  --project your-project
```

### JSON-based clients

```json
{
  "mcpServers": {
    "yonote": {
      "command": "npx",
      "args": [
        "-y",
        "yonote-mcp@1.0.1",
        "--token-file",
        "/absolute/path/to/token",
        "--project",
        "your-project"
      ]
    }
  }
}
```

The default configuration exposes 39 stable read operations. The selected MCP
profile limits which tools an agent can call, but does not reduce the
permissions of the underlying Yonote API key. Restart the MCP client after
changing its configuration.

## Focused knowledge setup

For search and Q&A over a knowledge base, a six-tool catalog is often enough:

```text
--enable-tools collections_list,collections_info,documents_list,documents_info,documents_search,documents_search_titles
```

Add these two arguments to any client configuration as
`"--enable-tools", "..."`. Remove the allow-list when the agent needs other
read-only workspace data.

## Export a workspace

Enable the export profile and give the server a dedicated output directory:

```text
--profile export --export-dir /absolute/path/to/yonote-exports
```

This exposes collection/document export, signed-download, and local-download
tools in addition to read operations. Existing files are never overwritten.
Only export content you are authorized to copy; Yonote permissions still apply.

## Configuration

See [Configuration](docs/configuration.md) for all arguments and environment
variables, [Tools](docs/tools.md) for profiles and API channels, and
[HTTP deployment](docs/http.md) for remote use.

## Development

```bash
git clone https://github.com/aspix2k/yonote-mcp.git
cd yonote-mcp
npm ci
npm run check
npm run build
```

`npm run openapi:check` compares the implementation with Yonote's current
official OpenAPI document. `npm run test:mutation` checks the core test suite
against injected faults. See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a
pull request.

## License

[GPL-2.0-only](LICENSE), inherited from the upstream project.
