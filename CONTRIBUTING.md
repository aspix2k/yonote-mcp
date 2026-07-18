# Contributing

Use Node.js 20 or newer.

```bash
npm ci
npm run check
npm run build
```

For changes to policy or request handling, also run `npm run test:mutation`.

Changes to tools must update the central policy in `src/tool-policy.ts` and add
tests for the endpoint, input mapping, profile, API channel, and MCP annotations.

Run `npm run openapi:check` when changing Yonote API coverage. It reads the
current official OpenAPI document and therefore requires network access.

To inspect the built server with the official MCP Inspector:

```bash
YONOTE_API_TOKEN=test-token npx -y @modelcontextprotocol/inspector@0.21.2 \
  --cli node dist/index.js --method tools/list
```

Keep pull requests focused. Do not commit tokens, `.env` files, exports,
coverage output, build output, or unrelated generated files.
