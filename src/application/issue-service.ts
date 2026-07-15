import { CliError, invalidInput } from "../domain/errors.js";
import { compact, normalizeIssue, normalizeUser } from "../domain/normalize.js";
import type { IssueGateway } from "./ports/jira.js";
import { asArray, asRecord, type JsonRecord } from "./value.js";

export type SimpleIssueFields = {
  project?: string;
  type?: string;
  summary?: string;
  description?: string;
  assignee?: string;
  priority?: string;
  labels?: string;
  parent?: string;
};

export class IssueService {
  constructor(private readonly api: IssueGateway) {}

  async get(key: string, fields: string | undefined, raw: boolean): Promise<unknown> {
    const result = await this.api.getIssue(key, fields);
    return raw ? result : normalizeIssue(result);
  }

  async history(key: string, raw: boolean): Promise<unknown> {
    const result = await this.api.issueHistory(key);
    if (raw) return result;
    const issue = asRecord(result);
    return compact({ id: issue.id, key: issue.key, changelog: issue.changelog });
  }

  async search(options: {
    jql: string;
    fields?: string;
    startAt: number;
    limit: number;
    all: boolean;
    maxItems: number;
    raw: boolean;
  }): Promise<unknown> {
    if (!options.all) {
      const fields = splitCsv(options.fields);
      const result = await this.api.searchIssues({
        jql: options.jql,
        ...(fields === undefined ? {} : { fields }),
        startAt: options.startAt,
        maxResults: options.limit,
      });
      return options.raw ? result : normalizeSearch(result);
    }

    const issues: unknown[] = [];
    let startAt = options.startAt;
    let total = 0;
    while (issues.length < options.maxItems) {
      const maxResults = Math.min(options.limit, options.maxItems - issues.length);
      const fields = splitCsv(options.fields);
      const page = asRecord(
        await this.api.searchIssues({
          jql: options.jql,
          ...(fields === undefined ? {} : { fields }),
          startAt,
          maxResults,
        }),
      );
      const pageIssues = asArray(page.issues);
      issues.push(...pageIssues);
      total = numeric(page.total, issues.length);
      if (!pageIssues.length || startAt + pageIssues.length >= total) break;
      startAt += pageIssues.length;
    }
    const result = {
      startAt: options.startAt,
      maxResults: issues.length,
      total,
      issues,
      hasMore: options.startAt + issues.length < total,
      nextStartAt:
        options.startAt + issues.length < total ? options.startAt + issues.length : undefined,
    };
    return options.raw ? result : normalizeSearch(result);
  }

  async create(
    input: unknown | undefined,
    fields: SimpleIssueFields,
    raw: boolean,
  ): Promise<unknown> {
    const payload = resolvePayload(input, fields, true);
    const result = await this.api.createIssue(payload);
    return raw ? result : compact(result);
  }

  async update(
    key: string,
    input: unknown | undefined,
    fields: SimpleIssueFields,
  ): Promise<unknown> {
    const payload = resolvePayload(input, fields, false);
    await this.api.updateIssue(key, payload);
    return { updated: key };
  }

  async delete(key: string): Promise<unknown> {
    await this.api.deleteIssue(key);
    return { deleted: key };
  }

  async createMetadata(project: string, type: string, raw: boolean): Promise<unknown> {
    const result = await this.api.createMetadata(project, type);
    return raw ? result : compact(result);
  }

  async editMetadata(key: string, raw: boolean): Promise<unknown> {
    const result = await this.api.editMetadata(key);
    return raw ? result : compact(result);
  }

  async transitions(key: string, raw: boolean): Promise<unknown> {
    const result = await this.api.transitions(key, true);
    if (raw) return result;
    const transitions = asArray(asRecord(result).transitions).map((value) => {
      const transition = asRecord(value);
      const destination = asRecord(transition.to);
      return {
        id: transition.id,
        name: transition.name,
        to: { id: destination.id, name: destination.name },
        fields: transition.fields,
      };
    });
    return compact({ transitions });
  }

  async transition(key: string, to: string, extra: unknown | undefined): Promise<unknown> {
    const available = asArray(asRecord(await this.api.transitions(key)).transitions).map(asRecord);
    const match = resolveTransition(available, to);
    const supplied = extra === undefined ? {} : asRecord(extra);
    await this.api.transition(key, { ...supplied, transition: { id: match.id } });
    return { transitioned: key, transition: { id: match.id, name: match.name } };
  }

