import { Command } from "commander";
import { invalidInput } from "../../domain/errors.js";
import type { Runtime } from "../runtime.js";

export function registerDiscovery(program: Command, runtime: Runtime): void {
  const project = program.command("project").description("Discover Jira projects");
  project
    .command("list")
    .description("List projects")
    .action(async (_local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).discovery.projects(options.output === "raw"),
      );
    });
  project
    .command("get <project-key>")
    .description("Get a project")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).discovery.project(key, options.output === "raw"),
      );
    });

  program
    .command("field")
    .description("Discover Jira fields")
    .command("list")
    .description("List fields")
    .action(async (_local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).discovery.fields(options.output === "raw"),
      );
    });

  program
    .command("user")
    .description("Discover Jira users")
    .command("find")
    .description("Find users")
    .option("--query <text>", "username or display-name query")
    .option("--assignable-to <issue-key>", "find users assignable to an issue")
    .action(async (local: { query?: string; assignableTo?: string }, command: Command) => {
      if (!local.query && !local.assignableTo)
        throw invalidInput("Provide --query or --assignable-to");
      const options = runtime.options(command);
      runtime.setResult(
        await (
          await runtime.jira(options)
        ).discovery.users(local.query, local.assignableTo, options.output === "raw"),
      );
    });
}
