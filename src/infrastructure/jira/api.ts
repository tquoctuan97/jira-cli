import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { JiraClient } from "./client.js";

export class JiraApi {
  constructor(private readonly client: JiraClient) {}

  myself(): Promise<unknown> {
    return this.client.request("GET", "/rest/api/2/myself");
  }

  getIssue(key: string, fields?: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/issue/${segment(key)}${query({ fields })}`);
  }

  searchIssues(input: {
    jql: string;
    fields?: string[];
    startAt: number;
    maxResults: number;
  }): Promise<unknown> {
    return this.client.request("POST", "/rest/api/2/search", { body: input });
  }

  createIssue(payload: unknown): Promise<unknown> {
    return this.client.request("POST", "/rest/api/2/issue", { body: payload });
  }

  async updateIssue(key: string, payload: unknown): Promise<void> {
    await this.client.request("PUT", `/rest/api/2/issue/${segment(key)}`, { body: payload });
  }

  async deleteIssue(key: string): Promise<void> {
    await this.client.request("DELETE", `/rest/api/2/issue/${segment(key)}`);
  }

  createMetadata(project: string, type: string): Promise<unknown> {
    return this.client.request(
      "GET",
      `/rest/api/2/issue/createmeta/${segment(project)}/issuetypes/${segment(type)}`,
    );
  }

  editMetadata(key: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/issue/${segment(key)}/editmeta`);
  }

  issueHistory(key: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/issue/${segment(key)}?expand=changelog`);
  }

  transitions(key: string, includeFields = false): Promise<unknown> {
    const suffix = includeFields ? "?expand=transitions.fields" : "";
    return this.client.request("GET", `/rest/api/2/issue/${segment(key)}/transitions${suffix}`);
  }

  async transition(key: string, payload: unknown): Promise<void> {
    await this.client.request("POST", `/rest/api/2/issue/${segment(key)}/transitions`, {
      body: payload,
    });
  }

  async assign(key: string, username: string | null): Promise<void> {
    await this.client.request("PUT", `/rest/api/2/issue/${segment(key)}/assignee`, {
      body: { name: username },
    });
  }

  linkTypes(): Promise<unknown> {
    return this.client.request("GET", "/rest/api/2/issueLinkType");
  }

  async link(
    source: string,
    target: string,
    type: { id: string } | { name: string },
  ): Promise<void> {
    await this.client.request("POST", "/rest/api/2/issueLink", {
      body: {
        type,
        inwardIssue: { key: source },
        outwardIssue: { key: target },
      },
    });
  }

  async unlink(id: string): Promise<void> {
    await this.client.request("DELETE", `/rest/api/2/issueLink/${segment(id)}`);
  }

  async watch(key: string, watching: boolean): Promise<void> {
    await this.client.request(
      watching ? "POST" : "DELETE",
      `/rest/api/2/issue/${segment(key)}/watchers`,
    );
  }

  watchers(key: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/issue/${segment(key)}/watchers`);
  }

  comments(key: string): Promise<unknown> {
    return this.client.request("GET", commentPath(key));
  }

  comment(key: string, id: string): Promise<unknown> {
    return this.client.request("GET", `${commentPath(key)}/${segment(id)}`);
  }

  saveComment(key: string, id: string | undefined, body: string): Promise<unknown> {
    return this.client.request(
      id ? "PUT" : "POST",
      id ? `${commentPath(key)}/${segment(id)}` : commentPath(key),
      {
        body: { body },
      },
    );
  }

  async deleteComment(key: string, id: string): Promise<void> {
    await this.client.request("DELETE", `${commentPath(key)}/${segment(id)}`);
  }

  attachmentList(key: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/issue/${segment(key)}?fields=attachment`);
  }

  attachmentSettings(): Promise<unknown> {
    return this.client.request("GET", "/rest/api/2/attachment/meta");
  }

  attachmentMetadata(id: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/attachment/${segment(id)}`);
  }

  async uploadAttachments(key: string, paths: string[]): Promise<unknown> {
    const form = new FormData();
    for (const path of paths) {
      const bytes = await readFile(path);
      form.append("file", new Blob([bytes]), basename(path));
    }
    return this.client.upload(`/rest/api/2/issue/${segment(key)}/attachments`, form);
  }

  downloadAttachment(url: string): Promise<Uint8Array> {
    return this.client.download(url);
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.client.request("DELETE", `/rest/api/2/attachment/${segment(id)}`);
  }

  projects(): Promise<unknown> {
    return this.client.request("GET", "/rest/api/2/project");
  }

  project(key: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/project/${segment(key)}`);
  }

  fields(): Promise<unknown> {
    return this.client.request("GET", "/rest/api/2/field");
  }

  users(queryText: string): Promise<unknown> {
    return this.client.request("GET", `/rest/api/2/user/picker${query({ query: queryText })}`);
  }

  assignableUsers(issueKey: string, queryText?: string): Promise<unknown> {
    return this.client.request(
      "GET",
      `/rest/api/2/user/assignable/search${query({ issueKey, username: queryText })}`,
    );
  }
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

function commentPath(key: string): string {
  return `/rest/api/2/issue/${segment(key)}/comment`;
}

function query(values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined) params.set(key, value);
  const result = params.toString();
  return result ? `?${result}` : "";
}
