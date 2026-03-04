import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";

const textResult = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

export function registerDatabaseTools(server: McpServer, client: YonoteClient) {
  server.tool(
    "database_rows_list",
    "List rows in a database document.",
    {
      parentDocumentId: z.string().describe("Parent document ID of the database"),
      filter: z.any().optional().describe("Filter criteria"),
      propertyType: z.string().optional().describe("Property type to filter by"),
      orderBy: z.string().optional().describe("Field to order by"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
    },
    async (params) =>
      textResult(await client.request("database.rows.list", params)),
  );

  server.tool(
    "database_transaction",
    "Execute a database transaction with multiple changes.",
    {
      changes: z.array(z.any()).describe("Array of changes to apply"),
    },
    async (params) =>
      textResult(await client.request("database/transaction", params)),
  );
}
