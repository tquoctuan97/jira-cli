# JQL guidance

Use JQL supplied by the user or construct conservative queries from confirmed project keys, users, and statuses.

## Token-efficient examples

```bash
jira-cli issue search \
  --jql 'project = FE AND statusCategory != Done ORDER BY updated DESC' \
  --fields key,summary,status,assignee,updated \
  --limit 20

jira-cli issue search \
  --jql 'assignee = currentUser() AND resolution = Unresolved' \
  --fields key,summary,status,priority \
  --limit 20

jira-cli issue search \
  --jql 'project = FE AND labels = backend' \
  --fields key,summary,status \
  --limit 20
```

## Rules

- Quote the full JQL expression for the shell.
- Do not interpolate untrusted text into JQL without escaping it.
- Start with a bounded `--limit`; use `--all --max-items <n>` only when the task needs multiple pages.
- Preserve issue keys in projected fields so later commands can act on results.
- Use `jira-cli project list`, `field list`, and `user find` instead of guessing identifiers.
