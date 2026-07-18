import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  ShapeOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import { YonoteApiError, YonoteClientError } from "./api-client.js";
import {
  isToolEnabled,
  TOOL_POLICIES,
  type ToolFilter,
  type YonoteToolName,
} from "./tool-policy.js";
import { textResult } from "./tool-result.js";

export type ToolResult = CallToolResult;

type ToolHandler<Shape extends ZodRawShapeCompat> = (
  params: ShapeOutput<Shape>,
) => Promise<ToolResult>;

export interface ToolRegistrar {
  tool<Shape extends ZodRawShapeCompat>(
    name: YonoteToolName,
    description: string,
    schema: Shape,
    handler: ToolHandler<Shape>,
  ): void;
}

export class YonoteToolRegistry implements ToolRegistrar {
  constructor(
    private readonly server: McpServer,
    private readonly filter: ToolFilter,
  ) {}

  tool<Shape extends ZodRawShapeCompat>(
    name: YonoteToolName,
    description: string,
    schema: Shape,
    handler: ToolHandler<Shape>,
  ): void {
    if (!isToolEnabled(name, this.filter)) {
      return;
    }

    const policy = TOOL_POLICIES[name];
    const annotations: ToolAnnotations = {
      title: name
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(" "),
      readOnlyHint: policy.capability === "read",
      destructiveHint: policy.destructive,
      idempotentHint: policy.idempotent,
      openWorldHint: true,
    };

    const inputSchema: ZodRawShapeCompat = schema;
    this.server.registerTool(
      name,
      { description, inputSchema, annotations },
      async (params) => {
        try {
          return await handler(params as ShapeOutput<Shape>);
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  }
}

function errorResult(error: unknown): ToolResult {
  if (error instanceof YonoteApiError) {
    return {
      isError: true,
      ...textResult({
        error: error.errorId,
        message: error.publicMessage,
        status: error.status,
      }),
    };
  }

  if (error instanceof YonoteClientError) {
    return {
      isError: true,
      ...textResult({ error: error.errorId, message: error.publicMessage }),
    };
  }

  return {
    isError: true,
    ...textResult({
      error: "internal_error",
      message: "Yonote request failed",
    }),
  };
}
