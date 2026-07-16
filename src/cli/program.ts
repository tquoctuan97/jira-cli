import { Command, CommanderError, Option } from "commander";
import { ZodError } from "zod";
import { CliError, invalidInput } from "../domain/errors.js";
import { registerAttachment } from "./commands/attachment.js";
import { registerAuth } from "./commands/auth.js";
import { registerComment } from "./commands/comment.js";
import { registerDiscovery } from "./commands/discovery.js";
import { registerIssue } from "./commands/issue.js";
import { outputOption, positiveInteger } from "./options.js";
import { writeError, writeResult } from "./output.js";
import { Runtime } from "./runtime.js";

export const VERSION = "0.2.0";

export function createProgram(runtime = new Runtime()): Command {
  const program = new Command();
  program
    .name("jira-cli")
    .description("AI-native CLI for Jira Data Center")
    .version(VERSION)
    .showHelpAfterError()
    .showSuggestionAfterError()
    .exitOverride()
    .configureOutput({ writeErr: () => undefined })
    .option("--config <path>", "override the session configuration path")
    .addOption(outputOption)
    .option("-f, --fields <csv>", "fields to return")
    .option("--output-file <path>", "write command output to a file")
    .option("--timeout <ms>", "request timeout", positiveInteger)
    .option("--quiet", "suppress non-result diagnostics")
    .option("--verbose", "include safe diagnostics")
    .addOption(new Option("--no-color", "disable ANSI colors"));

  registerAuth(program, runtime);
  registerIssue(program, runtime);
  registerComment(program, runtime);
  registerAttachment(program, runtime);
  registerDiscovery(program, runtime);
  return program;
}

export async function run(argv = process.argv): Promise<void> {
  const runtime = new Runtime();
  const program = createProgram(runtime);
  try {
    await program.parseAsync(argv);
    if (runtime.result) await writeResult(runtime.result, runtime.options(program));
  } catch (error) {
    if (
      error instanceof CommanderError &&
      ["commander.helpDisplayed", "commander.version"].includes(error.code)
    )
      return;
    const safe = normalizeError(error);
    const output = readOutputFormat(program);
    writeError(safe, output);
    process.exitCode = safe.exitCode;
  }
}

function normalizeError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  if (error instanceof CommanderError) return invalidInput(error.message);
  if (error instanceof ZodError)
    return invalidInput(
      "Invalid command options",
      error.issues.map((issue) => issue.message),
    );
  return new CliError("INTERNAL_ERROR", "Unexpected error", 7);
}

function readOutputFormat(program: Command): "json" | "raw" | "markdown" | "text" {
  const output = program.opts().output;
  return ["json", "raw", "markdown", "text"].includes(output) ? output : "json";
}
