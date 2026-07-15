import { compact, normalizeUser } from "../domain/normalize.js";
import type { CommentGateway } from "./ports/jira.js";
import { asArray, asRecord } from "./value.js";

export class CommentService {
  constructor(private readonly api: CommentGateway) {}

  async list(key: string, raw: boolean): Promise<unknown> {
    const result = await this.api.comments(key);
    return raw
      ? result
      : compact({ comments: asArray(asRecord(result).comments).map(normalizeComment) });
  }

  async get(key: string, id: string, raw: boolean): Promise<unknown> {
    const result = await this.api.comment(key, id);
    return raw ? result : normalizeComment(result);
  }

  async save(key: string, id: string | undefined, body: string, raw: boolean): Promise<unknown> {
    const result = await this.api.saveComment(key, id, body);
    return raw ? result : normalizeComment(result);
  }

  async delete(key: string, id: string): Promise<unknown> {
    await this.api.deleteComment(key, id);
    return { deleted: id };
  }
}

function normalizeComment(value: unknown): unknown {
  const comment = asRecord(value);
  return compact({
    id: comment.id,
    body: comment.body,
    author: normalizeUser(comment.author),
    created: comment.created,
    updated: comment.updated,
  });
}
