# jira-cli Roadmap

This roadmap turns the product direction in [`PRD.md`](../PRD.md) into
incremental, end-to-end releases. Each milestone must be usable on its own and
must preserve the public CLI and normalized output contracts documented in the
root [`README.md`](../README.md).

The approved command, REST API, and acceptance-criteria boundary for the first
release is defined in [`MVP.1-SCOPE.md`](./MVP.1-SCOPE.md). If this roadmap and
the scope document differ, the scope document governs MVP.1.

## Delivery principles

- Build vertical slices instead of implementing all layers in isolation.
- Keep command handlers thin and business logic reusable outside the CLI.
- Treat normalized JSON, error codes, stdout, stderr, and exit codes as public
  contracts.
- Return only operationally useful data by default; expose the Jira payload
  through `--output raw` when needed.
- Support Windows, macOS, WSL, and Linux from the first usable release.
- Record architectural decisions in [`docs/ADR`](./ADR/README.md).

## MVP.1: developer workflow

The first release must provide one complete workflow: install `jira-cli`, log in
to Jira Data Center, discover and manage issues, move them through their
workflow, and collaborate without manually calling the REST API. See the
approved [`MVP.1 scope`](./MVP.1-SCOPE.md) for the complete command and endpoint
matrix.

Profiles, boards, sprints, worklogs, AI Skills, Jira Cloud, and MCP are not part
of this milestone.

### User journey

```bash
# 1. Start an interactive login.
jira-cli auth login

# 2. Confirm the saved session.
jira-cli auth status

# 3. Work with issues.
jira-cli issue create --project FE --type Story --summary "Add login screen"
jira-cli issue get FE-123
jira-cli issue search --jql "project = FE ORDER BY updated DESC"
jira-cli issue update FE-123 --summary "Add customer login screen"
jira-cli issue delete FE-123 --confirm FE-123

# 4. Remove the local session.
jira-cli auth logout
```

### Authentication scope

The MVP has one active session and does not support named profiles.

`jira-cli auth login` prompts for:

```text
Jira base URL: https://jira.example.com
Personal access token: ********
```

The PAT input must be hidden. After validation, the command may display the Jira
base URL and authenticated username, but must never print the PAT:

```text
Authenticated as Daniel (daniel)
Jira: https://jira.example.com
Session saved successfully.
```

Login flow:

1. Normalize and validate the base URL, preserving a Jira context path such as
   `/jira`.
2. Send the PAT using `Authorization: Bearer <token>`.
3. Validate the credentials against `GET /rest/api/2/myself`.
4. Persist the base URL and PAT only after successful validation.
5. Replace the previous session atomically if login is run again.
6. Never log, echo, serialize into errors, or include the PAT in telemetry.

Automation must not require a TTY. The non-interactive contract should accept
the base URL from `--base-url` or `JIRA_BASE_URL` and the PAT from stdin or
`JIRA_TOKEN`. A `--pat` argument should not be provided because command-line
arguments can be captured in shell history and process listings.

Examples:

```bash
printf '%s' "$JIRA_TOKEN" |
  jira-cli auth login --base-url "$JIRA_BASE_URL" --token-stdin
```

### Cross-platform session storage

Session storage must be accessed through a `CredentialStore` abstraction so the
application and commands do not depend on an operating system API.

Accepted storage locations:

| Platform | Credential and session directory                      |
| -------- | ----------------------------------------------------- |
| Windows  | `%LOCALAPPDATA%/jira-cli/`                            |
| macOS    | `~/Library/Application Support/jira-cli/`             |
| Linux    | `$XDG_CONFIG_HOME/jira-cli/` or `~/.config/jira-cli/` |
| WSL      | `$XDG_CONFIG_HOME/jira-cli/` or `~/.config/jira-cli/` |

The base URL and session metadata live in `session.json`. The PAT lives in the
adjacent plaintext `credentials.json` selected by
[`ADR-0001`](./ADR/0001-session-and-credential-storage.md). The credential file
must be written atomically with mode `0600`, and login must report the storage
type and path without exposing the PAT.

`jira-cli auth logout` must remove both credential and non-secret session data.
If either removal fails, it must return a non-zero exit code and explain what
remains without exposing the credential.

### Issue CRUD scope

#### Create

```bash
jira-cli issue create \
  --project FE \
  --type Story \
  --summary "Add login screen" \
  --description "Implement the approved login experience"
```

Complex and custom fields are accepted through `--input <file>` or
`--input -`. The implementation uses Jira create metadata endpoints for project
and issue-type field validation.

#### Read

```bash
jira-cli issue get FE-123
jira-cli issue get FE-123 --fields key,summary,status,assignee
jira-cli issue get FE-123 --output raw
```

#### Search

```bash
jira-cli issue search \
  --jql "project = FE AND statusCategory != Done" \
  --fields key,summary,status,assignee \
  --limit 20
```

