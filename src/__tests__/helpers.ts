import { vi } from "vitest";
import { YonoteClient } from "../api-client.js";
import type { ToolRegistrar, ToolResult } from "../tool-registry.js";
import type { YonoteToolName } from "../tool-policy.js";

export function createMockClient(
  response: unknown = { ok: true },
): YonoteClient {
  const client = new YonoteClient("test-token", "https://test.yonote.ru/api");
  client.request = vi.fn().mockResolvedValue(response);
  client.getRedirect = vi
    .fn()
    .mockResolvedValue("https://files.example/download");
  client.download = vi.fn().mockResolvedValue({
    path: "/exports/file.bin",
    size: 4,
    contentType: "application/octet-stream",
  });
  client.importDocument = vi.fn().mockResolvedValue(response);
  client.requestMultipart = vi.fn().mockResolvedValue(response);
  return client;
}

type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

interface RegisteredTool {
  name: YonoteToolName;
  description: string;
  handler: ToolHandler;
}

export function collectTools(
  registerFn: (server: ToolRegistrar, client: YonoteClient) => void,
  client: YonoteClient,
): RegisteredTool[] {
  const tools: RegisteredTool[] = [];

  const mockServer = {
    tool: (
      name: YonoteToolName,
      description: string,
      schema: unknown,
      handler: ToolHandler,
    ) => {
      tools.push({ name, description, handler });
    },
  } as unknown as ToolRegistrar;

  registerFn(mockServer, client);
  return tools;
}

export function getToolHandler(
  tools: RegisteredTool[],
  name: string,
): ToolHandler {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(
      `Tool "${name}" not found. Available: ${tools.map((t) => t.name).join(", ")}`,
    );
  }
  return tool.handler;
}
