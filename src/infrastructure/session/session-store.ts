import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import type { Session } from "../../application/contracts.js";
import type { SessionRepository } from "../../application/ports/session.js";
import { CliError } from "../../domain/errors.js";
import { sessionPath } from "./paths.js";

const sessionSchema = z.object({
  baseUrl: z.string().url(),
  account: z.string().min(1),
  displayName: z.string().optional(),
  credentialKey: z.string().min(1),
});

export class SessionStore implements SessionRepository {
  constructor(private readonly overridePath?: string) {}

  async load(): Promise<Session> {
    const path = this.path();
    let content: string;
    try {
      content = await readFile(path, "utf8");
    } catch (error) {
      if (isMissing(error))
        throw new CliError(
          "SESSION_NOT_FOUND",
          "No Jira session is configured. Run `jira-cli auth login` first.",
          3,
        );
      throw new CliError("SESSION_READ_ERROR", `Unable to read Jira session at ${path}`, 3);
    }
    const result = sessionSchema.safeParse(parseJson(content));
    if (!result.success)
      throw new CliError("INVALID_SESSION", `Jira session at ${path} is invalid`, 3);
    return {
      baseUrl: result.data.baseUrl,
      account: result.data.account,
      credentialKey: result.data.credentialKey,
      ...(result.data.displayName === undefined ? {} : { displayName: result.data.displayName }),
    };
  }

  async save(session: Session): Promise<void> {
    const path = this.path();
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(session, null, 2), { mode: 0o600 });
    await rename(temporaryPath, path);
  }

  async delete(): Promise<void> {
    await rm(this.path(), { force: true });
  }

  private path(): string {
    return sessionPath(this.overridePath);
  }
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
