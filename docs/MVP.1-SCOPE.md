# jira-cli MVP.1 Scope

- Status: Approved scope baseline
- Target: First end-to-end usable release
- Jira compatibility: Jira Data Center 9.12.x
- REST contract: Jira Core REST API 9.12.14

## Purpose

MVP.1 delivers a complete Jira Core workflow for a developer working from the
terminal or through an AI coding agent. A user can authenticate once, discover
work, inspect an issue, create or edit it, move it through its workflow,
collaborate through comments and attachments, manage relationships, and safely
delete an issue without opening Jira Web for those operations.

MVP.1 is deliberately not a Jira administration client and does not attempt to
cover every REST endpoint. Jira Software board, backlog, and sprint workflows
use a separate Agile API and are deferred to a later milestone.

This document is the source of truth for MVP.1 scope. Changes to the included
commands, REST APIs, security model, or acceptance criteria require an explicit
scope update. Architectural decisions required to implement the scope are
recorded under [`docs/ADR`](./ADR/README.md).

## Product principles

- The executable is always `jira-cli`.
- Commands are resource-oriented and discoverable through `--help`.
- The CLI is non-interactive by default except for credential entry and explicit
  destructive-operation confirmation.
- JSON is the default machine interface.
- Normalized output excludes token-heavy Jira presentation metadata.
- Raw Jira responses remain available through `--output raw`.
- Business logic is independent from the CLI framework.
- PATs never appear in stdout, stderr, errors, snapshots, or process arguments.
- Behavior is supported and tested on Windows, macOS, WSL, and Linux.

## Target users

Primary:

- AI coding agents operating inside a developer workspace;
- developers who prefer terminal workflows;
- scripts and CI jobs that require deterministic Jira operations.

Secondary:

- DevOps engineers automating issue workflows.

## End-to-end user journeys

### Authenticate and inspect assigned work

```bash
jira-cli auth login
jira-cli auth status

jira-cli issue search \
  --jql "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC"

jira-cli issue get FE-123
jira-cli issue history FE-123
```

### Create and start an issue

```bash
jira-cli issue create \
  --project FE \
  --type Bug \
  --summary "Login returns 500" \
  --description "The login endpoint returns HTTP 500 for an active user"

jira-cli issue assign FE-123 --to me
jira-cli issue transitions FE-123
jira-cli issue transition FE-123 --to "In Progress"
```

### Collaborate on an issue

```bash
jira-cli comment add FE-123 --body "Root cause identified"
jira-cli attachment add FE-123 ./error.log
jira-cli issue link FE-123 BE-456 --type Blocks
jira-cli issue watch FE-123
```

### Complete an issue

```bash
jira-cli comment add FE-123 --body "PR merged and verified"
jira-cli issue transition FE-123 --to Done
```

### Remove an issue safely

```bash
jira-cli issue delete FE-123 --confirm FE-123
```

## In-scope command surface

### Common commands

```bash
jira-cli --help
jira-cli --version
jira-cli <resource> --help
jira-cli <resource> <action> --help
```

### Authentication

```bash
jira-cli auth login
jira-cli auth status
jira-cli auth logout
```

`auth login` prompts for a Jira base URL and hidden PAT when attached to a TTY:

```text
Jira base URL: https://jira.example.com
Personal access token: ********
```

Automation can supply the URL through `--base-url` or `JIRA_BASE_URL` and the
PAT through `--token-stdin` or `JIRA_TOKEN`. There is no `--pat` option because
command arguments may appear in shell history or process listings.

MVP.1 stores one active Jira session. Named profiles are out of scope.

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

Minimum simple field options for create and update:

```text
--project
--type
--summary
--description
--assignee
--priority
--labels
--parent
```

Complex values, custom fields, and Jira update operations use JSON input. Field
options and `--input` cannot be combined in the same invocation.

Search supports:

