import { Command } from "commander";
import type { SimpleIssueFields } from "../../application/issue-service.js";
import { readJsonInput } from "../io.js";
import { confirm, nonNegativeInteger, positiveInteger } from "../options.js";
import type { Runtime } from "../runtime.js";

type FieldOptions = SimpleIssueFields & { input?: string };

export function registerIssue(program: Command, runtime: Runtime): void {
  const issue = program.command("issue").description("Read and change Jira issues");

  issue
    .command("get <issue-key>")
    .description("Get an issue")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      const services = await runtime.jira(options);
      runtime.setResult(
        await services.issues.get(key, command.optsWithGlobals().fields, isRaw(options)),
      );
    });

  issue
    .command("search")
    .description("Search issues using JQL")
    .requiredOption("--jql <query>", "JQL query")
    .option("--start-at <number>", "zero-based result offset", nonNegativeInteger, 0)
    .option("--limit <number>", "page size", positiveInteger, 50)
    .option("--all", "retrieve multiple pages")
    .option("--max-items <number>", "maximum items with --all", positiveInteger, 200)
    .action(async (local: SearchOptions, command: Command) => {
      const options = runtime.options(command);
      const services = await runtime.jira(options);
      runtime.setResult(
        await services.issues.search({
          jql: local.jql,
          fields: command.optsWithGlobals().fields,
          startAt: local.startAt,
          limit: local.limit,
          all: Boolean(local.all),
          maxItems: local.maxItems,
          raw: isRaw(options),
        }),
      );
    });

  withIssueFields(issue.command("create").description("Create an issue"), true).action(
    async (local: FieldOptions, command: Command) => {
      const options = runtime.options(command);
      const input = local.input ? await readJsonInput(local.input) : undefined;
      const services = await runtime.jira(options);
      runtime.setResult(await services.issues.create(input, issueFields(local), isRaw(options)));
    },
  );

  withIssueFields(issue.command("update <issue-key>").description("Update an issue"), false).action(
    async (key: string, local: FieldOptions, command: Command) => {
      const options = runtime.options(command);
      const input = local.input ? await readJsonInput(local.input) : undefined;
      const services = await runtime.jira(options);
      runtime.setResult(await services.issues.update(key, input, issueFields(local)));
    },
  );

  issue
    .command("delete <issue-key>")
    .description("Delete an issue")
    .requiredOption("--confirm <issue-key>", "confirm the issue key")
    .action(async (key: string, local: { confirm: string }, command: Command) => {
      confirm(key, local.confirm);
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).issues.delete(key));
    });

  issue
    .command("create-meta")
    .description("Get issue creation metadata")
    .requiredOption("--project <key>", "project key")
    .requiredOption("--type <name-or-id>", "issue type")
    .action(async (local: { project: string; type: string }, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (
          await runtime.jira(options)
        ).issues.createMetadata(local.project, local.type, isRaw(options)),
      );
    });

  issue
    .command("edit-meta <issue-key>")
    .description("Get issue edit metadata")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).issues.editMetadata(key, isRaw(options)),
      );
    });

  issue
    .command("history <issue-key>")
    .description("Get issue history")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).issues.history(key, isRaw(options)));
    });

  issue
    .command("transitions <issue-key>")
    .description("List available transitions")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).issues.transitions(key, isRaw(options)),
      );
    });

  issue
    .command("transition <issue-key>")
    .description("Transition an issue")
    .requiredOption("--to <transition-or-status>", "exact transition ID, name, or status")
    .option("--input <file-or-dash>", "additional transition JSON")
    .action(async (key: string, local: { to: string; input?: string }, command: Command) => {
      const options = runtime.options(command);
      const input = local.input ? await readJsonInput(local.input) : undefined;
      runtime.setResult(
        await (await runtime.jira(options)).issues.transition(key, local.to, input),
      );
    });

  issue
    .command("assign <issue-key>")
    .description("Assign an issue")
    .requiredOption("--to <username-or-me>", "assignee")
    .action(async (key: string, local: { to: string }, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).issues.assign(key, local.to));
    });

  issue
    .command("unassign <issue-key>")
    .description("Unassign an issue")
    .action(async (key: string, _local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).issues.assign(key, null));
    });

  issue
    .command("link-types")
    .description("List issue link types")
    .action(async (_local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).issues.linkTypes(isRaw(options)));
    });

  issue
    .command("link <source-key> <target-key>")
    .description("Link two issues")
    .requiredOption("--type <link-type>", "exact link type")
    .action(async (source: string, target: string, local: { type: string }, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (await runtime.jira(options)).issues.link(source, target, local.type),
      );
    });

  issue
    .command("unlink <link-id>")
    .description("Delete an issue link")
    .requiredOption("--confirm <link-id>", "confirm the link ID")
    .action(async (id: string, local: { confirm: string }, command: Command) => {
      confirm(id, local.confirm);
      const options = runtime.options(command);
      runtime.setResult(await (await runtime.jira(options)).issues.unlink(id));
    });

  for (const watching of [true, false])
    issue
      .command(`${watching ? "watch" : "unwatch"} <issue-key>`)
      .description(`${watching ? "Watch" : "Stop watching"} an issue`)
      .action(async (key: string, _local: unknown, command: Command) => {
        const options = runtime.options(command);
        runtime.setResult(await (await runtime.jira(options)).issues.watch(key, watching));
      });

  issue
    .command("watchers <issue-key>")
    .description("Get issue watcher state")
    .option("--include-users", "include watcher details")
    .action(async (key: string, local: { includeUsers?: boolean }, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(
        await (
          await runtime.jira(options)
        ).issues.watchers(key, Boolean(local.includeUsers), isRaw(options)),
      );
    });
}

function withIssueFields(command: Command, includeProject: boolean): Command {
  if (includeProject) command.option("--project <key>", "project key");
  return command
    .option("--type <name-or-id>", "issue type")
    .option("--summary <text>", "summary")
    .option("--description <text>", "description")
    .option("--assignee <username-or-me>", "assignee")
    .option("--priority <name>", "priority")
    .option("--labels <csv>", "labels")
    .option("--parent <issue-key>", "parent issue")
    .option("--input <file-or-dash>", "JSON payload");
}

function issueFields(options: FieldOptions): SimpleIssueFields {
  const { input: _input, ...fields } = options;
  return fields;
}

function isRaw(options: { output: string }): boolean {
  return options.output === "raw";
}

type SearchOptions = {
  jql: string;
  startAt: number;
  limit: number;
  all?: boolean;
  maxItems: number;
};
