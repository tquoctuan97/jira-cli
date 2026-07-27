import { Command } from "commander";
import { invalidInput } from "../../domain/errors.js";
import { readTextInput } from "../io.js";
import { confirm } from "../options.js";
import type { Runtime } from "../runtime.js";

export function registerComment(program: Command, runtime: Runtime): void {
  const comment = program.command("comment").description("Read and change issue comments");

  comment
    .command("list <issue-key>")
    .description("List comments")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).comments.list(key, options.output === "raw"),
      );
    });

  comment
    .command("get <issue-key> <comment-id>")
    .description("Get a comment")
    .action(async (key: string, id: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).comments.get(key, id, options.output === "raw"),
      );
    });

  registerSave(comment, runtime, false);
  registerSave(comment, runtime, true);

  comment
    .command("delete <issue-key> <comment-id>")
    .description("Delete a comment")
    .requiredOption("--confirm <comment-id>", "confirm the comment ID")
    .action(async (key: string, id: string, local: { confirm: string }, command: Command) => {
      confirm(id, local.confirm);
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).comments.delete(key, id));
    });
}

function registerSave(parent: Command, runtime: Runtime, updating: boolean): void {
  parent
    .command(updating ? "update <issue-key> <comment-id>" : "add <issue-key>")
    .description(`${updating ? "Update" : "Add"} a comment`)
    .option("--body <text>", "comment body in Jira wiki markup")
    .option("--body-file <file-or-dash>", "read Jira wiki markup from a file or stdin")
    .action(async (...args: unknown[]) => {
      const command = args.at(-1) as Command;
      const local = args.at(-2) as { body?: string; bodyFile?: string };
      const key = args[0] as string;
      const id = updating ? (args[1] as string) : undefined;
      if (local.body !== undefined && local.bodyFile !== undefined)
        throw invalidInput("--body cannot be combined with --body-file");
      const body = local.body ?? (local.bodyFile ? await readTextInput(local.bodyFile) : undefined);
      if (body === undefined || body.length === 0)
        throw invalidInput("Provide --body or --body-file");
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).comments.save(key, id, body, options.output === "raw"),
      );
    });
}