```text
--jql <query>
--fields <comma-separated-fields>
--start-at <number>
--limit <number>
--all
--max-items <number>
```

Search never retrieves every page unless `--all` is explicitly supplied, and
`--all` requires a bounded `--max-items` default.

### Workflow and assignment

```bash
jira-cli issue transitions <issue-key>
jira-cli issue transition <issue-key> --to <transition-or-status>
jira-cli issue transition <issue-key> --to <value> --input <file-or-dash>
jira-cli issue assign <issue-key> --to <username-or-me>
jira-cli issue unassign <issue-key>
```

`issue transition` resolves `--to` using this order:

1. Exact transition ID.
2. Exact transition name.
3. Exact destination status name.

If more than one transition matches, the command fails with an ambiguity error
and returns the available transition IDs. It never chooses a transition based on
a fuzzy match.

### Comments

```bash
jira-cli comment list <issue-key>
jira-cli comment get <issue-key> <comment-id>
jira-cli comment add <issue-key> --body <text>
jira-cli comment add <issue-key> --body-file <file-or-dash>
jira-cli comment update <issue-key> <comment-id> --body <text>
jira-cli comment update <issue-key> <comment-id> --body-file <file-or-dash>
jira-cli comment delete <issue-key> <comment-id> --confirm <comment-id>
```

Comment visibility restrictions may be accepted through JSON input. The CLI
preserves Jira permission errors and does not attempt to bypass restricted
comments.

### Attachments

```bash
jira-cli attachment list <issue-key>
jira-cli attachment add <issue-key> <file> [additional-files...]
jira-cli attachment download <attachment-id> --output-file <path>
jira-cli attachment delete <attachment-id> --confirm <attachment-id>
```

Attachment behavior:

- upload validates Jira attachment support and maximum size first;
- upload sends `X-Atlassian-Token: no-check` as required by Jira;
- download writes binary content to a file, not stdout, by default;
- download does not overwrite an existing path without `--force`;
- normalized metadata omits thumbnail and content URLs;
- file failures identify the affected file without leaking credentials.

### Issue links

```bash
jira-cli issue link-types
jira-cli issue link <source-key> <target-key> --type <link-type>
jira-cli issue unlink <link-id> --confirm <link-id>
```

Link type resolution uses exact ID or exact name. Direction is determined by the
source and target arguments and must be represented explicitly in normalized
output.

### Watching

```bash
jira-cli issue watch <issue-key>
jira-cli issue unwatch <issue-key>
jira-cli issue watchers <issue-key>
jira-cli issue watchers <issue-key> --include-users
```

The default watcher response contains only whether the current user is watching
and the watcher count. User details are returned only with `--include-users`.

### Supporting discovery

```bash
jira-cli project list
jira-cli project get <project-key>
jira-cli field list
jira-cli user find --query <text>
jira-cli user find --assignable-to <issue-key>
```

These commands exist to resolve valid project keys, field IDs, issue types, and
assignees for the issue workflows. They do not provide project, field, or user
administration.

## Global options

The following options apply where relevant:

```text
    --config <path>        Override non-secret configuration location
-o, --output <format>      json, markdown, text, or raw
-f, --fields <fields>      Comma-separated fields to return
    --output-file <path>   Write a result to a file
    --timeout <ms>         Request timeout
    --quiet                Suppress non-result diagnostics
    --verbose              Include safe diagnostics on stderr
    --no-color             Disable ANSI colors
```

JSON is the default. Markdown and text formatting may initially support only
issue and comment content. `raw` returns the Jira response and is explicitly not
a stable cross-version schema.

## REST API support matrix

The following Jira Core 9.12.14 endpoints are in scope.

### Authentication

| Method | Endpoint             | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| `GET`  | `/rest/api/2/myself` | Validate PAT and obtain current user |

### Issue CRUD, search, and metadata

