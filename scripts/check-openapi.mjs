import { readFile, readdir } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../dist/index.js";
import { TOOL_POLICIES } from "../dist/tool-policy.js";

const OPENAPI_URL = "https://yonote.ru/openapi-3.json";
const LOCAL_TOOLS = new Set([
  "attachments_download",
  "collections_documents",
  "file_operations_download",
]);
const toolsDirectory = new URL("../src/tools/", import.meta.url);
const toolOperations = await readToolOperations();

const response = await fetch(OPENAPI_URL, {
  headers: { Accept: "application/json" },
});
if (!response.ok) {
  throw new Error(`OpenAPI download failed with HTTP ${response.status}`);
}
const specification = await response.json();
const documentedOperations = readDocumentedOperations(specification);

const supportedOperations = new Set(
  [...toolOperations.values()].map(({ method, path }) => `${method} ${path}`),
);
const missingOperations = [...documentedOperations.keys()].filter(
  (operation) => !supportedOperations.has(operation),
);
if (missingOperations.length) {
  fail(
    "Yonote operations missing from the MCP server:",
    missingOperations.map((operation) => `- ${operation}`),
  );
}

const tools = await listTools();
const schemaErrors = [];
for (const tool of tools) {
  if (LOCAL_TOOLS.has(tool.name)) continue;
  const operation = toolOperations.get(tool.name);
  if (!operation) {
    schemaErrors.push(`${tool.name}: no Yonote operation mapping`);
    continue;
  }

  const documented = documentedOperations.get(
    `${operation.method} ${operation.path}`,
  );
  if (!documented) {
    schemaErrors.push(
      `${tool.name}: ${operation.method} ${operation.path} is not documented`,
    );
    continue;
  }

  schemaErrors.push(
    ...compareToolSchema(tool, documented, specification).map(
      (error) => `${tool.name}: ${error}`,
    ),
  );
}

if (schemaErrors.length) {
  fail(
    "Yonote tool schema drift detected:",
    schemaErrors.map((it) => `- ${it}`),
  );
} else if (!missingOperations.length) {
  console.log(
    `All ${documentedOperations.size} documented Yonote operations and ${tools.length} public tool schemas are covered.`,
  );
}

async function readToolOperations() {
  const operations = new Map();
  for (const filename of await readdir(toolsDirectory)) {
    if (!filename.endsWith(".ts")) continue;
    const source = await readFile(new URL(filename, toolsDirectory), "utf8");
    const registrations = [...source.matchAll(/server\.tool\(\s*"([^"]+)"/g)];
    for (let index = 0; index < registrations.length; index++) {
      const registration = registrations[index];
      const end = registrations[index + 1]?.index ?? source.length;
      const block = source.slice(registration.index, end);
      const endpoint = block.match(
        /client\.(?:request|getRedirect|download|requestMultipart)\(\s*"([^"]+)"/,
      )?.[1];
      if (endpoint) {
        operations.set(registration[1], {
          method: "POST",
          path: `/${endpoint}`,
        });
      } else if (block.includes("client.importDocument")) {
        operations.set(registration[1], {
          method: "POST",
          path: "/documents.import",
        });
      }
    }
  }

  operations.set("share_passwords_list", {
    method: "GET",
    path: "/v2/shares/{shareId}/passwords",
  });
  operations.set("share_passwords_create", {
    method: "POST",
    path: "/v2/shares/{shareId}/passwords",
  });
  operations.set("share_passwords_set", {
    method: "PUT",
    path: "/v2/shares/{shareId}/passwords",
  });
  operations.set("share_passwords_delete_all", {
    method: "DELETE",
    path: "/v2/shares/{shareId}/passwords",
  });
  operations.set("share_passwords_delete", {
    method: "DELETE",
    path: "/v2/shares/{shareId}/passwords/{sharePasswordId}",
  });

  return operations;
}

function readDocumentedOperations(specification) {
  const operations = new Map();
  for (const [path, item] of Object.entries(specification.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      if (item[method]) {
        operations.set(`${method.toUpperCase()} ${path}`, {
          path,
          item: item[method],
          parameters: [
            ...(item.parameters ?? []),
            ...(item[method].parameters ?? []),
          ],
        });
      }
    }
  }
  return operations;
}

