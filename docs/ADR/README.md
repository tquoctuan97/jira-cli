# Architecture Decision Records

This directory stores Architecture Decision Records (ADRs) for `jira-cli`.
ADRs capture decisions that materially affect architecture, public contracts,
security, compatibility, or long-term maintenance.

## When an ADR is required

Create an ADR when deciding or changing:

- credential and session storage;
- supported runtimes or operating systems;
- CLI input, output, error, or exit-code contracts;
- package and dependency boundaries;
- Jira Data Center or Jira Software adapter strategy;
- normalized domain models and compatibility policy;
- security-sensitive fallback behavior;
- an earlier architectural decision.

Routine implementation details do not require an ADR.

## Naming

Use a four-digit sequence followed by a short kebab-case title:

```text
0001-session-and-credential-storage.md
0002-cli-framework.md
```

Copy [`template.md`](./template.md) when creating a record. ADRs are append-only
decision history: supersede an accepted ADR with a new ADR instead of rewriting
the original decision.

## Statuses

- `Proposed`: under discussion and not yet binding.
- `Accepted`: approved and expected to guide implementation.
- `Deprecated`: retained for history but no longer recommended.
- `Superseded by ADR-NNNN`: replaced by a newer decision.