| Method   | Endpoint                                                                 | Purpose                                     |
| -------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| `POST`   | `/rest/api/2/search`                                                     | JQL search with projection and pagination   |
| `GET`    | `/rest/api/2/issue/{issueIdOrKey}`                                       | Read issue and optional changelog expansion |
| `POST`   | `/rest/api/2/issue`                                                      | Create issue or sub-task                    |
| `PUT`    | `/rest/api/2/issue/{issueIdOrKey}`                                       | Update issue fields and operations          |
| `DELETE` | `/rest/api/2/issue/{issueIdOrKey}`                                       | Delete issue                                |
| `GET`    | `/rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes`               | Discover issue types allowed for create     |
| `GET`    | `/rest/api/2/issue/createmeta/{projectIdOrKey}/issuetypes/{issueTypeId}` | Discover create fields                      |
| `GET`    | `/rest/api/2/issue/{issueIdOrKey}/editmeta`                              | Discover editable fields and operations     |

Issue history uses `GET /rest/api/2/issue/{issueIdOrKey}` with
`expand=changelog`. It is not included in every issue response because history
can be large.

### Workflow and assignment

| Method | Endpoint                                       | Purpose                                          |
| ------ | ---------------------------------------------- | ------------------------------------------------ |
| `GET`  | `/rest/api/2/issue/{issueIdOrKey}/transitions` | Discover allowed transitions and required fields |
| `POST` | `/rest/api/2/issue/{issueIdOrKey}/transitions` | Perform a workflow transition                    |
| `PUT`  | `/rest/api/2/issue/{issueIdOrKey}`             | Assign or unassign through the assignee field    |

Transition discovery uses `expand=transitions.fields` when required fields are
needed.

### Comments

| Method   | Endpoint                                        | Purpose        |
| -------- | ----------------------------------------------- | -------------- |
| `GET`    | `/rest/api/2/issue/{issueIdOrKey}/comment`      | List comments  |
| `GET`    | `/rest/api/2/issue/{issueIdOrKey}/comment/{id}` | Read comment   |
| `POST`   | `/rest/api/2/issue/{issueIdOrKey}/comment`      | Add comment    |
| `PUT`    | `/rest/api/2/issue/{issueIdOrKey}/comment/{id}` | Update comment |
| `DELETE` | `/rest/api/2/issue/{issueIdOrKey}/comment/{id}` | Delete comment |

### Attachments

| Method   | Endpoint                                       | Purpose                                 |
| -------- | ---------------------------------------------- | --------------------------------------- |
| `GET`    | `/rest/api/2/attachment/meta`                  | Check attachment support and size limit |
| `POST`   | `/rest/api/2/issue/{issueIdOrKey}/attachments` | Upload one or more files                |
| `DELETE` | `/rest/api/2/attachment/{id}`                  | Delete attachment                       |

Attachment listing and content URLs are obtained from requested issue fields.
The download command follows the authenticated attachment content URL returned
by Jira and applies the same base URL and credential safety checks.

### Issue links

| Method   | Endpoint                         | Purpose                   |
| -------- | -------------------------------- | ------------------------- |
| `GET`    | `/rest/api/2/issueLinkType`      | List available link types |
| `POST`   | `/rest/api/2/issueLink`          | Link two issues           |
| `DELETE` | `/rest/api/2/issueLink/{linkId}` | Remove an issue link      |

Existing issue links are obtained from the issue response when the field is
requested.

### Watchers

| Method   | Endpoint                                    | Purpose                                    |
| -------- | ------------------------------------------- | ------------------------------------------ |
| `GET`    | `/rest/api/2/issue/{issueIdOrKey}/watchers` | Get watch state, count, and optional users |
| `POST`   | `/rest/api/2/issue/{issueIdOrKey}/watchers` | Add a watcher                              |
| `DELETE` | `/rest/api/2/issue/{issueIdOrKey}/watchers` | Remove a watcher                           |

