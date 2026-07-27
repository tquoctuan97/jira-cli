# Jira wiki markup

Use Jira wiki markup for comments, descriptions, environment fields, and other multi-line text
fields configured with Jira's Wiki Renderer. Pass the finished markup to `jira-cli` unchanged.

When an instance-specific check is useful, open:

```text
<jira-base-url>/secure/WikiRendererHelpAction.jspa?section=all
```

Treat that page as the authority for the Jira version and renderer configuration in use.

## Common notation

| Intent          | Jira wiki markup                                      |
| --------------- | ----------------------------------------------------- |
| Heading         | `h2. Heading`                                         |
| Strong          | `*strong*`                                            |
| Emphasis        | `_emphasis_`                                          |
| Deleted         | `-deleted-`                                           |
| Inserted        | `+inserted+`                                          |
| Inline code     | `{{value}}`                                           |
| External link   | `[label\|https://example.com]`                        |
| User mention    | `[~username]`                                         |
| Bullet item     | `* item`                                              |
| Nested bullet   | `** nested item`                                      |
| Numbered item   | `# item`                                              |
| Paragraph quote | `bq. quoted text`                                     |
| Line break      | `\\`                                                  |
| Horizontal rule | `----`                                                |
| Escape          | Prefix a special character with `\`, for example `\{` |

Use an empty line between paragraphs.

## Blocks

Use a table header with double bars and regular cells with single bars:

```text
||Status||Owner||
|Ready|Alex|
|Blocked|Sam|
```

Use a code macro for highlighted source:

```text
{code:javascript|title=example.js}
const ready = true;
{code}
```

Common Jira Data Center 9.12 code languages include `bash`, `css`, `go`, `html`, `java`,
`javascript`, `json`, `python`, `sql`, `swift`, `xml`, and `yaml`. Represent TypeScript with
`javascript`, or use `{noformat}` when syntax highlighting is unnecessary.

Use a no-format block for literal text:

```text
{noformat}
literal *text* stays literal
{noformat}
```

Use a quote or panel for longer callouts:

```text
{quote}
Quoted content across paragraphs.
{quote}

{panel:title=Result}
The verification passed.
{panel}
```

## Composition workflow

1. Draft the content from the user's intent.
2. Convert headings, links, lists, tables, quotes, and code to Jira wiki notation.
3. Preserve literal technical content with `{{...}}`, `{code}`, or `{noformat}`.
4. Review special characters and escape them where Jira would interpret them as markup.
5. Send short content with `--body` or `--description`.
6. Send long or shell-sensitive comments through stdin:

```bash
jira-cli comment add <issue-key> --body-file -
```

For complex issue fields, place Jira wiki markup inside the appropriate string field of the JSON
payload passed to `--input`.
