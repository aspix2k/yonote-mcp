#!/usr/bin/env node

import { timingSafeEqual } from "node:crypto";
import { realpathSync } from "node:fs";
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { YonoteClient } from "./api-client.js";
import { parseArgs, type RuntimeConfig } from "./config.js";
import { YonoteToolRegistry } from "./tool-registry.js";
import { registerAttachmentTools } from "./tools/attachments.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerCollectionTools } from "./tools/collections.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerDatabaseTools } from "./tools/database.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerEventTools } from "./tools/events.js";
import { registerFileOperationTools } from "./tools/file-operations.js";
import { registerGroupTools } from "./tools/groups.js";
import { registerIntegrationTools } from "./tools/integrations.js";
import { registerLdapTools } from "./tools/ldap.js";
import { registerProviderTools } from "./tools/providers.js";
import { registerRevisionTools } from "./tools/revisions.js";
import { registerSharePasswordTools } from "./tools/share-passwords.js";
import { registerShareTools } from "./tools/shares.js";
import { registerStarTools } from "./tools/stars.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerSyncBlockTools } from "./tools/sync-blocks.js";
import { registerUserTools } from "./tools/users.js";
import { registerViewTools } from "./tools/views.js";

export const SERVER_VERSION = "1.0.1";
export { parseArgs } from "./config.js";

export function createMcpServer(config: RuntimeConfig): McpServer {
  const server = new McpServer({
    name: "yonote-mcp",
    version: SERVER_VERSION,
    websiteUrl: "https://github.com/aspix2k/yonote-mcp",
  });
  const client = new YonoteClient({
    token: config.token,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    exportDir: config.exportDir,
    maxDownloadBytes: config.maxDownloadBytes,
    importDir: config.importDir,
    maxImportBytes: config.maxImportBytes,
    allowInsecureHttp: config.allowInsecureHttp,
    userAgent: `yonote-mcp/${SERVER_VERSION}`,
  });
  const registry = new YonoteToolRegistry(server, {
    profile: config.profile,
    apiChannel: config.apiChannel,
    enabledTools: config.enabledTools,
    disabledTools: config.disabledTools,
  });

  registerDocumentTools(registry, client);
  registerCollectionTools(registry, client);
  registerUserTools(registry, client);
  registerCommentTools(registry, client);
  registerGroupTools(registry, client);
  registerShareTools(registry, client);
  registerStarTools(registry, client);
  registerRevisionTools(registry, client);
  registerEventTools(registry, client);
  registerViewTools(registry, client);
  registerAuthTools(registry, client);
  registerDatabaseTools(registry, client);
  registerAttachmentTools(registry, client);
  registerFileOperationTools(registry, client);
  registerSubscriptionTools(registry, client);
  registerSyncBlockTools(registry, client);
  registerIntegrationTools(registry, client);
  registerLdapTools(registry, client);
  registerProviderTools(registry, client);
  registerSharePasswordTools(registry, client);

  return server;
}

export async function startHttpServer(config: RuntimeConfig): Promise<Server> {
  const app = createMcpExpressApp({
    host: config.host,
    allowedHosts: config.allowedHosts.length
      ? [...config.allowedHosts]
      : undefined,
  });
  app.use("/mcp", originGuard(config.allowedOrigins));
  app.use("/mcp", bearerGuard(config.httpBearerToken));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      version: SERVER_VERSION,
      profile: config.profile,
      apiChannel: config.apiChannel,
    });
  });

  app.post("/mcp", async (request, response) => {
    const server = createMcpServer(config);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    response.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response, request.body);
    } catch {
      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return new Promise((resolve, reject) => {
    const httpServer = app.listen(config.port, config.host, () => {
      resolve(httpServer);
    });
    httpServer.once("error", reject);
  });
}

export async function main(
  argv: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): Promise<Server | void> {
  if (argv.includes("--help")) {
    process.stdout.write(helpText());
    return;
  }
  if (argv.includes("--version")) {
    process.stdout.write(`${SERVER_VERSION}\n`);
    return;
  }

  const config = parseArgs(argv, env);
  for (const warning of config.warnings) {
    console.error(`Warning: ${warning}`);
  }

  if (config.transport === "http") {
    const httpServer = await startHttpServer(config);
    const address = httpServer.address();
    const port =
      typeof address === "object" && address ? address.port : config.port;
    console.error(
      `Yonote MCP listening on http://${config.host}:${port}/mcp with ${config.profile} profile and ${config.apiChannel} API channel`,
    );
    return httpServer;
  }

  const server = createMcpServer(config);
  await server.connect(new StdioServerTransport());
}

function originGuard(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins);
  return (request: Request, response: Response, next: NextFunction): void => {
    const origin = request.header("origin");
    if (origin && !allowed.has(origin)) {
      response.status(403).json({ error: "origin_not_allowed" });
      return;
    }
    next();
  };
}

function bearerGuard(expectedToken: string | undefined) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!expectedToken) {
      next();
      return;
    }
    const authorization = request.header("authorization") ?? "";
    const prefix = "Bearer ";
    const received = authorization.startsWith(prefix)
      ? authorization.slice(prefix.length)
      : "";
    if (!secureEqual(received, expectedToken)) {
      response.setHeader("WWW-Authenticate", "Bearer");
      response.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  };
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function methodNotAllowed(_request: Request, response: Response): void {
  response.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed" },
    id: null,
  });
}

function helpText(): string {
  return (
    `yonote-mcp ${SERVER_VERSION}\n\n` +
    `Options:\n` +
    `  --token-file <path>\n` +
    `  --project <name>\n` +
    `  --base-url <url>\n` +
    `  --transport <stdio|http>\n` +
    `  --host <host>\n` +
    `  --port <port>\n` +
    `  --profile <readonly|export|editor|admin>\n` +
    `  --api-channel <stable|preview|legacy>\n` +
    `  --enable-tools <comma-separated names>\n` +
    `  --disable-tools <comma-separated names>\n` +
    `  --timeout-ms <milliseconds>\n` +
    `  --max-retries <count>\n` +
    `  --export-dir <path>\n` +
    `  --max-download-bytes <bytes>\n` +
    `  --import-dir <path>\n` +
    `  --max-import-bytes <bytes>\n` +
    `  --allowed-hosts <comma-separated hosts>\n` +
    `  --allowed-origins <comma-separated origins>\n` +
    `  --allow-insecure-http\n` +
    `  --help\n` +
    `  --version\n`
  );
}

const entryPoint = process.argv[1];
const isMainModule =
  entryPoint !== undefined &&
  realpathSync(entryPoint) === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to start Yonote MCP server: ${message}`);
    process.exitCode = 1;
  });
}
