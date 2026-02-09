import { vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { YonoteClient } from "../api-client.js";

export function createMockClient(response: unknown = { ok: true }): YonoteClient {
  const client = new YonoteClient("test-token", "https://test.yonote.ru/api");
  client.request = vi.fn().mockResolvedValue(response);
  return client;
}

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
}>;

interface RegisteredTool {
  name: string;
  description: string;
  handler: ToolHandler;
}

export function collectTools(
  registerFn: (server: McpServer, client: YonoteClient) => void,
  client: YonoteClient,
): RegisteredTool[] {
  const tools: RegisteredTool[] = [];

  const mockServer = {
    tool: (name: string, description: string, schema: unknown, handler: ToolHandler) => {
      tools.push({ name, description, handler });
    },
  } as unknown as McpServer;

  registerFn(mockServer, client);
  return tools;
}

export function getToolHandler(
  tools: RegisteredTool[],
  name: string,
): ToolHandler {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool "${name}" not found. Available: ${tools.map((t) => t.name).join(", ")}`);
  }
  return tool.handler;
}
