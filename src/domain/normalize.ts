const OMITTED_KEYS = new Set([
  "self",
  "avatarUrls",
  "iconUrl",
  "iconUrls",
  "expand",
  "schema",
  "renderedFields",
  "thumbnail",
  "content",
]);

export function compact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compact).filter(isPresent);
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (OMITTED_KEYS.has(key)) continue;
    const normalized = compact(child);
    if (isPresent(normalized)) result[key] = normalized;
  }
  return result;
}

function isPresent(value: unknown): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

type JiraRecord = Record<string, unknown>;

function record(value: unknown): JiraRecord {
  return value && typeof value === "object" ? (value as JiraRecord) : {};
}

export function normalizeUser(value: unknown): unknown {
  const user = record(value);
  return compact({
    username: user.name ?? user.key ?? user.accountId,
    displayName: user.displayName,
    emailAddress: user.emailAddress,
    active: user.active,
  });
}

export function normalizeIssue(value: unknown): unknown {
  const issue = record(value);
  const fields = record(issue.fields);
  const issueType = record(fields.issuetype);
  const status = record(fields.status);
  const statusCategory = record(status.statusCategory);
  const priority = record(fields.priority);
  const project = record(fields.project);
  const parent = record(fields.parent);
  const parentFields = record(parent.fields);
  const resolution = record(fields.resolution);

  return compact({
    id: issue.id,
    key: issue.key,
    summary: fields.summary,
    description: fields.description,
    type: { id: issueType.id, name: issueType.name },
    status: { id: status.id, name: status.name, category: statusCategory.key },
    priority: { id: priority.id, name: priority.name },
    project: { id: project.id, key: project.key, name: project.name },
    assignee: normalizeUser(fields.assignee),
    reporter: normalizeUser(fields.reporter),
    labels: fields.labels,
    parent: { id: parent.id, key: parent.key, summary: parentFields.summary },
    created: fields.created,
    updated: fields.updated,
    resolution: { id: resolution.id, name: resolution.name },
    components: normalizeNamedList(fields.components),
    fixVersions: normalizeNamedList(fields.fixVersions),
    ...Object.fromEntries(
      Object.entries(fields)
        .filter(([key]) => key.startsWith("customfield_"))
        .map(([key, child]) => [key, compact(child)]),
    ),
  });
}

function normalizeNamedList(value: unknown): unknown {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const entry = record(item);
    return compact({ id: entry.id, name: entry.name });
  });
}
