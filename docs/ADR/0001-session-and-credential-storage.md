# ADR-0001: Store the active PAT in the application config directory

- Status: Accepted
- Date: 2026-07-15
- Decision owners: Project maintainers

## Context

The initial implementation required a native credential backend. On Linux and
WSL this meant that `secret-tool` and a running Secret Service daemon had to be
available. That dependency prevents login in common headless, server, container,
and WSL environments.

The MVP supports one active Jira session. It needs predictable cross-platform
behavior without silently failing when a desktop keyring is absent.

## Decision drivers

- Work without desktop services or extra system packages.
- Behave consistently in terminals, WSL, servers, and automation environments.
- Keep the credential out of process arguments, stdout, stderr, and logs.
- Make the storage location and protection model explicit.
- Preserve a replaceable `CredentialStore` application port.

## Considered options

### Native operating-system keyrings

This offers stronger at-rest protection, but backend availability and behavior
vary by platform. Linux and WSL often lack a running Secret Service.

### Environment variables only

This avoids persistence but makes interactive use inconvenient and delegates
session management to every shell or automation environment.

### Application credential file

This is predictable and dependency-free. It relies on filesystem permissions
rather than encryption and therefore provides weaker at-rest protection.

## Decision

Store the active Jira PAT in `credentials.json` under the platform application
config directory. The default Linux and WSL path is:

```text
~/.config/jira-cli/credentials.json
```

Respect `XDG_CONFIG_HOME` on Linux. Store `session.json` beside the credential
file. When `--config <path>` overrides the session path, store
`credentials.json` in the same directory as that path.

The implementation must:

- create the application directory with user-only permissions when possible;
- write credential files atomically with mode `0600`;
- never include the PAT in CLI output, errors, diagnostics, or process arguments;
- clearly report during login that storage is a plaintext file protected by
  filesystem permissions;
- delete the credential when `auth logout` succeeds;
- keep credential persistence behind the `CredentialStore` port so a native or
  external secret-manager adapter can be added later.

## Consequences

### Positive

- Login works without `secret-tool`, D-Bus, or a desktop keyring.
- Storage behavior is consistent and testable across supported environments.
- Users can back up, inspect, or remove the application state predictably.

### Negative

- The PAT is not encrypted at rest.
- Processes running as the same operating-system user and system administrators
  can read the credential.
- Careless home-directory backups may copy the PAT.

### Risks and mitigations

- Enforce mode `0600` after every atomic replacement.
- Document the plaintext protection model next to login instructions.
- Recommend short-lived, least-privilege PATs and secure home-directory backups.
- Retain the application port so stronger stores remain possible without
  changing command or service contracts.

## Validation

- Unit tests verify save, load, replacement, deletion, invalid data handling,
  and mode `0600`.
- CLI login output identifies the storage type and path without exposing the PAT.
- Security tests assert that command output and errors never contain fixture PATs.

## References

- [`MVP.1-SCOPE.md`](../MVP.1-SCOPE.md)
- [`ROADMAP.md`](../ROADMAP.md)
