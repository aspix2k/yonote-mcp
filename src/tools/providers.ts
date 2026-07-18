import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerProviderTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "provider_enable",
    "Enable or disable an authentication provider.",
    {
      isActive: z.boolean().describe("Whether provider is active"),
      type: z.string().describe("Provider type"),
    },
    async (params) =>
      textResult(await client.request("provider.enable", params)),
  );

  server.tool(
    "provider_delete",
    "Delete an authentication provider.",
    {
      type: z.string().describe("Provider type"),
    },
    async (params) =>
      textResult(await client.request("provider.delete", params)),
  );

  server.tool(
    "provider_info",
    "Get authentication provider information.",
    {},
    async (params) => textResult(await client.request("provider.info", params)),
  );
}
