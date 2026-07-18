# Streamable HTTP

Use stdio for a single local user. HTTP is intended for a controlled network or
a deployment behind an HTTPS reverse proxy.

## Localhost

```bash
YONOTE_API_TOKEN_FILE=/run/secrets/yonote-token \
MCP_TRANSPORT=http \
npx -y "yonote-mcp@1.0.1"
```

The endpoint is `http://127.0.0.1:3000/mcp`; health is available at `/health`.

## Non-loopback binding

The server refuses a non-loopback bind unless both MCP authentication and Host
validation are configured:

```bash
YONOTE_API_TOKEN_FILE=/run/secrets/yonote-token \
MCP_TRANSPORT=http \
MCP_HOST=0.0.0.0 \
MCP_PORT=3000 \
MCP_HTTP_BEARER_TOKEN='replace-with-a-long-random-value' \
MCP_ALLOWED_HOSTS=mcp.example.com \
node dist/index.js
```

Put TLS at the reverse proxy. Pass the MCP bearer token as an `Authorization:
Bearer ...` header from clients that support static HTTP credentials.

Browser Origins are rejected by default. Add exact origins only when needed:

```text
MCP_ALLOWED_ORIGINS=https://client.example.com
```

This static bearer mode is suitable for a private deployment. Public or
multi-user services should terminate OAuth and per-user authorization in a
trusted gateway or implement the MCP authorization specification.

## Docker

```bash
docker build -t yonote-mcp .
docker run --rm -p 3000:3000 \
  --env-file /absolute/path/to/yonote-mcp.env \
  yonote-mcp
```

The container runs as an unprivileged user and requires the same non-loopback
security variables shown above.
