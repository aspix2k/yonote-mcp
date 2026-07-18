import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, extname, relative, resolve } from "node:path";

export interface YonoteClientOptions {
  token: string;
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  exportDir?: string;
  maxDownloadBytes?: number;
  importDir?: string;
  maxImportBytes?: number;
  allowInsecureHttp?: boolean;
  fetch?: typeof fetch;
  userAgent?: string;
}

export interface YonoteRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  idempotent?: boolean;
  redirect?: RequestRedirect;
  query?: Record<string, unknown>;
}

export interface YonoteDownload {
  path: string;
  size: number;
  contentType: string;
}

export interface YonoteMultipartFile {
  field: string;
  filename: string;
  contentType: string;
}

export class YonoteApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorId: string,
    public readonly publicMessage: string,
  ) {
    super(`Yonote API error ${status} [${errorId}]: ${publicMessage}`);
    this.name = "YonoteApiError";
  }
}

export class YonoteClientError extends Error {
  constructor(
    public readonly errorId: string,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "YonoteClientError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const DEFAULT_MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024;
const DEFAULT_MAX_IMPORT_BYTES = 50 * 1024 * 1024;
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);
// Stryker disable all: static endpoint inventory is verified by API contract and tool-policy tests
const IDEMPOTENT_ENDPOINTS = new Set([
  "attachments.list",
  "attachments.size",
  "attachments.redirect",
  "auth.info",
  "auth.config",
  "collections.list",
  "collections.info",
  "collections.documents",
  "collections.memberships",
  "collections.group_memberships",
  "comments.list",
  "comments.info",
  "comments.thread",
  "database.rows.list",
  "documents.list",
  "documents.info",
  "documents.search",
  "documents.search_titles",
  "documents.drafts",
  "documents.viewed",
  "documents.users",
  "documents.documents",
  "documents.export",
  "documents.starred",
  "documents.pinned",
  "events.list",
  "fileOperations.info",
  "fileOperations.redirect",
  "fileOperations.list",
  "groups.list",
  "groups.info",
  "groups.memberships",
  "loop.teams",
  "loop.channels",
  "provider.info",
  "revisions.list",
  "revisions.info",
  "shares.list",
  "shares.info",
  "stars.list",
  "subscriptions.info",
  "syncBlocks.list",
  "syncBlocks.list_inserts",
  "users.list",
  "users.info",
  "views.list",
]);
// Stryker restore all

export class YonoteClient {
  private readonly token: string;
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly exportDir?: string;
  private readonly maxDownloadBytes: number;
  private readonly importDir?: string;
  private readonly maxImportBytes: number;
  private readonly fetchFn: typeof fetch;
  private readonly userAgent: string;
  private readonly allowInsecureHttp: boolean;

  constructor(token: string, baseUrl: string);
  constructor(options: YonoteClientOptions);
  constructor(tokenOrOptions: string | YonoteClientOptions, baseUrl?: string) {
    const options: YonoteClientOptions =
      typeof tokenOrOptions === "string"
        ? { token: tokenOrOptions, baseUrl: baseUrl ?? "" }
        : tokenOrOptions;

    if (!options.token.trim()) {
      throw new Error("Yonote API token is required");
    }

    this.token = options.token;
    this.allowInsecureHttp = options.allowInsecureHttp ?? false;
    this.baseUrl = normalizeBaseUrl(options.baseUrl, this.allowInsecureHttp);
    this.timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.maxRetries = nonNegativeInteger(
      options.maxRetries,
      DEFAULT_MAX_RETRIES,
    );
    this.retryDelayMs = nonNegativeInteger(
      options.retryDelayMs,
      DEFAULT_RETRY_DELAY_MS,
    );
    this.exportDir = options.exportDir ? resolve(options.exportDir) : undefined;
    this.maxDownloadBytes = positiveInteger(
      options.maxDownloadBytes,
      DEFAULT_MAX_DOWNLOAD_BYTES,
    );
    this.importDir = options.importDir ? resolve(options.importDir) : undefined;
    this.maxImportBytes = positiveInteger(
      options.maxImportBytes,
      DEFAULT_MAX_IMPORT_BYTES,
    );
    this.fetchFn = options.fetch ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? "yonote-mcp";
  }

