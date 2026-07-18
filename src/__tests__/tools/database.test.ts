import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, collectTools, getToolHandler } from "../helpers.js";
import { registerDatabaseTools } from "../../tools/database.js";
import type { YonoteClient } from "../../api-client.js";

describe("database tools", () => {
  let client: YonoteClient;
  let tools: ReturnType<typeof collectTools>;

  beforeEach(() => {
    client = createMockClient({ data: [] });
    tools = collectTools(registerDatabaseTools, client);
  });

  it("registers 2 tools", () => {
    expect(tools).toHaveLength(2);
  });

  it("registers tools with correct names", () => {
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["database_rows_list", "database_transaction"]);
  });

  const endpointMap: Record<string, string> = {
    database_rows_list: "database.rows.list",
  };

  for (const [toolName, endpoint] of Object.entries(endpointMap)) {
    it(`${toolName} calls ${endpoint}`, async () => {
      const handler = getToolHandler(tools, toolName);
      await handler({});
      expect(client.request).toHaveBeenCalledWith(endpoint, {});
    });
  }

  it("database_rows_list passes parentDocumentId", async () => {
    const handler = getToolHandler(tools, "database_rows_list");
    await handler({ parentDocumentId: "doc-1", direction: "ASC" });
    expect(client.request).toHaveBeenCalledWith("database.rows.list", {
      parentDocumentId: "doc-1",
      direction: "ASC",
    });
  });

  it("database_transaction unwraps changes grouped by database ID", async () => {
    const handler = getToolHandler(tools, "database_transaction");
    const transactions = {
      "database-1": [{ path: "rows.row-1.values", op: "update", val: {} }],
    };
    await handler({ transactions });
    expect(client.request).toHaveBeenCalledWith(
      "database/transaction",
      transactions,
    );
  });
});
