import { access, stat, writeFile } from "node:fs/promises";
import { CliError, invalidInput } from "../domain/errors.js";
import { compact, normalizeAttachment } from "../domain/normalize.js";
import type { AttachmentGateway } from "./ports/jira.js";
import { asArray, asRecord } from "./value.js";

export class AttachmentService {
  constructor(private readonly api: AttachmentGateway) {}

  async list(key: string, raw: boolean): Promise<unknown> {
    const result = await this.api.attachmentList(key);
    if (raw) return result;
    const fields = asRecord(asRecord(result).fields);
    return compact({ attachments: asArray(fields.attachment).map(normalizeAttachment) });
  }

  async add(key: string, paths: string[], raw: boolean): Promise<unknown> {
    const settings = asRecord(await this.api.attachmentSettings());
    if (settings.enabled !== true)
      throw new CliError("ATTACHMENTS_DISABLED", "Attachments are disabled in Jira", 6);
    const uploadLimit = typeof settings.uploadLimit === "number" ? settings.uploadLimit : undefined;
    for (const path of paths) {
      let fileSize: number;
      try {
        fileSize = (await stat(path)).size;
      } catch {
        throw invalidInput(`Unable to read attachment file: ${path}`);
      }
      if (uploadLimit !== undefined && fileSize > uploadLimit)
        throw invalidInput(`Attachment file exceeds Jira's ${uploadLimit}-byte limit: ${path}`);
    }
    const result = await this.api.uploadAttachments(key, paths);
    return raw ? result : compact({ attachments: asArray(result).map(normalizeAttachment) });
  }

  async download(id: string, destination: string, force: boolean): Promise<unknown> {
    if (!force && (await exists(destination)))
      throw invalidInput(
        `Output file already exists: ${destination}. Use --force to overwrite it.`,
      );
    const metadata = asRecord(await this.api.attachmentMetadata(id));
    if (typeof metadata.content !== "string")
      throw new CliError(
        "INVALID_ATTACHMENT_RESPONSE",
        "Jira attachment metadata has no content URL",
        7,
      );
    await writeFile(destination, await this.api.downloadAttachment(metadata.content));
    return { downloaded: id, outputFile: destination };
  }

  async delete(id: string): Promise<unknown> {
    await this.api.deleteAttachment(id);
    return { deleted: id };
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