MVP.1 exposes watch and unwatch for the current user. Managing other users as
watchers is not required.

### Supporting discovery

| Method | Endpoint                               | Purpose                                      |
| ------ | -------------------------------------- | -------------------------------------------- |
| `GET`  | `/rest/api/2/project`                  | List visible projects                        |
| `GET`  | `/rest/api/2/project/{projectIdOrKey}` | Read project metadata                        |
| `GET`  | `/rest/api/2/field`                    | List system and custom fields                |
| `GET`  | `/rest/api/2/user/picker`              | Find users                                   |
| `GET`  | `/rest/api/2/user/assignable/search`   | Find users assignable to an issue or project |

If a target Jira instance exposes a different documented user-search variant,
the adapter may use it internally without changing the normalized `user find`
contract.

## Normalized output contract

Normalized JSON is not a copy of the Jira REST response. It retains information
needed to understand an issue or perform the next command and removes transport,
visual, duplicated, and irrelevant data.

Fields removed by default include:

- `avatarUrls`, thumbnails, and icon URLs;
- REST `self`, content, and navigation URLs;
- `expand`, schemas, and Jira rendering metadata;
- HTML fragments intended for the Jira UI;
- duplicated rendered and raw values;
- empty objects, empty arrays, and meaningless `null` values;
- redundant nested user, project, status, priority, and issue-type metadata.

Fields retained include:

- issue keys and Jira IDs required by later commands;
- usernames, project keys, transition IDs, comment IDs, attachment IDs, and link
  IDs;
- human-meaningful names and workflow state;
- explicitly requested fields;
- requested descriptions, comments, labels, links, and timestamps;
- custom-field IDs and values when requested.

`issue get` requests `summary`, `description`, `issuetype`, `status`,
`priority`, `project`, `assignee`, `reporter`, `labels`, `parent`, `created`,
`updated`, `resolution`, `components`, and `fixVersions` by default. `issue
search` uses the compact default of `summary`, `issuetype`, `status`, `priority`,
`project`, `assignee`, `labels`, `parent`, `created`, and `updated`. Explicit
`--fields` replaces the applicable list and can retain custom or unknown Jira
fields. Raw output without `--fields` remains unfiltered.

`issue context <issue-key>` returns a stable JSON envelope with `issue`,
`comments`, `attachments`, and `links`. The comments section contains `total`,
`returned`, `hasMore`, and `items`; comments are newest-first and limited to 20
by default. Context deliberately retains empty collections, and
`--comment-limit 0` skips the comments request.

Example issue output:

```json
{
  "id": "10042",
  "key": "FE-123",
  "summary": "Login returns 500",
  "type": {
    "id": "1",
    "name": "Bug"
  },
  "status": {
    "id": "3",
    "name": "In Progress",
    "category": "indeterminate"
  },
  "priority": {
    "id": "2",
    "name": "High"
  },
  "assignee": {
    "username": "daniel",
    "displayName": "Daniel"
  },
  "labels": ["backend", "login"],
  "updated": "2026-07-15T10:30:00+07:00"
}
```

## Process and error contract

- `stdout` contains only the requested result.
- `stderr` contains warnings and safe diagnostics.
- JSON output never contains ANSI formatting.
- Timestamps use ISO 8601.
- Empty successful collections return exit code `0`.
- Mutations are not retried unless their idempotency is known.
- Jira permission and validation behavior is preserved in normalized errors.

Required exit codes:

| Code | Meaning                                       |
| ---: | --------------------------------------------- |
|  `0` | Success                                       |
|  `2` | Invalid command input                         |
|  `3` | Configuration or authentication error         |
|  `4` | Jira resource not found                       |
|  `5` | Permission denied                             |
|  `6` | Jira validation, ambiguity, or workflow error |
|  `7` | Network or Jira server error                  |
|  `8` | Partial result                                |

