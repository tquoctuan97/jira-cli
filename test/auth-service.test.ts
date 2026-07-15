import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "../src/application/auth-service.js";

describe("normalizeBaseUrl", () => {
  it("accepts HTTPS URLs and preserves a Jira context path", () => {
    expect(normalizeBaseUrl("https://jira.example.com/jira/")).toBe(
      "https://jira.example.com/jira",
    );
  });

  it("rejects HTTP URLs to prevent plaintext PAT transmission", () => {
    expect(() => normalizeBaseUrl("http://jira.example.com")).toThrowError(
      "Jira base URL must use HTTPS",
    );
  });

  it("rejects credentials, query strings, and fragments", () => {
    expect(() => normalizeBaseUrl("https://user:pass@jira.example.com")).toThrow();
    expect(() => normalizeBaseUrl("https://jira.example.com?token=value")).toThrow();
    expect(() => normalizeBaseUrl("https://jira.example.com#fragment")).toThrow();
  });
});
