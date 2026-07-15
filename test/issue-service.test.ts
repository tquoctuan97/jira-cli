import { describe, expect, it, vi } from "vitest";
import { IssueService } from "../src/application/issue-service.js";
import { CliError } from "../src/domain/errors.js";
import type { IssueGateway } from "../src/application/ports/jira.js";

describe("IssueService", () => {
  it("maps CLI fields to Jira field identifiers", async () => {
    const createIssue = vi.fn().mockResolvedValue({ id: "1", key: "FE-1" });
    const service = new IssueService({ createIssue } as unknown as IssueGateway);

    await service.create(
      undefined,
      {
        project: "FE",
        type: "Story",
        summary: "Build login",
        assignee: "me",
        parent: "FE-0",
        labels: "frontend, auth",
      },
      false,
    );

    expect(createIssue).toHaveBeenCalledWith({
      fields: {
        project: { key: "FE" },
        issuetype: { name: "Story" },
        summary: "Build login",
        assignee: { name: "-1" },
        parent: { key: "FE-0" },
        labels: ["frontend", "auth"],
      },
    });
  });

  it("rejects JSON input combined with field flags before calling Jira", async () => {
    const createIssue = vi.fn();
    const service = new IssueService({ createIssue } as unknown as IssueGateway);

    await expect(
      service.create({ fields: {} }, { summary: "conflict" }, false),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    expect(createIssue).not.toHaveBeenCalled();
  });

  it("resolves transitions by ID before names and destination statuses", async () => {
    const transitions = vi.fn().mockResolvedValue({
      transitions: [
        { id: "31", name: "Start progress", to: { name: "In Progress" } },
        { id: "41", name: "31", to: { name: "Done" } },
      ],
    });
    const transition = vi.fn().mockResolvedValue(undefined);
    const service = new IssueService({ transitions, transition } as unknown as IssueGateway);

    await service.transition("FE-1", "31", undefined);

    expect(transition).toHaveBeenCalledWith("FE-1", { transition: { id: "31" } });
  });

  it("returns a workflow error when no transition matches", async () => {
    const service = new IssueService({
      transitions: vi.fn().mockResolvedValue({ transitions: [] }),
    } as unknown as IssueGateway);

    await expect(service.transition("FE-1", "Done", undefined)).rejects.toBeInstanceOf(CliError);
  });
});