Destructive operations require an exact resource identifier through `--confirm`
in non-interactive execution. `--quiet`, piped stdin, CI, or detection of an AI
agent never implies consent.

## Session and platform requirements

MVP.1 must work across new terminal processes and machine restarts on:

- Windows;
- macOS;
- Linux;
- WSL.

The base URL and non-secret metadata use the platform application-data location.
The PAT uses the credential-store abstraction and the application credential
file selected in [`ADR-0001`](./ADR/0001-session-and-credential-storage.md).
On Linux and WSL it is stored in
`$XDG_CONFIG_HOME/jira-cli/credentials.json`, falling back to
`~/.config/jira-cli/credentials.json`. The file is plaintext, written atomically,
and restricted to mode `0600`.

`auth logout` removes both the credential and session metadata. Partial cleanup
returns a non-zero exit code and identifies what remains without revealing the
PAT.

## Explicitly out of scope

The following are not part of MVP.1:

- named profiles or simultaneous Jira sessions;
- Jira Cloud;
- Jira Software Agile board, backlog, and sprint APIs;
- worklog and time-tracking CRUD;
- project, field, user, workflow, screen, or scheme administration;
- dashboard and filter management;
- votes;
- issue and comment properties;
- notification email APIs;
- remote issue links;
- archived-issue restore;
- cluster, monitoring, license, reindex, and other administration APIs;
- AI Skill distribution;
- MCP or HTTP server adapters;
- automatic JQL generation with a built-in language model.

Custom Jira apps may add fields, workflow validators, or content formats. MVP.1
supports these through metadata discovery, JSON input, custom-field passthrough,
normalized errors, and `--output raw`; it does not implement plugin-specific
commands.

## Acceptance criteria

MVP.1 is complete only when all criteria below pass.

### Installation and platform

- A clean package installation exposes `jira-cli --help` on Windows, macOS,
  Linux, and WSL.
- Paths, stdin, stdout, stderr, Unicode, and binary attachment handling work on
  every supported platform.
- CI covers Windows, macOS, and Linux; WSL has a documented manual verification
  run.

### Authentication

- A user can enter a base URL and hidden PAT through `auth login`.
- Invalid URL, TLS, credential, permission, and server errors are distinguishable.
- Successful login persists across terminal processes and machine restarts.
- `auth status` reports the base URL and current normalized user without the PAT.
- `auth logout` removes the complete session.
- PAT values never appear in output, errors, logs, snapshots, or command
  arguments.

### Issue lifecycle

- A user can create a standard issue and sub-task.
- A user can read an issue using compact defaults or selected fields.
- A user can search with JQL and bounded pagination.
- A user can update simple and custom fields.
- A user can discover and execute a valid workflow transition, including one
  that requires transition fields.
- A user can assign to self, assign to another valid user, and unassign.
- A user can delete an issue only with explicit confirmation.

### Collaboration

- A user can list, read, add, update, and delete permitted comments.
- A user can list, upload, download, and delete permitted attachments.
- A user can discover link types, link two issues, and remove a link.
- A user can watch and unwatch an issue and inspect watcher state.
- A user can request normalized issue history without including it in every
  issue response.

### Output and compatibility

- Default JSON excludes avatars, icons, REST links, UI HTML, and redundant Jira
  metadata.
- Identifiers needed for subsequent commands are preserved.
- Explicitly requested and custom fields are not silently discarded.
- `--output raw` is available for unsupported Jira data.
- Golden tests cover normalized issue, search, metadata, transition, comment,
  attachment, link, watcher, history, and error responses.
- Contract tests pass against a Jira Data Center 9.12.x environment.

## Release boundary

Passing only issue CRUD is not sufficient to declare MVP.1 complete. The release
must satisfy authentication, issue lifecycle, collaboration, normalized output,
security, and cross-platform acceptance criteria together.

Any capability in the out-of-scope list is scheduled separately and must not
block MVP.1 unless this document is deliberately revised.
