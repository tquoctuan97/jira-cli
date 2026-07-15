import { compact, normalizeUser } from "../domain/normalize.js";
import type { DiscoveryGateway } from "./ports/jira.js";
import { asArray, asRecord } from "./value.js";

export class DiscoveryService {
  constructor(private readonly api: DiscoveryGateway) {}

  async projects(raw: boolean): Promise<unknown> {
    const result = await this.api.projects();
    return raw ? result : compact({ projects: asArray(result).map(normalizeProject) });
  }

  async project(key: string, raw: boolean): Promise<unknown> {
    const result = await this.api.project(key);
    if (raw) return result;
    const project = asRecord(result);
    return compact({
      ...asRecord(normalizeProject(project)),
      lead: normalizeUser(project.lead),
      issueTypes: asArray(project.issueTypes).map((value) => {
        const type = asRecord(value);
        return { id: type.id, name: type.name, subtask: type.subtask };
      }),
    });
  }

  async fields(raw: boolean): Promise<unknown> {
    const result = await this.api.fields();
    return raw
      ? result
      : compact({
          fields: asArray(result).map((value) => {
            const field = asRecord(value);
            return {
              id: field.id,
              name: field.name,
              custom: field.custom,
              searchable: field.searchable,
              orderable: field.orderable,
            };
          }),
        });
  }

  async users(
    query: string | undefined,
    issueKey: string | undefined,
    raw: boolean,
  ): Promise<unknown> {
    const result = issueKey
      ? await this.api.assignableUsers(issueKey, query)
      : await this.api.users(query!);
    if (raw) return result;
    const users = Array.isArray(result) ? result : asArray(asRecord(result).users);
    return compact({ users: users.map(normalizeUser) });
  }
}

function normalizeProject(value: unknown): unknown {
  const project = asRecord(value);
  return compact({
    id: project.id,
    key: project.key,
    name: project.name,
    projectTypeKey: project.projectTypeKey,
  });
}
