# Security policy

## Supported versions

Security fixes are applied to the latest release.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting for
this repository and include reproduction steps, affected configuration, and
the expected impact. Do not include real Yonote tokens or exported content.

## Deployment boundary

Yonote API keys have full access to workspace documents. Use a dedicated key so
it can be revoked independently. MCP profiles restrict the tools exposed by
this server, but they do not reduce the key's permissions inside Yonote. Keep
the default `readonly` profile unless another capability is required.

Remote deployments must use HTTPS, MCP authentication, Host validation, and
network access controls. See [docs/http.md](docs/http.md).
