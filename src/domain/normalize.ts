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

const ISSUE_NORMALIZED_FIELDS = new Set([
  "summary",
  "description",
  "issuetype",
  "status",
  "priority",
  "project",
  "assignee",
  "reporter",
  "labels",
  "parent",
  "created",
  "updated",
  "resolution",
  "components",
  "fixVersions",
]);

export function normalizeIssue(value: unknown, requestedFields?: readonly string[]): unknown {
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

  const requested = requestedFields === undefined ? undefined : new Set(requestedFields);
  const include = (field: string) => requested === undefined || requested.has(field);
  const normalized: Record<string, unknown> = { id: issue.id, key: issue.key };
  if (include("summary")) normalized.summary = fields.summary;
  if (include("description")) normalized.description = fields.description;
  if (include("issuetype")) normalized.type = { id: issueType.id, name: issueType.name };
  if (include("status"))
    normalized.status = { id: status.id, name: status.name, category: statusCategory.key };
  if (include("priority")) normalized.priority = { id: priority.id, name: priority.name };
  if (include("project"))
    normalized.project = { id: project.id, key: project.key, name: project.name };
  if (include("assignee")) normalized.assignee = normalizeUser(fields.assignee);
  if (include("reporter")) normalized.reporter = normalizeUser(fields.reporter);
  if (include("labels")) normalized.labels = fields.labels;
  if (include("parent"))
    normalized.parent = { id: parent.id, key: parent.key, summary: parentFields.summary };
  if (include("created")) normalized.created = fields.created;
  if (include("updated")) normalized.updated = fields.updated;
  if (include("resolution")) normalized.resolution = { id: resolution.id, name: resolution.name };
  if (include("components")) normalized.components = normalizeNamedList(fields.components);
  if (include("fixVersions")) normalized.fixVersions = normalizeNamedList(fields.fixVersions);
  for (const [key, child] of Object.entries(fields)) {
    if (ISSUE_NORMALIZED_FIELDS.has(key)) continue;
    if (requested === undefined ? key.startsWith("customfield_") : requested.has(key))
      normalized[key] = compact(child);
  }
  return compact(normalized);
}

function normalizeNamedList(value: unknown): unknown {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const entry = record(item);
    return compact({ id: entry.id, name: entry.name });
  });
}

export function normalizeComment(value: unknown): unknown {
  const comment = record(value);
  return compact({
    id: comment.id,
    body: comment.body,
    author: normalizeUser(comment.author),
    created: comment.created,
    updated: comment.updated,
  });
}

export function normalizeAttachment(value: unknown): unknown {
  const attachment = record(value);
  return compact({
    id: attachment.id,
    filename: attachment.filename,
    size: attachment.size,
    mimeType: attachment.mimeType,
    author: normalizeUser(attachment.author),
    created: attachment.created,
  });
}

export function normalizeIssueLink(value: unknown): unknown {
  const link = record(value);
  const type = record(link.type);
  const inward = record(link.inwardIssue);
  const outward = record(link.outwardIssue);
  const isInward = Object.keys(inward).length > 0;
  const direction = isInward ? "inward" : "outward";
  return compact({
    id: link.id,
    direction,
    type: {
      id: type.id,
      name: type.name,
      label: direction === "inward" ? type.inward : type.outward,
    },
    issue: normalizeLinkedIssue(isInward ? inward : outward),
  });
}

function normalizeLinkedIssue(issue: JiraRecord): unknown {
  const fields = record(issue.fields);
  const issueType = record(fields.issuetype);
  const status = record(fields.status);
  const priority = record(fields.priority);
  return compact({
    id: issue.id,
    key: issue.key,
    summary: fields.summary,
    type: { id: issueType.id, name: issueType.name },
    status: { id: status.id, name: status.name },
    priority: { id: priority.id, name: priority.name },
  });
}
