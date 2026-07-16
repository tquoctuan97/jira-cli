import { describe, expect, it } from "vitest";
import { createProgram } from "../src/cli/program.js";

describe("CLI command tree", () => {
  it("reports the v0.2.0 release and excludes the removed installer", () => {
    const program = createProgram();

    expect(program.version()).toBe("0.2.0");
    expect(program.commands.map((command) => command.name())).not.toContain("install");
  });

  it("rejects an unknown command before loading a Jira session", async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "jira-cli", "issue", "nonsense"]),
    ).rejects.toMatchObject({ code: "commander.unknownCommand" });
  });

  it("treats boolean global flags as flags instead of consuming the resource", async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "jira-cli", "--verbose", "unknown-resource"]),
    ).rejects.toMatchObject({ code: "commander.unknownCommand" });
    expect(program.opts().verbose).toBe(true);
  });
});
