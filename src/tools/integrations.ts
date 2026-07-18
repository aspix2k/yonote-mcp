import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

export function registerIntegrationTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool("loop_teams", "List available Loop teams.", {}, async (params) =>
    textResult(await client.request("loop.teams", params)),
  );

  server.tool(
    "loop_channels",
    "List channels available in the connected Loop namespace.",
    {},
    async (params) => textResult(await client.request("loop.channels", params)),
  );

  server.tool(
    "loop_commands",
    "Install the slash-command integration for a Loop team.",
    {
      team_id: z.string().describe("Loop team ID"),
    },
    async (params) => textResult(await client.request("loop.commands", params)),
  );

  server.tool(
    "loop_post",
    "Install collection-post integration for a Loop channel.",
    {
      collectionId: z.string().describe("Collection ID"),
      channel: z.string().describe("Channel to post to"),
    },
    async (params) => textResult(await client.request("loop.post", params)),
  );

  server.tool(
    "telegram_commands",
    "Get the Telegram URL that installs the commands integration.",
    {
      group: z
        .boolean()
        .optional()
        .describe("Install into a group chat instead of a private chat"),
    },
    async (params) =>
      textResult(await client.getRedirect("telegram.commands", params, false)),
  );

  server.tool(
    "telegram_post",
    "Get the Telegram URL that installs collection-post integration.",
    {
      collectionId: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.getRedirect("telegram.post", params, false)),
  );
}
