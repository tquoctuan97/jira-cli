import { CliError, jiraError } from "../../domain/errors.js";

export type RequestOptions = {
  body?: unknown;
  headers?: HeadersInit;
};

export class JiraClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly timeoutMs = 30_000,
  ) {}

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    const payload = await parseResponse(response);
    if (!response.ok) throw jiraError(response.status, payload);
    return payload as T;
  }

  async upload<T>(path: string, form: FormData): Promise<T> {
    const response = await this.fetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      body: form,
    });
    const payload = await parseResponse(response);
    if (!response.ok) throw jiraError(response.status, payload);
    return payload as T;
  }

  async download(urlOrPath: string): Promise<Uint8Array> {
    const url = new URL(urlOrPath, `${this.baseUrl}/`);
    if (url.origin !== new URL(this.baseUrl).origin)
      throw new CliError(
        "UNSAFE_ATTACHMENT_URL",
        "Jira returned an attachment URL on a different origin",
        7,
      );
    const response = await this.fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!response.ok) throw jiraError(response.status, await parseResponse(response));
    return new Uint8Array(await response.arrayBuffer());
  }

  private async fetch(path: string | URL, init: RequestInit): Promise<Response> {
    const url =
      path instanceof URL
        ? path
        : new URL(path.replace(/^\//, ""), `${this.baseUrl.replace(/\/$/, "")}/`);
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      throw new CliError(
        timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
        timedOut ? "Jira request timed out" : "Unable to reach Jira",
        7,
      );
    }
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
