# JQL guidance

Use JQL supplied by the user or construct conservative queries from confirmed project keys, users, and statuses.

## Token-efficient examples

```bash
jira-cli issue search \
  --jql 'project = <project-key> ORDER BY updated DESC' \
  --fields key,summary,status,assignee,updated \
  --limit 20

jira-cli issue search \
  --jql 'assignee = currentUser() ORDER BY updated DESC' \
  --fields key,summary,status,priority \
  --limit 20

jira-cli issue search \
  --jql 'project = <project-key> AND labels = <label>' \
  --fields key,summary,status \
  --limit 20
```

## Rules

- Quote the full JQL expression for the shell.
- Escape every untrusted value before interpolating it into JQL.
- Start with a bounded `--limit`; use `--all --max-items <n>` when the task needs multiple pages.
- Preserve issue keys in projected fields so later commands can act on results.
- Use `jira-cli project list`, `field list`, and `user find` to discover identifiers.
