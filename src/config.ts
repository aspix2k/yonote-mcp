import { readFileSync } from "node:fs";
import {
  TOOL_POLICIES,
  type ToolApiChannel,
  type ToolProfile,
} from "./tool-policy.js";

export type TransportType = "stdio" | "http";

export interface RuntimeConfig {
  token: string;
  baseUrl: string;
  transport: TransportType;
  host: string;
  port: number;
  profile: ToolProfile;
  apiChannel: ToolApiChannel;
  enabledTools: ReadonlySet<string>;
  disabledTools: ReadonlySet<string>;
  timeoutMs: number;
  maxRetries: number;
  exportDir?: string;
  maxDownloadBytes: number;
  importDir?: string;
  maxImportBytes: number;
  allowInsecureHttp: boolean;
  httpBearerToken?: string;
  allowedHosts: readonly string[];
  allowedOrigins: readonly string[];
  warnings: readonly string[];
}

interface ParsedArguments {
  token?: string;
  tokenFile?: string;
  project?: string;
  baseUrl?: string;
  transport?: string;
  host?: string;
  port?: string;
  profile?: string;
  apiChannel?: string;
  enabledTools?: string;
  disabledTools?: string;
  timeoutMs?: string;
  maxRetries?: string;
  exportDir?: string;
  maxDownloadBytes?: string;
  importDir?: string;
  maxImportBytes?: string;
  allowInsecureHttp?: boolean;
  allowedHosts?: string;
  allowedOrigins?: string;
  tokenFromCli?: boolean;
}

type ValueArgument = Exclude<
  keyof ParsedArguments,
  "allowInsecureHttp" | "tokenFromCli"
>;

const ARGUMENTS: Record<string, ValueArgument> = {
  "--token": "token",
  "--token-file": "tokenFile",
  "--project": "project",
  "--base-url": "baseUrl",
  "--transport": "transport",
  "--host": "host",
  "--port": "port",
  "--profile": "profile",
  "--api-channel": "apiChannel",
  "--enable-tools": "enabledTools",
  "--disable-tools": "disabledTools",
  "--timeout-ms": "timeoutMs",
  "--max-retries": "maxRetries",
  "--export-dir": "exportDir",
  "--max-download-bytes": "maxDownloadBytes",
  "--import-dir": "importDir",
  "--max-import-bytes": "maxImportBytes",
  "--allowed-hosts": "allowedHosts",
  "--allowed-origins": "allowedOrigins",
};

