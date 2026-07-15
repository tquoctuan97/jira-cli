import { createHash } from "node:crypto";
import type { Session } from "./contracts.js";
import { CliError, invalidInput } from "../domain/errors.js";
import { normalizeUser } from "../domain/normalize.js";
import type { AuthGateway } from "./ports/jira.js";
import type { CredentialStore, SessionRepository } from "./ports/session.js";

export class AuthService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly credentials: CredentialStore,
  ) {}

  async login(api: AuthGateway, baseUrl: string, token: string): Promise<unknown> {
    const response = await api.myself();
    const user = asRecord(response);
    const account = firstString(user.name, user.key, user.username);
    if (!account)
      throw new CliError("INVALID_AUTH_RESPONSE", "Jira did not return an account identifier", 3);
    const credentialKey = createHash("sha256")
      .update(`${baseUrl}\0${account}`)
      .digest("hex")
      .slice(0, 24);
    const session: Session = {
      baseUrl,
      account,
      ...(typeof user.displayName === "string" ? { displayName: user.displayName } : {}),
      credentialKey,
    };
    const previous = await this.previousSession();
    await this.credentials.save(credentialKey, token);
    try {
      await this.sessions.save(session);
    } catch (error) {
      await this.credentials.delete(credentialKey).catch(() => undefined);
      throw error;
    }
    if (previous && previous.credentialKey !== credentialKey) {
      try {
        await this.credentials.delete(previous.credentialKey);
      } catch (error) {
        if (!(error instanceof CliError && error.code === "CREDENTIAL_NOT_FOUND"))
          throw new CliError(
            "PARTIAL_CREDENTIAL_CLEANUP",
            "The new Jira session was saved, but the previous credential could not be removed",
            8,
          );
      }
    }
    return { authenticated: true, baseUrl, user: normalizeUser(user) };
  }

  async status(): Promise<unknown> {
    const session = await this.sessions.load();
    return {
      baseUrl: session.baseUrl,
      user: { username: session.account, displayName: session.displayName },
    };
  }

  async logout(): Promise<unknown> {
    let session: Session;
    try {
      session = await this.sessions.load();
    } catch (error) {
      if (error instanceof CliError && error.code === "SESSION_NOT_FOUND")
        return { loggedOut: true };
      throw error;
    }
    await this.credentials.delete(session.credentialKey);
    await this.sessions.delete();
    return { loggedOut: true };
  }

  private async previousSession(): Promise<Session | undefined> {
    try {
      return await this.sessions.load();
    } catch (error) {
      if (error instanceof CliError && error.code === "SESSION_NOT_FOUND") return undefined;
      throw error;
    }
  }
}

export function normalizeBaseUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw invalidInput("Jira base URL must be a valid HTTPS URL");
  }
  if (url.protocol !== "https:") throw invalidInput("Jira base URL must use HTTPS");
  if (url.username || url.password || url.search || url.hash)
    throw invalidInput("Jira base URL cannot contain credentials, a query, or a fragment");
  return url.toString().replace(/\/$/, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}