  async assign(key: string, username: string | null): Promise<unknown> {
    const normalized = username === "me" ? "-1" : username;
    await this.api.assign(key, normalized);
    return { issue: key, assignee: username };
  }

  async linkTypes(raw: boolean): Promise<unknown> {
    const result = await this.api.linkTypes();
    return raw ? result : compact({ linkTypes: asRecord(result).issueLinkTypes });
  }

  async link(source: string, target: string, type: string): Promise<unknown> {
    const available = asArray(asRecord(await this.api.linkTypes()).issueLinkTypes).map(asRecord);
    const matches = available.filter((item) => item.id === type || item.name === type);
    if (matches.length !== 1)
      throw new CliError(
        "LINK_TYPE_AMBIGUITY",
        matches.length ? `Link type '${type}' is ambiguous` : `No link type matches '${type}'`,
        6,
        available.map((item) => ({ id: item.id, name: item.name })),
      );
    const match = matches[0]!;
    const resolved =
      typeof match.id === "string" && match.id === type
        ? { id: match.id }
        : { name: String(match.name) };
    await this.api.link(source, target, resolved);
    return {
      linked: { source, target, type: { id: match.id, name: match.name } },
    };
  }

  async unlink(id: string): Promise<unknown> {
    await this.api.unlink(id);
    return { unlinked: id };
  }

  async watch(key: string, watching: boolean): Promise<unknown> {
    await this.api.watch(key, watching);
    return { issue: key, watching };
  }

  async watchers(key: string, includeUsers: boolean, raw: boolean): Promise<unknown> {
    const result = await this.api.watchers(key);
    if (raw) return result;
    const data = asRecord(result);
    return compact({
      watching: data.isWatching,
      count: data.watchCount,
      users: includeUsers ? asArray(data.watchers).map(normalizeUser) : undefined,
    });
  }
}

function resolvePayload(
  input: unknown | undefined,
  options: SimpleIssueFields,
  creating: boolean,
): unknown {
  const selected = Object.values(options).some((value) => value !== undefined);
  if (input !== undefined && selected)
    throw invalidInput("--input cannot be combined with field options");
  if (input !== undefined) return input;
  if (!selected)
    throw invalidInput(
      creating
        ? "Provide --input or issue field options"
        : "Provide --input or at least one editable field option",
    );

  const fields: JsonRecord = {};
  if (options.project !== undefined) fields.project = { key: options.project };
  if (options.type !== undefined)
    fields.issuetype = /^\d+$/.test(options.type) ? { id: options.type } : { name: options.type };
  if (options.summary !== undefined) fields.summary = options.summary;
  if (options.description !== undefined) fields.description = options.description;
  if (options.assignee !== undefined)
    fields.assignee = { name: options.assignee === "me" ? "-1" : options.assignee };
  if (options.priority !== undefined) fields.priority = { name: options.priority };
  if (options.parent !== undefined) fields.parent = { key: options.parent };
  if (options.labels !== undefined) fields.labels = splitCsv(options.labels) ?? [];
  return { fields };
}

function resolveTransition(transitions: JsonRecord[], value: string): JsonRecord {
  const byId = transitions.filter((item) => item.id === value);
  if (byId.length === 1) return byId[0]!;
  const byName = transitions.filter((item) => item.name === value);
  if (byName.length === 1) return byName[0]!;
  const byStatus = transitions.filter((item) => asRecord(item.to).name === value);
  if (byStatus.length === 1) return byStatus[0]!;
  const matches = byId.length ? byId : byName.length ? byName : byStatus;
  throw new CliError(
    "TRANSITION_AMBIGUITY",
    matches.length ? `Transition '${value}' is ambiguous` : `No transition matches '${value}'`,
    6,
    transitions.map((item) => ({ id: item.id, name: item.name })),
  );
}

function normalizeSearch(value: unknown): unknown {
  const data = asRecord(value);
  return compact({
    startAt: data.startAt,
    maxResults: data.maxResults,
    total: data.total,
    issues: asArray(data.issues).map(normalizeIssue),
    hasMore: data.hasMore,
    nextStartAt: data.nextStartAt,
  });
}

function splitCsv(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
