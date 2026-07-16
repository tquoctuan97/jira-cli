# Errors and recovery

Errors are written to stderr as a stable envelope containing `error.code` and `error.message`. Stdout remains reserved for successful results.

| Exit | Meaning                                           | Response                                                                       |
| ---: | ------------------------------------------------- | ------------------------------------------------------------------------------ |
|    2 | Invalid input                                     | Correct command arguments and inspect `--help`.                                |
|    3 | Session, authentication, or configuration failure | Check `auth status` and ask the user to authenticate when needed.              |
|    4 | Resource not found                                | Confirm the exact key or ID with the user.                                     |
|    5 | Permission denied                                 | Report the required Jira permission and present the supported escalation path. |
|    6 | Jira validation, ambiguity, or workflow failure   | Inspect metadata or transitions and retry with an exact valid value.           |
|    7 | Network or Jira server failure                    | Report the failure, retry reads cautiously, and confirm each mutation retry.   |
|    8 | Partial result                                    | Preserve successful items and report which work remains.                       |

Prefer `error.code` and the process exit code for recovery decisions. Keep credentials and authorization headers confidential throughout diagnostics.

## Create metadata recovery

If `issue create-meta` exits with code 6:

1. Pause creation and discover exact values.
2. Run `project get <project-key>` and select an exact type ID or name from `issueTypes`.
3. Run `issue create --help` to verify CLI syntax.
4. Retry metadata discovery with the exact type. When metadata discovery continues to return exit 6, report that limitation and use documented fields for an already authorized simple create.

## Issue creation recovery

When a created issue requires scope correction, pause the remaining batch. When deletion exits with code 5:

1. Report that only a user with the Jira delete permission or an administrator can remove it.
2. Run `issue transitions <issue-key>` to discover valid retirement or cancellation transitions.
3. Propose an appropriate exact transition and apply the selected transition after the user confirms that intent.
4. Return every affected key and its final status so the user can audit the recovery.