  async request<T = unknown>(
    endpoint: string,
    body?: Record<string, unknown>,
    options: YonoteRequestOptions = {},
  ): Promise<T> {
    const response = await this.requestRaw(endpoint, body, options);
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      throw new YonoteApiError(
        response.status,
        "unexpected_response",
        `Expected JSON but received ${contentType || "an unknown content type"}`,
      );
    }

    return (await response.json()) as T;
  }

  async getRedirect(
    endpoint: string,
    body?: Record<string, unknown>,
    idempotent = true,
  ): Promise<{ url: string }> {
    const response = await this.requestRaw(endpoint, body, {
      idempotent,
      redirect: "manual",
    });
    const location = response.headers.get("location");
    if (!location) {
      throw new YonoteApiError(
        response.status,
        "redirect_missing",
        "Yonote did not return a download URL",
      );
    }

    const url = new URL(location, this.baseUrl);
    validateDownloadUrl(url, this.allowInsecureHttp);
    return { url: url.toString() };
  }

  async download(
    endpoint: string,
    body?: Record<string, unknown>,
    filename?: string,
  ): Promise<YonoteDownload> {
    if (!this.exportDir) {
      throw new YonoteClientError(
        "export_not_configured",
        "Set YONOTE_EXPORT_DIR before using download tools",
      );
    }

    const firstResponse = await this.requestRaw(endpoint, body, {
      idempotent: true,
      redirect: "manual",
    });
    const location = firstResponse.headers.get("location");
    const response = location
      ? await this.fetchDownload(new URL(location, this.baseUrl))
      : firstResponse;
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > this.maxDownloadBytes) {
      throw new YonoteApiError(
        413,
        "download_too_large",
        `Download exceeds the configured ${this.maxDownloadBytes} byte limit`,
      );
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > this.maxDownloadBytes) {
      throw new YonoteApiError(
        413,
        "download_too_large",
        `Download exceeds the configured ${this.maxDownloadBytes} byte limit`,
      );
    }

    const outputName = safeFilename(
      filename ?? defaultFilename(endpoint, body, response.headers),
    );
    await mkdir(this.exportDir, { recursive: true, mode: 0o700 });
    const outputPath = resolve(this.exportDir, outputName);
    await writeFile(outputPath, bytes, { flag: "wx", mode: 0o600 });

