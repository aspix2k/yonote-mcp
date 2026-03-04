import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerFileOperationTools } from "../../tools/file-operations.js";
import type { YonoteClient } from "../../api-client.js";

describe("file operation tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerFileOperationTools, client);
  });

  it("registers 3 tools", () => {
    expect(tools).toHaveLength(3);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "file_operations_info",
      "file_operations_redirect",
      "file_operations_list",
    ]);
  });

  const endpointMap: Record<string, string> = {
    file_operations_info: "fileOperations.info",
    file_operations_redirect: "fileOperations.redirect",
    file_operations_list: "fileOperations.list",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("file_operations_list passes type", async () => {
    const handler = getToolHandler(tools, "file_operations_list");
    await handler({ type: "export", limit: 10 });
    expect(client.request).toHaveBeenCalledWith("fileOperations.list", {
      type: "export",
      limit: 10,
    });
  });
});
