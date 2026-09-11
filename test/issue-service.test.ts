import { describe, expect, it, vi } from "vitest";
import { IssueService } from "../src/application/issue-service.js";
import { CliError } from "../src/domain/errors.js";
import type { IssueGateway } from "../src/application/ports/jira.js";

describe("IssueService", () => {
  it("requests bounded default fields and filters unrequested custom fields", async () => {
    const getIssue = vi.fn().mockResolvedValue({
      id: "1",
      key: "FE-1",
      fields: {
        summary: "Summary",
        description: "Description",
        reporter: { name: "reporter" },
        customfield_10001: { value: "hidden" },
      },
    });
    const service = new IssueService({ getIssue } as unknown as IssueGateway);

    await expect(service.get("FE-1", undefined, false)).resolves.toEqual({
      id: "1",
      key: "FE-1",
      summary: "Summary",
      description: "Description",
      reporter: { username: "reporter" },
    });
    expect(getIssue).toHaveBeenCalledWith(
      "FE-1",
      "summary,description,issuetype,status,priority,project,assignee,reporter,labels,parent,created,updated,resolution,components,fixVersions",
    );
  });

  it("retains explicitly requested custom and unknown fields", async () => {
    const getIssue = vi.fn().mockResolvedValue({
      id: "1",
      key: "FE-1",
      fields: {
        summary: "Summary",
        customfield_10001: { value: "Team A" },
        opaqueField: { nested: true },
        description: "not requested",
      },
    });
    const service = new IssueService({ getIssue } as unknown as IssueGateway);

    await expect(
      service.get("FE-1", "summary,customfield_10001,opaqueField", false),
    ).resolves.toEqual({
      id: "1",
      key: "FE-1",
      summary: "Summary",
      customfield_10001: { value: "Team A" },
      opaqueField: { nested: true },
    });
    expect(getIssue).toHaveBeenCalledWith("FE-1", "summary,customfield_10001,opaqueField");
  });

  it("leaves raw get and search requests unfiltered without fields", async () => {
    const getIssue = vi.fn().mockResolvedValue({ fields: { customfield_10001: "raw" } });
    const searchIssues = vi.fn().mockResolvedValue({ issues: [{ fields: { opaque: true } }] });
    const service = new IssueService({ getIssue, searchIssues } as unknown as IssueGateway);

    await expect(service.get("FE-1", undefined, true)).resolves.toEqual({
      fields: { customfield_10001: "raw" },
    });
    await expect(
      service.search({
        jql: "project = FE",
        startAt: 0,
        limit: 10,
        all: false,
        maxItems: 200,
        raw: true,
      }),
    ).resolves.toEqual({ issues: [{ fields: { opaque: true } }] });
    expect(getIssue).toHaveBeenCalledWith("FE-1", undefined);
    expect(searchIssues).toHaveBeenCalledWith({
      jql: "project = FE",
      startAt: 0,
      maxResults: 10,
    });
  });

  it("uses the compact search defaults and filters description and reporter", async () => {
    const searchIssues = vi.fn().mockResolvedValue({
      startAt: 0,
      maxResults: 10,
      total: 1,
      issues: [
        {
          id: "1",
          key: "FE-1",
          fields: {
            summary: "Summary",
            description: "hidden",
            reporter: { name: "hidden" },
            assignee: { name: "daniel" },
            customfield_10001: "hidden",
          },
        },
      ],
    });
    const service = new IssueService({ searchIssues } as unknown as IssueGateway);

    const result = await service.search({
      jql: "project = FE",
      startAt: 0,
      limit: 10,
      all: false,
      maxItems: 200,
      raw: false,
    });
    expect(result).toMatchObject({
      issues: [{ id: "1", key: "FE-1", summary: "Summary", assignee: { username: "daniel" } }],
    });
    expect(result).not.toHaveProperty("issues.0.description");
    expect(result).not.toHaveProperty("issues.0.reporter");
    expect(result).not.toHaveProperty("issues.0.customfield_10001");
    expect(searchIssues).toHaveBeenCalledWith({
      jql: "project = FE",
      fields: [
        "summary",
        "issuetype",
        "status",
        "priority",
        "project",
        "assignee",
        "labels",
        "parent",
        "created",
        "updated",
      ],
      startAt: 0,
      maxResults: 10,
    });
  });

  it("returns bounded context with newest comments, empty sections, and local links", async () => {
    const getIssue = vi.fn().mockResolvedValue({
      id: "1",
      key: "FE-1",
      fields: {
        summary: "Summary",
        attachment: [{ id: "10", filename: "log.txt", size: 4 }],
        issuelinks: [
          {
            id: "20",
            type: { id: "100", name: "Blocks", outward: "blocks", inward: "is blocked by" },
            outwardIssue: {
              id: "2",
              key: "FE-2",
              fields: {
                summary: "Other",
                issuetype: { id: "1", name: "Task" },
                status: { id: "3", name: "Open" },
                priority: { id: "4", name: "High" },
              },
            },
          },
          {
            id: "21",
            type: { id: "101", name: "Blocks", outward: "blocks", inward: "is blocked by" },
            inwardIssue: {
              id: "3",
              key: "FE-3",
              fields: {
                summary: "Inward",
                issuetype: { id: "1", name: "Task" },
                status: { id: "3", name: "Open" },
                priority: { id: "4", name: "High" },
              },
            },
          },
        ],
      },
    });
    const comments = vi
      .fn()
      .mockResolvedValue({ total: 25, comments: [{ id: "3", body: "Latest" }] });
    const service = new IssueService({ getIssue, comments } as unknown as IssueGateway);

    await expect(service.context("FE-1", undefined, 20, false)).resolves.toMatchObject({
      comments: { total: 25, returned: 1, hasMore: true, items: [{ id: "3", body: "Latest" }] },
      attachments: [{ id: "10", filename: "log.txt", size: 4 }],
      links: [
        {
          id: "20",
          direction: "outward",
          type: { id: "100", name: "Blocks", label: "blocks" },
          issue: { id: "2", key: "FE-2", summary: "Other" },
        },
        {
          id: "21",
          direction: "inward",
          type: { id: "101", name: "Blocks", label: "is blocked by" },
          issue: { id: "3", key: "FE-3", summary: "Inward" },
        },
      ],
    });
    expect(comments).toHaveBeenCalledWith("FE-1", { maxResults: 20, orderBy: "-created" });
    expect(getIssue.mock.calls[0]?.[1]).toContain("attachment,issuelinks");
  });

  it("skips comments when context comment limit is zero", async () => {
    const getIssue = vi.fn().mockResolvedValue({ id: "1", key: "FE-1", fields: {} });
    const comments = vi.fn();
    const service = new IssueService({ getIssue, comments } as unknown as IssueGateway);

    await expect(service.context("FE-1", undefined, 0, false)).resolves.toEqual({
      issue: { id: "1", key: "FE-1" },
      comments: { total: 0, returned: 0, hasMore: false, items: [] },
      attachments: [],
      links: [],
    });
    expect(comments).not.toHaveBeenCalled();
  });

  it("keeps the raw context envelope and raw issue/comment payloads", async () => {
    const issue = { id: "1", key: "FE-1", fields: { attachment: [{ id: "10" }] } };
    const commentsResponse = { total: 1, comments: [{ id: "2", body: "raw" }] };
    const getIssue = vi.fn().mockResolvedValue(issue);
    const comments = vi.fn().mockResolvedValue(commentsResponse);
    const service = new IssueService({ getIssue, comments } as unknown as IssueGateway);

    await expect(service.context("FE-1", undefined, 20, true)).resolves.toEqual({
      issue,
      comments: commentsResponse,
    });
  });

  it("fails context when either required Jira read fails", async () => {
    const service = new IssueService({
      getIssue: vi.fn().mockRejectedValue(new CliError("NOT_FOUND", "missing", 4)),
      comments: vi.fn().mockResolvedValue({ total: 0, comments: [] }),
    } as unknown as IssueGateway);

    await expect(service.context("FE-1", undefined, 20, false)).rejects.toMatchObject({
      code: "NOT_FOUND",
      exitCode: 4,
    });

    const commentsFailure = new IssueService({
      getIssue: vi.fn().mockResolvedValue({ id: "1", key: "FE-1", fields: {} }),
      comments: vi.fn().mockRejectedValue(new CliError("NETWORK_ERROR", "offline", 7)),
    } as unknown as IssueGateway);
    await expect(commentsFailure.context("FE-1", undefined, 20, false)).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      exitCode: 7,
    });
  });
  it("maps CLI fields to Jira field identifiers", async () => {
    const createIssue = vi.fn().mockResolvedValue({ id: "1", key: "FE-1" });
    const service = new IssueService({ createIssue } as unknown as IssueGateway);

    await service.create(
      undefined,
      {
        project: "FE",
        type: "Story",
        summary: "Build login",
        description: "h2. Scope\n\n* Implement login",
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
        description: "h2. Scope\n\n* Implement login",
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
