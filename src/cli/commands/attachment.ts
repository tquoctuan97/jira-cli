import { Command } from "commander";
import { invalidInput } from "../../domain/errors.js";
import { confirm } from "../options.js";
import type { Runtime } from "../runtime.js";

export function registerAttachment(program: Command, runtime: Runtime): void {
  const attachment = program.command("attachment").description("Manage issue attachments");

  attachment
    .command("list <issue-key>")
    .description("List issue attachments")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).attachments.list(key, options.output === "raw"),
      );
    });

  attachment
    .command("add <issue-key> <files...>")
    .description("Upload one or more files")
    .action(async (key: string, files: string[], _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).attachments.add(key, files, options.output === "raw"),
      );
    });

  attachment
    .command("download <attachment-id>")
    .description("Download an attachment")
    .option("--force", "overwrite an existing destination")
    .action(async (id: string, local: { force?: boolean }, command: Command) => {
      const options = runtime.options(command);
      if (!options.outputFile)
        throw invalidInput("The --output-file <path> option is required for attachment downloads");
      runtime.setResult(
        await (
          await runtime.jira(options)
        ).attachments.download(id, options.outputFile, Boolean(local.force)),
        true,
      );
    });

  attachment
    .command("delete <attachment-id>")
    .description("Delete an attachment")
    .requiredOption("--confirm <attachment-id>", "confirm the attachment ID")
    .action(async (id: string, local: { confirm: string }, command: Command) => {
      confirm(id, local.confirm);
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).attachments.delete(id));
    });
}
