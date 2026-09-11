# ADR-0002: Use bounded issue reads and advisory update notices

- Status: Accepted
- Date: 2026-09-11
- Decision owners: Project maintainers

## Context

Jira Data Center returns every navigable field when an issue request omits the
`fields` parameter. Instance-specific custom fields can contain large opaque
values, including cached development metadata, which makes the default output
expensive and difficult for AI agents to consume.

Agents also need comments, attachment metadata, and local issue links when
investigating a ticket. Retrieving each resource separately adds commands and
round trips. Separately, globally installed CLI versions can become stale after
a new npm release without either the user or agent noticing.

The CLI must improve these workflows without weakening its machine-readable
JSON contract, raw escape hatch, failure behavior, or user control over package
installation.

## Decision drivers

- Keep default output deterministic, compact, and easy for agents to parse.
- Preserve access to instance-specific Jira fields when explicitly requested.
- Provide bounded ticket context without silently omitting related data.
- Notify users and agents about releases without adding a network dependency to
  every invocation.
- Keep stdout machine-readable and never mutate the user's global environment
  automatically.

## Considered options

### Keep unbounded Jira responses

This preserves Jira's default behavior but exposes irrelevant custom fields and
causes unpredictable output size.

### Make Markdown the default

Markdown is convenient for people, but it loses type fidelity and is less
reliable for automation than normalized JSON.

### Use bounded JSON reads with an aggregate context command

This makes common agent operations predictable while retaining explicit field
selection and raw output for unsupported cases.

### Automatically install new CLI releases

Automatic installation removes user friction but changes the global runtime
without explicit approval and can fail because of permissions or package policy.

## Decision

JSON remains the default output format.

Normalized issue reads use command-specific field allowlists:

- `issue get` includes the supported issue detail fields, including description
  and reporter;
- `issue search` uses a smaller list that excludes description and reporter;
- explicit `--fields` replaces the applicable default and preserves requested
  custom or otherwise unknown Jira fields;
- `--output raw` without `--fields` remains unfiltered.

Add `issue context <issue-key>` with a stable envelope containing the normalized
issue, newest comments, attachment metadata, and local issue links. Comments
default to 20 and accept a limit from 0 through 100; zero skips the comments
request. Empty sections remain present. Required Jira reads fail atomically
rather than returning an apparently complete partial context.

Check the npm `latest` metadata at most once every 24 hours and cache the result
beside the active session configuration. A newer cached version may produce a
notice on every invocation until the CLI is upgraded. The check has a one-second
timeout and all registry or cache failures are silent and non-fatal.

Update notices go only to stderr and never change result output or exit codes.
They display the global npm installation command and instruct an agent to obtain
user approval. The CLI never installs updates automatically. `--quiet` and
`JIRA_CLI_NO_UPDATE_CHECK=1` disable both the check and notice.

## Consequences

### Positive

- Default issue output has predictable size and excludes opaque custom metadata.
- Agents can retrieve a useful ticket context with one command.
- Explicit and raw reads retain access to Jira instance-specific data.
- Users and agents learn about new releases without compromising stdout JSON.

### Negative

- Normalized default output no longer mirrors every field Jira might return.
- `issue context` can require two Jira requests and up to one additional second
  on the first stale version check.
- A cached update notice can repeat until the installed version changes.

### Risks and mitigations

- Allowlist changes could hide a field an integration expects; use explicit
  `--fields` or `--output raw` for that field.
- Context size can grow through attachments and links; comments remain bounded
  and attachment content is never downloaded implicitly.
- Registry access may be unavailable; cache failures and network failures do not
  affect Jira commands.
- Update notices could corrupt automation output; they are restricted to stderr
  and can be disabled explicitly.

## Validation

- Contract tests cover get and search defaults, explicit custom and unknown
  fields, and unfiltered raw reads.
- Context tests cover pagination metadata, empty sections, comment skipping,
  raw output, attachment normalization, both link directions, and Jira failures.
- Update-check tests cover cache freshness, SemVer comparisons, timeout and
  registry failures, stderr isolation, quiet mode, and environment opt-out.
- Type checking, formatting, tests, and the production bundle must pass before
  release.

## References

- [`MVP.1-SCOPE.md`](../MVP.1-SCOPE.md)
- [`ROADMAP.md`](../ROADMAP.md)
- [`README.md`](../../README.md)
