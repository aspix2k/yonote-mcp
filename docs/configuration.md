# Configuration

CLI arguments override environment variables. `--project acme` resolves to
`https://acme.yonote.ru/api`; `--base-url` overrides that URL.

| CLI                       | Environment                  | Default            |
| ------------------------- | ---------------------------- | ------------------ |
| `--token-file PATH`       | `YONOTE_API_TOKEN_FILE`      | —                  |
| `--project NAME`          | `YONOTE_PROJECT`             | `app`              |
| `--base-url URL`          | `YONOTE_API_BASE_URL`        | project URL        |
| `--transport stdio\|http` | `MCP_TRANSPORT`              | `stdio`            |
| `--host HOST`             | `MCP_HOST`                   | `127.0.0.1`        |
| `--port PORT`             | `MCP_PORT`                   | `3000`             |
| `--profile PROFILE`       | `YONOTE_PROFILE`             | `readonly`         |
| `--api-channel CHANNEL`   | `YONOTE_API_CHANNEL`         | `stable`           |
| `--enable-tools NAMES`    | `YONOTE_ENABLE_TOOLS`        | all allowed        |
| `--disable-tools NAMES`   | `YONOTE_DISABLE_TOOLS`       | none               |
| `--timeout-ms MS`         | `YONOTE_TIMEOUT_MS`          | `30000`            |
| `--max-retries COUNT`     | `YONOTE_MAX_RETRIES`         | `2`                |
| `--export-dir PATH`       | `YONOTE_EXPORT_DIR`          | disabled           |
| `--max-download-bytes N`  | `YONOTE_MAX_DOWNLOAD_BYTES`  | `536870912`        |
| `--import-dir PATH`       | `YONOTE_IMPORT_DIR`          | disabled           |
| `--max-import-bytes N`    | `YONOTE_MAX_IMPORT_BYTES`    | `52428800`         |
| `--allowed-hosts NAMES`   | `MCP_ALLOWED_HOSTS`          | loopback only      |
| `--allowed-origins URLS`  | `MCP_ALLOWED_ORIGINS`        | no browser origins |
| `--allow-insecure-http`   | `YONOTE_ALLOW_INSECURE_HTTP` | `false`            |

`NAMES` and `URLS` are comma-separated. `--enable-tools` is an allow-list but
cannot elevate the selected profile or API channel. The deny-list is applied
last.

## Secrets

Token lookup order:

1. `--token` (supported for compatibility, not recommended)
2. `--token-file`
3. `YONOTE_API_TOKEN`
4. `YONOTE_API_TOKEN_FILE`

`--token` can be visible in process listings. Prefer a protected token file or
an environment variable supplied by the MCP client or a secret manager.

Create API keys on the Yonote settings page. Yonote documents that an API key
has full access to workspace documents. A server profile limits the tools
exposed through MCP; it does not change the API key's Yonote permissions. Use a
dedicated key so it can be revoked independently.

For HTTP transport, `MCP_HTTP_BEARER_TOKEN` protects the MCP endpoint. It is
separate from the Yonote API token.

## File access

Import and download tools are unavailable until their directories are set.

- imports accept Markdown, plain text, HTML, and DOCX from the direct children
  of `YONOTE_IMPORT_DIR`;
- symlink and path traversal outside that directory are rejected;
- downloads are written with owner-only permissions;
- existing files are not overwritten;
- configured size limits are enforced before and after reading a response.

## Self-hosted Yonote

HTTPS is required by default:

```text
--base-url https://knowledge.example/api
```

Use `--allow-insecure-http` only for a trusted local development instance.

## Deprecated variables

`TRANSPORT` and `PORT` still work but emit a warning. Use `MCP_TRANSPORT` and
`MCP_PORT`.
