export class YonoteApiError extends Error {
  constructor(
    public status: number,
    public errorId: string,
    message: string,
  ) {
    super(`Yonote API error ${status} [${errorId}]: ${message}`);
    this.name = "YonoteApiError";
  }
}

export class YonoteClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string, baseUrl: string) {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T = unknown>(
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    const filteredBody: Record<string, unknown> = {};
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null && value !== "") {
          filteredBody[key] = value;
        }
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(filteredBody),
    });

    if (!response.ok) {
      let errorId = "unknown";
      let errorMessage = response.statusText;
      try {
        const errorBody = (await response.json()) as {
          error?: string;
          message?: string;
        };
        errorId = errorBody.error || errorId;
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // ignore parse errors
      }
      throw new YonoteApiError(response.status, errorId, errorMessage);
    }

    return (await response.json()) as T;
  }
}
