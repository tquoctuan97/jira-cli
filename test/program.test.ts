import { describe, expect, it, vi } from "vitest";
import { createProgram } from "../src/cli/program.js";
import { commentLimit } from "../src/cli/options.js";
import { Runtime } from "../src/cli/runtime.js";

describe("CLI command tree", () => {
  it("reports the package release version and excludes the removed installer", () => {
    const program = createProgram();

    expect(program.version()).toBe("0.3.1");
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

  it("validates context comment limits at the command parser boundary", async () => {
    expect(commentLimit("0")).toBe(0);
    expect(commentLimit("100")).toBe(100);
    expect(() => commentLimit("101")).toThrow("between 0 and 100");
    expect(() => commentLimit("-1")).toThrow("non-negative integer");

    const program = createProgram();
    await expect(
      program.parseAsync([
        "node",
        "jira-cli",
        "issue",
        "context",
        "FE-1",
        "--comment-limit",
        "101",
      ]),
    ).rejects.toMatchObject({ code: "commander.invalidArgument" });
  });

  it("propagates quiet through the runtime options schema", async () => {
    const program = createProgram();
    await expect(
      program.parseAsync(["node", "jira-cli", "--quiet", "unknown-resource"]),
    ).rejects.toMatchObject({ code: "commander.unknownCommand" });
    expect(new Runtime().options(program).quiet).toBe(true);
  });

  it("documents Jira wiki markup for rich-text inputs", () => {
    const program = createProgram();
    const issueCreate = findCommand(findCommand(program, "issue"), "create");
    const commentAdd = findCommand(findCommand(program, "comment"), "add");

    expect(issueCreate.options.find((option) => option.long === "--description")?.description).toBe(
      "description in Jira wiki markup",
    );
    expect(commentAdd.options.find((option) => option.long === "--body")?.description).toBe(
      "comment body in Jira wiki markup",
    );
    expect(commentAdd.options.find((option) => option.long === "--body-file")?.description).toBe(
      "read Jira wiki markup from a file or stdin",
    );
  });

  it("uses the global output file option as the attachment download destination", async () => {
    const runtime = new Runtime();
    const download = vi.fn().mockResolvedValue({ downloaded: "55342" });
    vi.spyOn(runtime, "jira").mockResolvedValue({
      issues: {} as never,
      comments: {} as never,
      attachments: { download } as never,
      discovery: {} as never,
    });
    const program = createProgram(runtime);

    await program.parseAsync([
      "node",
      "jira-cli",
      "attachment",
      "download",
      "55342",
      "--output-file",
      "/tmp/video.mp4",
    ]);

    expect(download).toHaveBeenCalledWith("55342", "/tmp/video.mp4", false);
    expect(runtime.result).toMatchObject({ outputFileHandled: true });
  });
});

function findCommand(parent: ReturnType<typeof createProgram>, name: string) {
  const command = parent.commands.find((candidate) => candidate.name() === name);
  if (!command) throw new Error(`Command '${name}' was not registered`);
  return command;
}
