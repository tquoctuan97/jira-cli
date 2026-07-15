import { describe, expect, it } from "vitest";
import { compact, normalizeIssue } from "../src/domain/normalize.js";

describe("normalization", () => {
  it("removes transport metadata and empty values", () => {
    expect(
      compact({
        id: "1",
        self: "https://jira.example/rest/1",
        nested: { iconUrl: "icon", empty: null },
        emptyList: [],
      }),
    ).toEqual({ id: "1" });
  });

  it("produces a stable issue shape", () => {
    expect(
      normalizeIssue({
        id: "10042",
        key: "FE-123",
        fields: {
          summary: "Login returns 500",
          status: {
            id: "3",
            name: "In Progress",
            statusCategory: { key: "indeterminate" },
          },
          assignee: { name: "daniel", displayName: "Daniel", avatarUrls: { small: "x" } },
          customfield_10001: { value: "Team A", self: "x" },
        },
      }),
    ).toEqual({
      id: "10042",
      key: "FE-123",
      summary: "Login returns 500",
      status: { id: "3", name: "In Progress", category: "indeterminate" },
      assignee: { username: "daniel", displayName: "Daniel" },
      customfield_10001: { value: "Team A" },
    });
  });
});
