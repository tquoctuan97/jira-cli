export type ExitCode = 2 | 3 | 4 | 5 | 6 | 7 | 8;

export class CliError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly exitCode: ExitCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function invalidInput(message: string, details?: unknown): CliError {
  return new CliError("INVALID_INPUT", message, 2, details);
}

export function jiraError(status: number, payload: unknown): CliError {
  const message = extractJiraMessage(payload);
  if (status === 401)
    return new CliError("AUTHENTICATION_ERROR", message ?? "Jira authentication failed", 3);
  if (status === 403)
    return new CliError("PERMISSION_DENIED", message ?? "Jira permission denied", 5);
  if (status === 404) return new CliError("NOT_FOUND", message ?? "Jira resource not found", 4);
  if ([400, 409, 422].includes(status))
    return new CliError(
      "JIRA_VALIDATION_ERROR",
      message ?? "Jira rejected the request",
      6,
      payload,
    );
  return new CliError("JIRA_SERVER_ERROR", message ?? `Jira request failed with HTTP ${status}`, 7);
}

function extractJiraMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const value = payload as Record<string, unknown>;
  if (typeof value.message === "string") return value.message;
  if (Array.isArray(value.errorMessages)) {
    const messages = value.errorMessages.filter((item): item is string => typeof item === "string");
    if (messages.length) return messages.join("; ");
  }
  if (value.errors && typeof value.errors === "object") {
    const messages = Object.values(value.errors).filter(
      (item): item is string => typeof item === "string",
    );
    if (messages.length) return messages.join("; ");
  }
  return undefined;
}
