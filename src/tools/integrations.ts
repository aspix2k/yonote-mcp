import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerIntegrationTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "loop_teams",
    "List available Loop teams.",
    {},
    async (params) =>
      textResult(await client.request("loop.teams", params)),
  );

  server.tool(
    "loop_channels",
    "List channels for a Loop team.",
    {
      teamId: z.string().describe("Team ID"),
    },
    async (params) =>
      textResult(await client.request("loop.channels", params)),
  );

  server.tool(
    "loop_commands",
    "List available Loop commands.",
    {},
    async (params) =>
      textResult(await client.request("loop.commands", params)),
  );

  server.tool(
    "loop_post",
    "Post a collection update to Loop.",
    {
      collectionId: z.string().describe("Collection ID"),
      channel: z.string().describe("Channel to post to"),
    },
    async (params) =>
      textResult(await client.request("loop.post", params)),
  );

  server.tool(
    "telegram_commands",
    "List available Telegram commands.",
    {
      group: z.string().optional().describe("Telegram group"),
    },
    async (params) =>
      textResult(await client.request("telegram.commands", params)),
  );

  server.tool(
    "telegram_post",
    "Post a collection update to Telegram.",
    {
      collectionId: z.string().describe("Collection ID"),
    },
    async (params) =>
      textResult(await client.request("telegram.post", params)),
  );
}
