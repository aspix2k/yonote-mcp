import type { ToolRegistrar } from "../tool-registry.js";
import { z } from "zod";
import { YonoteClient } from "../api-client.js";
import { textResult } from "../tool-result.js";

const databaseFilter = z.object({
  filterValue: z
    .union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))])
    .optional()
    .describe("Value or range; omit for null checks"),
  filterOperation: z
    .enum([
      "IsEquals",
      "IsNotEqual",
      "StartsWith",
      "EndsWith",
      "Contains",
      "NotContains",
      "IsNotNull",
      "IsNull",
      "Greater",
      "Less",
      "Between",
    ])
    .describe("Comparison operator"),
  filterPropertyId: z.string().describe("Database property ID"),
});

const transactionRecord = z.object({
  path: z.string().describe("Path to the database element"),
  op: z.enum(["add", "update", "remove"]).describe("Operation type"),
  val: z.unknown().describe("New value, or null for removal"),
});

export function registerDatabaseTools(
  server: ToolRegistrar,
  client: YonoteClient,
) {
  server.tool(
    "database_rows_list",
    "List rows in a database document.",
    {
      parentDocumentId: z
        .string()
        .describe("Parent document ID of the database"),
      filter: z.array(databaseFilter).optional().describe("Filter criteria"),
      propertyType: z
        .string()
        .optional()
        .describe("Property type to filter by"),
      orderBy: z.string().optional().describe("Field to order by"),
      direction: z.enum(["ASC", "DESC"]).optional().describe("Sort direction"),
    },
    async (params) =>
      textResult(await client.request("database.rows.list", params)),
  );

  server.tool(
    "database_transaction",
    "Apply database changes grouped by database ID.",
    {
      transactions: z
        .record(z.string(), z.array(transactionRecord))
        .describe("Database ID to change records"),
    },
    async ({ transactions }) =>
      textResult(await client.request("database/transaction", transactions)),
  );
}
