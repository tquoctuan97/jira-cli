import { writeFile } from "node:fs/promises";
import type { CommandResult, GlobalOptions, OutputFormat } from "../application/contracts.js";
import { CliError } from "../domain/errors.js";

export async function writeResult(result: CommandResult, options: GlobalOptions): Promise<void> {
  const content = format(result.value, options.output);
  if (options.outputFile && !result.outputFileHandled) {
    await writeFile(options.outputFile, `${content}\n`);
    return;
  }
  process.stdout.write(`${content}\n`);
}

export function writeError(error: CliError, format: OutputFormat): void {
  if (format === "json" || format === "raw") {
    process.stderr.write(
      `${JSON.stringify(
        {
          error: {
            code: error.code,
            message: error.message,
            retryable: false,
            ...(error.details === undefined ? {} : { details: error.details }),
          },
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  process.stderr.write(`${error.code}: ${error.message}\n`);
}

function format(value: unknown, output: OutputFormat): string {
  if (output === "json" || output === "raw") return JSON.stringify(value, null, 2);
  if (typeof value === "string") return value;
  if (output === "markdown" && value && typeof value === "object" && !Array.isArray(value))
    return Object.entries(value)
      .map(([key, child]) => `- **${key}**: ${renderValue(child)}`)
      .join("\n");
  return JSON.stringify(value, null, 2);
}

function renderValue(value: unknown): string {
  return value && typeof value === "object" ? JSON.stringify(value) : String(value);
}