    return {
      path: outputPath,
      size: bytes.byteLength,
      contentType:
        response.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async importDocument(
    filename: string,
    fields: Record<string, unknown>,
  ): Promise<unknown> {
    const form = new FormData();
    const bytes = await this.readImportFile(filename);
    form.append(
      "file",
      new Blob([bytes], { type: mimeType(filename) }),
      filename,
    );
    appendFormFields(form, fields);
    const response = await this.requestForm("documents.import", form);
    return response.json();
  }

  async requestMultipart(
    endpoint: string,
    fields: Record<string, unknown>,
    file?: YonoteMultipartFile,
  ): Promise<unknown> {
    const form = new FormData();
    appendFormFields(form, fields);
    if (file) {
      const bytes = await this.readImportFile(file.filename);
      form.append(
        file.field,
        new Blob([bytes], { type: file.contentType }),
        file.filename,
      );
    }
    const response = await this.requestForm(endpoint, form);
    return response.json();
  }

  private async readImportFile(
    filename: string,
  ): Promise<Uint8Array<ArrayBuffer>> {
    if (!this.importDir) {
      throw new YonoteClientError(
        "import_not_configured",
        "Set YONOTE_IMPORT_DIR before importing local files",
      );
    }
    if (!filename || filename !== basename(filename)) {
      throw new YonoteClientError(
        "invalid_import_file",
        "Use a filename directly inside YONOTE_IMPORT_DIR",
      );
    }

    let root: string;
    try {
      root = await realpath(this.importDir);
    } catch {
      throw new YonoteClientError(
        "import_directory_unavailable",
        "YONOTE_IMPORT_DIR does not exist or cannot be accessed",
      );
    }

    let inputPath: string;
    try {
      inputPath = await realpath(resolve(root, filename));
    } catch {
      throw new YonoteClientError(
        "import_file_not_found",
        "The requested file was not found inside YONOTE_IMPORT_DIR",
      );
    }

    const pathFromRoot = relative(root, inputPath);
    if (
      pathFromRoot.startsWith("..") ||
      resolve(root, pathFromRoot) !== inputPath
    ) {
      throw new YonoteClientError(
        "invalid_import_file",
        "The requested file resolves outside YONOTE_IMPORT_DIR",
      );
    }
    const fileStat = await stat(inputPath);
    if (!fileStat.isFile()) {
      throw new YonoteClientError(
        "invalid_import_file",
        "The requested import path is not a file",
      );
    }
    if (fileStat.size > this.maxImportBytes) {
      throw importTooLarge(this.maxImportBytes);
    }

    const bytes = await readFile(inputPath);
    if (bytes.byteLength > this.maxImportBytes) {
      throw importTooLarge(this.maxImportBytes);
    }
    return Uint8Array.from(bytes);
  }

  private async requestRaw(
    endpoint: string,
    body: Record<string, unknown> | undefined,
    options: YonoteRequestOptions,
  ): Promise<Response> {
    const url = this.buildUrl(endpoint, options.query);
    const method = options.method ?? "POST";
    const filteredBody = Object.fromEntries(
      Object.entries(body ?? {}).filter(([, value]) => value !== undefined),
    );
    const idempotent =
      options.idempotent ??
      (method === "GET" || IDEMPOTENT_ENDPOINTS.has(endpoint));
    const attempts = idempotent ? this.maxRetries + 1 : 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchFn(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
            Accept: "application/json, application/octet-stream",
            "User-Agent": this.userAgent,
          },
          body: method === "GET" ? undefined : JSON.stringify(filteredBody),
          redirect: options.redirect ?? "follow",
          signal: controller.signal,
        });

