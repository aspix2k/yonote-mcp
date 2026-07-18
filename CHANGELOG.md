# Changelog

## 1.0.1 - 2026-07-19

- Fixes CLI startup through npm bin links.
- Adds an installed-package smoke test to CI.
- Supports maintained Node.js releases: 22, 24, and 26.
- Updates GitHub Actions to their current Node 24-based releases.

## 1.0.0 - 2026-07-19

- Covers all published Yonote operations, including the API v2 share-password
  preview, with schemas aligned to the OpenAPI contract.
- Adds least-privilege profiles, API channels, safety annotations, structured
  errors, bounded imports, and non-overwriting downloads.
- Supports stdio and stateless Streamable HTTP with secure local defaults.
- Adds timeouts, safe retries, URL validation, token redaction, and binary
  responses to the API client.
- Updates the MCP SDK and removes known production dependency vulnerabilities.
- Adds client setup docs, CI, Docker, OpenAPI drift checks, coverage, and
  mutation testing.
