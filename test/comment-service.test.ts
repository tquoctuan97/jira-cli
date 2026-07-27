import { describe, expect, it, vi } from "vitest";
import { CommentService } from "../src/application/comment-service.js";
import type { CommentGateway } from "../src/application/ports/jira.js";

describe("CommentService", () => {
  it("passes Jira wiki markup to the gateway unchanged", async () => {
    const body = 'h2. Result\n\n*Ready for review*\n\n{code:json}\n{"ok":true}\n{code}';
    const saveComment = vi.fn().mockResolvedValue({ id: "10001", body });
    const service = new CommentService({ saveComment } as unknown as CommentGateway);

    await service.save("FE-1", undefined, body, false);

    expect(saveComment).toHaveBeenCalledWith("FE-1", undefined, body);
  });
});