        if (response.ok || isRedirect(response.status, options.redirect)) {
          return response;
        }
        if (
          idempotent &&
          RETRYABLE_STATUSES.has(response.status) &&
          attempt + 1 < attempts
        ) {
          await response.body?.cancel();
          await sleep(this.retryDelayMs * 2 ** attempt);
          continue;
        }
        throw await this.apiError(response);
      } catch (error) {
        lastError = error;
        if (
          error instanceof YonoteApiError ||
          !idempotent ||
          attempt + 1 >= attempts
        ) {
          throw error;
        }
        await sleep(this.retryDelayMs * 2 ** attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }

  private async fetchDownload(url: URL): Promise<Response> {
    validateDownloadUrl(url, this.allowInsecureHttp);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchFn(url, {
        headers: { Accept: "application/octet-stream" },
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw await this.apiError(response);
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestForm(
    endpoint: string,
    form: FormData,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchFn(this.buildUrl(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          "User-Agent": this.userAgent,
        },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw await this.apiError(response);
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(endpoint: string, query?: Record<string, unknown>): URL {
    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    if (!cleanEndpoint || cleanEndpoint.split("/").includes("..")) {
      throw new Error("Invalid Yonote API endpoint");
    }

    const url = new URL(cleanEndpoint, `${this.baseUrl.toString()}/`);
    const basePath = `${this.baseUrl.pathname.replace(/\/$/, "")}/`;
    if (
      url.origin !== this.baseUrl.origin ||
      !url.pathname.startsWith(basePath)
    ) {
      throw new Error("Yonote API endpoint escaped the configured base URL");
    }

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }

  private async apiError(response: Response): Promise<YonoteApiError> {
    const fallback = response.statusText || "Request failed";
    let errorId = "unknown";
    let message = fallback;
    try {
      const text = await response.text();
      const body = JSON.parse(text) as { error?: string; message?: string };
      errorId = body.error || errorId;
      message = body.message || fallback;
    } catch {
      message = fallback;
    }
    const publicMessage = message
      .replaceAll(this.token, "[redacted]")
      .slice(0, 1_000);
    return new YonoteApiError(response.status, errorId, publicMessage);
  }
}

export function normalizeBaseUrl(
  value: string,
  allowInsecureHttp = false,
): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(allowInsecureHttp && url.protocol === "http:")
  ) {
    throw new Error("Yonote API base URL must use HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Yonote API base URL cannot contain credentials, query, or fragment",
    );
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url;
}

function validateDownloadUrl(url: URL, allowInsecureHttp: boolean): void {
  if (
    url.protocol !== "https:" &&
    !(allowInsecureHttp && url.protocol === "http:")
  ) {
    throw new YonoteClientError(
      "unsafe_download_url",
      "Yonote download URL must use HTTPS",
    );
  }
  if (url.username || url.password) {
    throw new YonoteClientError(
      "unsafe_download_url",
      "Yonote download URL cannot contain embedded credentials",
    );
  }
}

function defaultFilename(
  endpoint: string,
  body: Record<string, unknown> | undefined,
  headers: Headers,
): string {
  const disposition = headers.get("content-disposition") ?? "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const headerName = utf8Name ? decodeURIComponent(utf8Name) : plainName;
  if (headerName) {
    return headerName;
  }

  const id = typeof body?.id === "string" ? body.id : crypto.randomUUID();
  const extension = extensionFor(headers.get("content-type") ?? "");
  return `${endpoint.replace(/[^a-z0-9]+/gi, "-")}-${id}${extension}`;
}

function extensionFor(contentType: string): string {
  if (contentType.includes("zip")) return ".zip";
  if (contentType.includes("json")) return ".json";
  if (contentType.includes("markdown")) return ".md";
  if (contentType.includes("text")) return ".txt";
  return ".bin";
}

function mimeType(filename: string): string {
  switch (extname(filename).toLowerCase()) {
    case ".md":
    case ".markdown":
      return "text/markdown";
    case ".txt":
      return "text/plain";
    case ".html":
    case ".htm":
      return "text/html";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      throw new YonoteClientError(
        "unsupported_import_type",
        "Yonote imports support Markdown, text, HTML, and DOCX files",
      );
  }
}

function safeFilename(value: string): string {
  const decoded = value.normalize("NFC");
  if (
    !decoded ||
    decoded !== basename(decoded) ||
    decoded.includes("\0") ||
    extname(decoded).length > 16
  ) {
    throw invalidDownloadFilename();
  }
  return decoded;
}

function appendFormFields(
  form: FormData,
  fields: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      form.append(key, String(value));
    }
  }
}

function invalidDownloadFilename(): YonoteClientError {
  return new YonoteClientError(
    "invalid_download_filename",
    "Download filename must be a plain filename with a short extension",
  );
}

function importTooLarge(maxImportBytes: number): YonoteApiError {
  return new YonoteApiError(
    413,
    "import_too_large",
    `Import exceeds the configured ${maxImportBytes} byte limit`,
  );
}

function isRedirect(
  status: number,
  redirect: RequestRedirect | undefined,
): boolean {
  return redirect === "manual" && status >= 300 && status < 400;
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && (value ?? 0) > 0
    ? (value as number)
    : fallback;
}

function nonNegativeInteger(
  value: number | undefined,
  fallback: number,
): number {
  return Number.isInteger(value) && (value ?? -1) >= 0
    ? (value as number)
    : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