export function parseArgs(
  argv: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const args = parseArgumentValues(argv);
  const warnings: string[] = [];
  if (args.tokenFromCli) {
    warnings.push(
      "--token can be exposed through process listings; prefer YONOTE_API_TOKEN or --token-file",
    );
  }
  if (env.TRANSPORT || env.PORT) {
    warnings.push(
      "TRANSPORT and PORT are deprecated; use MCP_TRANSPORT and MCP_PORT",
    );
  }

  const token =
    args.token ??
    (args.tokenFile ? readSecret(args.tokenFile) : undefined) ??
    env.YONOTE_API_TOKEN ??
    (env.YONOTE_API_TOKEN_FILE
      ? readSecret(env.YONOTE_API_TOKEN_FILE)
      : undefined);
  if (!token?.trim()) {
    throw new Error("YONOTE_API_TOKEN or YONOTE_API_TOKEN_FILE is required");
  }

  const project = args.project ?? env.YONOTE_PROJECT;
  if (project && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(project)) {
    throw new Error("Invalid Yonote project name");
  }
  const baseUrl =
    args.baseUrl ??
    env.YONOTE_API_BASE_URL ??
    `https://${project ?? "app"}.yonote.ru/api`;
  const transport = parseTransport(
    args.transport ?? env.MCP_TRANSPORT ?? env.TRANSPORT ?? "stdio",
  );
  const host = args.host ?? env.MCP_HOST ?? "127.0.0.1";
  const port = parseInteger(
    args.port ?? env.MCP_PORT ?? env.PORT ?? "3000",
    "MCP port",
    0,
    65_535,
  );
  const profile = parseProfile(
    args.profile ?? env.YONOTE_PROFILE ?? "readonly",
  );
  const apiChannel = parseApiChannel(
    args.apiChannel ?? env.YONOTE_API_CHANNEL ?? "stable",
  );
  const enabledTools = parseToolList(
    args.enabledTools ?? env.YONOTE_ENABLE_TOOLS,
  );
  const disabledTools = parseToolList(
    args.disabledTools ?? env.YONOTE_DISABLE_TOOLS,
  );
  const timeoutMs = parseInteger(
    args.timeoutMs ?? env.YONOTE_TIMEOUT_MS ?? "30000",
    "request timeout",
    1,
    600_000,
  );
  const maxRetries = parseInteger(
    args.maxRetries ?? env.YONOTE_MAX_RETRIES ?? "2",
    "maximum retries",
    0,
    10,
  );
  const maxDownloadBytes = parseInteger(
    args.maxDownloadBytes ??
      env.YONOTE_MAX_DOWNLOAD_BYTES ??
      String(512 * 1024 * 1024),
    "maximum download bytes",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const maxImportBytes = parseInteger(
    args.maxImportBytes ??
      env.YONOTE_MAX_IMPORT_BYTES ??
      String(50 * 1024 * 1024),
    "maximum import bytes",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const allowInsecureHttp =
    args.allowInsecureHttp ??
    parseBoolean(env.YONOTE_ALLOW_INSECURE_HTTP, false);
  const httpBearerToken = env.MCP_HTTP_BEARER_TOKEN?.trim() || undefined;
  const allowedHosts = parseCsv(args.allowedHosts ?? env.MCP_ALLOWED_HOSTS);
  const allowedOrigins = parseCsv(
    args.allowedOrigins ?? env.MCP_ALLOWED_ORIGINS,
  );

  if (transport === "http" && !isLoopback(host)) {
    if (!httpBearerToken) {
      throw new Error(
        "MCP_HTTP_BEARER_TOKEN is required for non-loopback HTTP binding",
      );
    }
    if (!allowedHosts.length) {
      throw new Error(
        "MCP_ALLOWED_HOSTS is required for non-loopback HTTP binding",
      );
    }
  }

  return {
    token: token.trim(),
    baseUrl,
    transport,
    host,
    port,
    profile,
    apiChannel,
    enabledTools,
    disabledTools,
    timeoutMs,
    maxRetries,
    exportDir: args.exportDir ?? env.YONOTE_EXPORT_DIR,
    maxDownloadBytes,
    importDir: args.importDir ?? env.YONOTE_IMPORT_DIR,
    maxImportBytes,
    allowInsecureHttp,
    httpBearerToken,
    allowedHosts,
    allowedOrigins,
    warnings,
  };
}

function parseArgumentValues(argv: readonly string[]): ParsedArguments {
  const result: ParsedArguments = {};
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--allow-insecure-http") {
      result.allowInsecureHttp = true;
      continue;
    }
    const key = ARGUMENTS[argument];
    if (!key) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    result[key] = value;
    if (argument === "--token") {
      result.tokenFromCli = true;
    }
  }
  return result;
}

function parseTransport(value: string): TransportType {
  if (value !== "stdio" && value !== "http") {
    throw new Error("MCP transport must be stdio or http");
  }
  return value;
}

function parseProfile(value: string): ToolProfile {
  if (
    value !== "readonly" &&
    value !== "export" &&
    value !== "editor" &&
    value !== "admin"
  ) {
    throw new Error(
      "YONOTE_PROFILE must be readonly, export, editor, or admin",
    );
  }
  return value;
}

function parseApiChannel(value: string): ToolApiChannel {
  if (value !== "stable" && value !== "preview" && value !== "legacy") {
    throw new Error("YONOTE_API_CHANNEL must be stable, preview, or legacy");
  }
  return value;
}

function parseToolList(value: string | undefined): ReadonlySet<string> {
  const tools = new Set(parseCsv(value));
  for (const name of tools) {
    if (!(name in TOOL_POLICIES)) {
      throw new Error(`Unknown Yonote tool: ${name}`);
    }
  }
  return tools;
}

function parseCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseInteger(
  value: string,
  name: string,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

function readSecret(path: string): string {
  return readFileSync(path, "utf8");
}

function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}
