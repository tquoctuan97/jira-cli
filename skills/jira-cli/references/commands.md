# Command reference

## Authentication

```bash
jira-cli auth login
jira-cli auth status
jira-cli auth logout
```

Use `JIRA_BASE_URL` and `JIRA_TOKEN`, or `--token-stdin`, for automation. Never pass a token as an argument.

## Issues

```bash
jira-cli issue get <issue-key> [--fields <csv>]
jira-cli issue search --jql <query> [--start-at <n>] [--limit <n>]
jira-cli issue search --jql <query> --all [--max-items <n>]
jira-cli issue create [field-options]
jira-cli issue create --input <file-or-dash>
jira-cli issue update <issue-key> [field-options]
jira-cli issue update <issue-key> --input <file-or-dash>
jira-cli issue delete <issue-key> --confirm <issue-key>
jira-cli issue create-meta --project <key> --type <name-or-id>
jira-cli issue edit-meta <issue-key>
jira-cli issue history <issue-key>
```

Simple fields are `--project`, `--type`, `--summary`, `--description`, `--assignee`, `--priority`, `--labels`, and `--parent`. Project is create-only.

## Workflow, assignment, links, and watchers

```bash
jira-cli issue transitions <issue-key>
jira-cli issue transition <issue-key> --to <exact-id-name-or-status>
jira-cli issue assign <issue-key> --to <username-or-me>
jira-cli issue unassign <issue-key>
jira-cli issue link-types
jira-cli issue link <source-key> <target-key> --type <exact-id-or-name>
jira-cli issue unlink <link-id> --confirm <link-id>
jira-cli issue watch <issue-key>
jira-cli issue unwatch <issue-key>
jira-cli issue watchers <issue-key> [--include-users]
```

## Comments and attachments

```bash
jira-cli comment list <issue-key>
jira-cli comment get <issue-key> <comment-id>
jira-cli comment add <issue-key> --body <text>
jira-cli comment update <issue-key> <comment-id> --body <text>
jira-cli comment delete <issue-key> <comment-id> --confirm <comment-id>
jira-cli attachment list <issue-key>
jira-cli attachment add <issue-key> <file> [additional-files...]
jira-cli attachment download <attachment-id> --output-file <path>
jira-cli attachment delete <attachment-id> --confirm <attachment-id>
```

Use `--body-file <file-or-dash>` for long comment bodies.

## Discovery

```bash
jira-cli project list
jira-cli project get <project-key>
jira-cli field list
jira-cli user find --query <text>
jira-cli user find --assignable-to <issue-key>
```

Global output options include `--output json|raw|markdown|text`, `--fields <csv>`, `--output-file <path>`, and `--timeout <ms>`.
