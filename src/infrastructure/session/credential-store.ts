import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import type { CredentialStore } from "../../application/ports/session.js";
import { CliError } from "../../domain/errors.js";
import { credentialsPath } from "./paths.js";

const credentialsSchema = z.object({
  version: z.literal(1),
  credentials: z.record(z.string(), z.string()),
});

type CredentialsFile = z.infer<typeof credentialsSchema>;

export class FileCredentialStore implements CredentialStore {
  readonly location: string;

  constructor(sessionOverride?: string) {
    this.location = credentialsPath(sessionOverride);
  }

  async save(key: string, secret: string): Promise<void> {
    const file = await this.readOrEmpty();
    file.credentials[key] = secret;
    await this.write(file);
  }

  async load(key: string): Promise<string> {
    const file = await this.read();
    const secret = file.credentials[key];
    if (!secret)
      throw new CliError(
        "CREDENTIAL_NOT_FOUND",
        "The Jira credential is missing. Run `jira-cli auth login` again.",
        3,
      );
    return secret;
  }

  async delete(key: string): Promise<void> {
    const file = await this.read();
    if (!(key in file.credentials))
      throw new CliError("CREDENTIAL_NOT_FOUND", "The saved Jira credential is missing", 3);
    delete file.credentials[key];
    if (Object.keys(file.credentials).length === 0) {
      await rm(this.location, { force: true });
      return;
    }
    await this.write(file);
  }

  private async readOrEmpty(): Promise<CredentialsFile> {
    try {
      return await this.read();
    } catch (error) {
      if (error instanceof CliError && error.code === "CREDENTIAL_FILE_NOT_FOUND")
        return { version: 1, credentials: {} };
      throw error;
    }
  }

  private async read(): Promise<CredentialsFile> {
    let content: string;
    try {
      content = await readFile(this.location, "utf8");
    } catch (error) {
      if (isMissing(error))
        throw new CliError(
          "CREDENTIAL_FILE_NOT_FOUND",
          `No Jira credential file exists at ${this.location}`,
          3,
        );
      throw new CliError(
        "CREDENTIAL_FILE_READ_ERROR",
        `Unable to read Jira credentials at ${this.location}`,
        3,
      );
    }
    const result = credentialsSchema.safeParse(parseJson(content));
    if (!result.success)
      throw new CliError(
        "INVALID_CREDENTIAL_FILE",
        `Jira credentials at ${this.location} are invalid`,
        3,
      );
    return result.data;
  }

  private async write(file: CredentialsFile): Promise<void> {
    const directory = dirname(this.location);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${this.location}.${process.pid}.${Date.now()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(file, null, 2), { mode: 0o600 });
      await chmod(temporary, 0o600);
      await rename(temporary, this.location);
      await chmod(this.location, 0o600);
    } catch {
      await rm(temporary, { force: true }).catch(() => undefined);
      throw new CliError(
        "CREDENTIAL_FILE_WRITE_ERROR",
        `Unable to write Jira credentials at ${this.location}`,
        3,
      );
    }
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
