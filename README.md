# jira-cli

Jira Data Center CLI with SKILLS.

`jira-cli` gives coding agents and developers a concise, deterministic interface
to Jira Data Center. It hides REST details, normalizes noisy Jira responses, and
keeps commands discoverable through `--help`.

The CLI works on its own and ships with an optional first-party Skill for more
reliable agent workflows.

> [!IMPORTANT]
> `jira-cli` is currently an early-development release. Implemented commands are
> tested, but public contracts may change before version 1.0.

## Why jira-cli?

Calling Jira directly from a coding agent works, but often requires large REST
responses, Jira-specific pagination and field knowledge, repeated authentication
setup, and custom error handling.

`jira-cli` provides one reusable boundary between agents, scripts, and Jira:

```text
coding agent / script
         |
         v
     jira-cli
         |
         v
Jira Data Center REST API
```

Commands return compact, predictable results so agents can spend their context
on the task instead of Jira transport details.

## Design goals

- Provide stable support for Jira Data Center 9.12.x.
- Keep commands concise and discoverable through `--help`.
- Produce deterministic, schema-friendly output and errors.
- Reduce token usage through compact defaults, field selection, and bounded
  pagination.
- Keep application logic independent from the command-line framework.
- Ship a first-party Skill and reusable core for future integrations.

## Non-goals for V1

- Replacing the Jira web interface.
- Supporting Jira Cloud.
- Covering every Jira REST or administration endpoint.
- Generating JQL with a built-in language model.
- Hiding Jira permissions, workflow rules, or field configuration.

## Supported platform

- Jira Data Center 9.12.x.
- Jira Core REST API 9.12.14.
- Node.js 20 or newer on Linux, macOS, Windows, and WSL.
- Personal Access Token authentication over HTTPS.

## Key features

- **Token-efficient** normalized Jira output.
- **Agent-ready** command help and installable Skill.
- **Safe mutations** with exact confirmation for destructive operations.
- **Multiple output formats** for agents, humans, and shell automation.
- **Predictable errors** and exit codes for automation.
- **Raw output escape hatch** for instance-specific fields and integrations.

### jira-cli vs direct Jira REST API

- **CLI**: Best suited to coding agents and terminal workflows. Commands expose a
  small, stable interface and return compact JSON without loading large API tool
  schemas or raw Jira payloads into the model context.
- **REST API**: Better for custom applications that need endpoints or response
  fields outside the CLI contract. Use `--output raw` before dropping down to
  direct REST calls.

### Requirements

- Node.js 20 or newer.
- Jira Data Center with Personal Access Token support.
- A coding agent such as Codex, Claude Code, or GitHub Copilot is optional.

## Getting started

### Installation

```bash
npm install --global @tquoctuan97/jira-cli@latest
jira-cli --help
```

### Authentication

```bash
jira-cli auth login
jira-cli auth status
```

`auth login` accepts only HTTPS Jira URLs. The PAT is entered without terminal
echo and stored in `~/.config/jira-cli/credentials.json` on Linux and WSL. The
file is plaintext and protected with filesystem permission `0600`.

For automation, provide credentials without command-line arguments:

```bash
printf '%s' "$JIRA_TOKEN" |
  jira-cli auth login --base-url "$JIRA_BASE_URL" --token-stdin
```

### Installing skills

Install the bundled Skill for the current project:

```bash
jira-cli install --skills
```

This creates `.agents/skills/jira-cli`. Install it for the current user instead:

```bash
jira-cli install --skills --global
```

Use `--force` to replace an existing Skill installation.

### Skills-less operation

Point your agent at the CLI and let it discover commands through help:

```text
Find my unresolved Jira issues and summarize the three most recently updated.
Use jira-cli and check jira-cli --help for available commands.
```

## Examples

```bash
# Read a compact issue view
jira-cli issue get FE-123 --fields key,summary,status,assignee

# Search with bounded pagination
jira-cli issue search \
  --jql 'project = FE AND statusCategory != Done ORDER BY updated DESC' \
  --fields key,summary,status,assignee,updated \
  --limit 20

# Discover and execute an exact workflow transition
jira-cli issue transitions FE-123
jira-cli issue transition FE-123 --to 31

# Add a comment
jira-cli comment add FE-123 --body 'Ready for review'

# Download an attachment without overwriting an existing file
jira-cli attachment download 10042 --output-file ./report.pdf
```

## Output formats

JSON is the default machine-readable format. The same command can return a
human-readable summary or the original Jira response when needed:

```bash
jira-cli issue get FE-123                         # normalized JSON
jira-cli issue get FE-123 --output markdown       # agent-friendly Markdown
jira-cli issue get FE-123 --output text           # concise terminal output
jira-cli issue get FE-123 --output raw            # original Jira response
```

Use `--fields` to return only the data needed for the task, or `--output-file`
to keep large results out of the agent context:

```bash
jira-cli issue search \
  --jql 'project = FE ORDER BY updated DESC' \
  --fields key,summary,status \
  --output-file ./issues.json
```

## Commands

### Authentication and installation

```bash
jira-cli auth login
jira-cli auth status
jira-cli auth logout
jira-cli install --skills [--global] [--force]
```

### Issues

```bash
jira-cli issue get <issue-key>
jira-cli issue search --jql <query>
jira-cli issue create [field-options]
jira-cli issue create --input <file-or-dash>
jira-cli issue update <issue-key> [field-options]
jira-cli issue update <issue-key> --input <file-or-dash>
jira-cli issue delete <issue-key> --confirm <issue-key>
jira-cli issue create-meta --project <key> --type <name-or-id>
jira-cli issue edit-meta <issue-key>
jira-cli issue history <issue-key>
```

Simple field options include `--project`, `--type`, `--summary`, `--description`,
`--assignee`, `--priority`, `--labels`, and `--parent`. Project is create-only.

### Workflow and collaboration

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

### Comments and attachments

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

### Discovery

```bash
jira-cli project list
jira-cli project get <project-key>
jira-cli field list
jira-cli user find --query <text>
jira-cli user find --assignable-to <issue-key>
```

### Global options

```text
    --config <path>        Override the session configuration path
-o, --output <format>      json, raw, markdown, or text
-f, --fields <fields>      Comma-separated fields to return
    --output-file <path>   Write command output to a file
    --timeout <ms>         Request timeout
    --quiet                Suppress non-result diagnostics
    --verbose              Include safe diagnostics
```

Run command-level help for the authoritative interface:

```bash
jira-cli --help
jira-cli issue --help
jira-cli issue search --help
```

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Detailed product scope and architecture live in [`docs/`](./docs/).

## License

[MIT](./LICENSE)
