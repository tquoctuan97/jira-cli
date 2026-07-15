# Errors and recovery

Errors are written to stderr as a stable envelope containing `error.code` and `error.message`. Stdout remains reserved for successful results.

| Exit | Meaning                                           | Response                                                                              |
| ---: | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
|    2 | Invalid input                                     | Correct command arguments; inspect `--help`.                                          |
|    3 | Session, authentication, or configuration failure | Check `auth status`; ask the user to authenticate if needed.                          |
|    4 | Resource not found                                | Recheck the exact key or ID; do not guess a replacement.                              |
|    5 | Permission denied                                 | Report the required Jira permission; do not attempt bypasses.                         |
|    6 | Jira validation, ambiguity, or workflow failure   | Inspect metadata or transitions and retry only with an exact valid value.             |
|    7 | Network or Jira server failure                    | Report the failure; retry reads cautiously, but do not automatically retry mutations. |
|    8 | Partial result                                    | Preserve successful items and report which work remains.                              |

Do not parse human-readable messages when `error.code` or the exit code is sufficient. Never include credentials or authorization headers in diagnostics.
