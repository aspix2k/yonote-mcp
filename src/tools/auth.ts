import type { ToolRegistrar } from "../tool-registry.js";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerAuthTools(server: ToolRegistrar, client: YonoteClient) {
  server.tool(
    "auth_info",
    "Get authentication details for the current API key (current user, team info).",
    {},
    async () => textResult(await client.request("auth.info")),
  );

  server.tool(
    "auth_config",
    "Get authentication configuration for the workspace.",
    {},
    async () => textResult(await client.request("auth.config")),
  );
}