Search is included because an effective read workflow requires discovering
issue keys. It must use bounded pagination and compact normalized results.

#### Update

```bash
jira-cli issue update FE-123 --summary "Updated summary"
jira-cli issue update FE-123 --input update.json
```

Simple fields may use flags. Jira update operations and custom fields use the
JSON input contract.

#### Delete

```bash
jira-cli issue delete FE-123 --confirm FE-123
```

Delete is destructive and must require explicit confirmation. In a TTY, the
command may prompt the user. In non-interactive execution, `--confirm` must
exactly match the issue key. The command must not infer confirmation from
`--quiet`, stdin availability, or an AI environment.

### Normalized response scope

The MVP normalizes issue, user, project, issue type, priority, and status
objects. It removes presentation and transport metadata such as:

- avatar and icon URLs;
- REST `self` links;
- Jira UI HTML;
- expand and schema metadata;
- redundant nested properties;
- meaningless empty and null values.

It preserves identifiers, keys, names, workflow state, requested content, and
values needed by a subsequent CLI command. Unsupported fields remain available
through `--output raw`.

### MVP implementation slices

#### Slice 1: executable and contracts

- Scaffold the Node.js/TypeScript package.
- Register the `jira-cli` executable.
- Add root, auth, and issue help.
- Implement common JSON output, error envelope, stderr rules, and exit codes.
- Add CLI integration test harness for Windows and Unix path/process behavior.

#### Slice 2: login session

- Implement base URL validation and Jira HTTP client.
- Implement PAT input without terminal echo.
- Validate with `/rest/api/2/myself`.
- Add the credential-store abstraction and application credential-file adapter.
- Implement `auth login`, `auth status`, and `auth logout`.
- Test replacement, file permissions, invalid credentials, and cleanup.

#### Slice 3: issue reads

- Implement `issue get` and `issue search`.
- Add field projection and bounded pagination.
- Normalize users, projects, status, priority, issue type, and issue fields.
- Add `json` and `raw` output.

#### Slice 4: issue mutations

- Implement create metadata discovery.
- Implement `issue create`, `issue update`, and `issue delete`.
- Implement assignment and workflow transition discovery/execution.
- Support flags, JSON file input, and stdin input.
- Add explicit destructive-operation confirmation.
- Normalize Jira validation, permission, workflow, and not-found errors.

#### Slice 5: collaboration workflow

- Implement comment CRUD.
- Implement attachment list, upload, download, and delete.
- Implement issue link discovery, create, and delete.
- Implement watch, unwatch, and watcher state.
- Implement opt-in normalized issue history.
- Add supporting project, field, and assignable-user discovery.

#### Slice 6: release readiness

- Run contract tests against Jira Data Center 9.12.x.
- Run CI on Windows, macOS, and Linux.
- Exercise WSL manually and document the tested environment.
- Verify installation through the published-package artifact.
- Add security tests ensuring PAT values never reach stdout, stderr, snapshots,
  or thrown error messages.
- Publish JSON Schemas and end-to-end examples for the MVP commands.

### MVP acceptance criteria

The MVP is complete when:

- A clean installation exposes `jira-cli --help` on Windows, macOS, WSL, and
  Linux.
- A user can log in using a Jira base URL and PAT without the PAT being echoed.
- A successful session survives new terminal processes and machine restarts.
- `auth status` validates or clearly reports the current saved session.
- `auth logout` removes the complete local session.
- Issue create, get, search, update, and delete work end-to-end against Jira Data
  Center 9.12.x.
- Assignment and workflow transitions work with Jira metadata and required
  fields.
- Comments, attachments, issue links, watching, and issue history satisfy the
  collaboration criteria in the MVP.1 scope.
- Default JSON output is normalized and excludes avatars, icons, REST links, and
  other nonessential Jira metadata.
- `--output raw` exposes the Jira response for unsupported cases.
- Every failure returns a documented error code, useful stderr/JSON output, and
  a non-zero process exit code.
- No test, error, verbose log, or command output exposes a PAT.

## Post-MVP roadmap

### Rich content enhancements and worklogs

- Extended Markdown and plain-text formatting.
- Additional Jira wiki/rendered-content normalization.
- Worklog and time-tracking CRUD.

### Jira Software workflows

- Boards.
- Sprints.
- Issues in a sprint.
- Separate Jira Software Agile API adapter.

### AI distribution

- Canonical `jira-cli` Skill.
- Command catalog and prompt examples.
- Token-usage benchmarks.
- Installation guidance for Codex, Claude Code, Cursor, and Gemini CLI.

### Extensibility

- Named profiles and multiple Jira instances.
- Jira Cloud adapter.
- MCP Server.
- HTTP API adapter.

## Change policy

Roadmap items describe intent, not released behavior. When implementation begins,
each milestone should link to its issues or pull requests. Any decision that
changes a public contract, credential storage, package boundary, security model,
or compatibility target must be recorded as an ADR.