async function listTools() {
  const server = createMcpServer({
    token: "contract-check",
    baseUrl: "https://app.yonote.ru/api",
    transport: "stdio",
    host: "127.0.0.1",
    port: 3000,
    profile: "admin",
    apiChannel: "preview",
    enabledTools: new Set(),
    disabledTools: new Set(),
    timeoutMs: 30_000,
    maxRetries: 0,
    maxDownloadBytes: 512 * 1024 * 1024,
    maxImportBytes: 50 * 1024 * 1024,
    allowInsecureHttp: false,
    allowedHosts: [],
    allowedOrigins: [],
    warnings: [],
  });
  const client = new Client({ name: "openapi-check", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const result = await client.listTools();
  await client.close();
  await server.close();

  return result.tools.filter(
    (tool) => TOOL_POLICIES[tool.name]?.apiChannel !== "legacy",
  );
}

function compareToolSchema(tool, operation, specification) {
  const documented = operationSchema(operation, specification);
  const actual = tool.inputSchema;
  const documentedProperties = { ...documented.properties };
  const documentedRequired = new Set(documented.required);
  const actualProperties = actual.properties ?? {};
  const actualRequired = new Set(actual.required ?? []);

  applyLocalAdapters(
    tool.name,
    documentedProperties,
    documentedRequired,
    specification,
  );

  const errors = [];
  for (const name of Object.keys(documentedProperties)) {
    if (!(name in actualProperties)) {
      errors.push(`missing documented field ${name}`);
    }
  }
  for (const name of Object.keys(actualProperties)) {
    if (!(name in documentedProperties) && !documentedRequired.has(name)) {
      errors.push(`field ${name} is not documented`);
    }
  }
  for (const name of documentedRequired) {
    if (name in documentedProperties && !actualRequired.has(name)) {
      errors.push(`documented required field ${name} is optional`);
    }
  }
  for (const [name, documentedProperty] of Object.entries(
    documentedProperties,
  )) {
    const actualProperty = actualProperties[name];
    if (!actualProperty) continue;
    const documentedType = schemaType(documentedProperty, specification);
    const actualType = schemaType(actualProperty, specification);
    if (documentedType && actualType && documentedType !== actualType) {
      errors.push(
        `field ${name} has type ${actualType}; documented type is ${documentedType}`,
      );
    }
    const documentedEnum = enumValues(documentedProperty);
    const actualEnum = enumValues(actualProperty);
    if (
      documentedEnum &&
      JSON.stringify(documentedEnum) !== JSON.stringify(actualEnum)
    ) {
      errors.push(
        `field ${name} must use documented values ${documentedEnum.join(", ")}`,
      );
    }
  }
  return errors;
}

function operationSchema(operation, specification) {
  const content = operation.item.requestBody?.content ?? {};
  const body = resolveSchema(
    content["application/json"]?.schema ??
      content["multipart/form-data"]?.schema,
    specification,
  );
  const properties = { ...(body.properties ?? {}) };
  const required = [...(body.required ?? [])];

  for (const unresolvedParameter of operation.parameters) {
    const parameter = unresolvedParameter.$ref
      ? specification.components.parameters[
          unresolvedParameter.$ref.split("/").pop()
        ]
      : unresolvedParameter;
    if (parameter.in !== "path" && parameter.in !== "query") continue;
    properties[parameter.name] = parameter.schema ?? {};
    if (parameter.required) required.push(parameter.name);
  }
  return {
    properties,
    required,
    additionalProperties: body.additionalProperties,
  };
}

function resolveSchema(schema, specification) {
  if (!schema) return {};
  if (schema.$ref) {
    return resolveSchema(
      specification.components.schemas[schema.$ref.split("/").pop()],
      specification,
    );
  }
  const parts = (schema.allOf ?? []).map((part) =>
    resolveSchema(part, specification),
  );
  return {
    ...schema,
    properties: Object.assign(
      {},
      ...parts.map((part) => part.properties ?? {}),
      schema.properties ?? {},
    ),
    required: [
      ...new Set([
        ...(schema.required ?? []),
        ...parts.flatMap((part) => part.required ?? []),
      ]),
    ],
  };
}

function applyLocalAdapters(toolName, properties, required, specification) {
  if (toolName === "documents_import") {
    properties.file = { type: "string" };
    required.add("file");
  }
  if (toolName === "database_transaction") {
    for (const name of Object.keys(properties)) delete properties[name];
    properties.transactions = { type: "object" };
    required.add("transactions");
  }
  if (toolName === "ldap_ping" || toolName === "ldap_create") {
    delete properties.certificate;
    properties.certificateFile = { type: "string" };
    required.delete("certificate");
  }
  if (toolName === "groups_memberships") {
    properties.id = { type: "string" };
  }
  if (toolName === "revisions_list") {
    properties.documentId = { type: "string" };
    required.add("documentId");
  }

  for (const name of [...required]) {
    if (!(name in properties)) required.delete(name);
  }

  for (const [name, schema] of Object.entries(properties)) {
    properties[name] = resolveSchema(schema, specification);
  }
}

function schemaType(schema, specification) {
  return resolveSchema(schema, specification).type;
}

function enumValues(schema) {
  if (schema.enum) return schema.enum;
  if (schema.const !== undefined) return [schema.const];
  return undefined;
}

function fail(title, lines) {
  console.error(title);
  for (const line of lines) console.error(line);
  process.exitCode = 1;
}
