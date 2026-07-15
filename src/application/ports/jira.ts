export interface AuthGateway {
  myself(): Promise<unknown>;
}

export interface IssueGateway {
  getIssue(key: string, fields?: string): Promise<unknown>;
  searchIssues(input: {
    jql: string;
    fields?: string[];
    startAt: number;
    maxResults: number;
  }): Promise<unknown>;
  createIssue(payload: unknown): Promise<unknown>;
  updateIssue(key: string, payload: unknown): Promise<void>;
  deleteIssue(key: string): Promise<void>;
  createMetadata(project: string, type: string): Promise<unknown>;
  editMetadata(key: string): Promise<unknown>;
  issueHistory(key: string): Promise<unknown>;
  transitions(key: string, includeFields?: boolean): Promise<unknown>;
  transition(key: string, payload: unknown): Promise<void>;
  assign(key: string, username: string | null): Promise<void>;
  linkTypes(): Promise<unknown>;
  link(source: string, target: string, type: { id: string } | { name: string }): Promise<void>;
  unlink(id: string): Promise<void>;
  watch(key: string, watching: boolean): Promise<void>;
  watchers(key: string): Promise<unknown>;
}

export interface CommentGateway {
  comments(key: string): Promise<unknown>;
  comment(key: string, id: string): Promise<unknown>;
  saveComment(key: string, id: string | undefined, body: string): Promise<unknown>;
  deleteComment(key: string, id: string): Promise<void>;
}

export interface AttachmentGateway {
  attachmentList(key: string): Promise<unknown>;
  attachmentSettings(): Promise<unknown>;
  attachmentMetadata(id: string): Promise<unknown>;
  uploadAttachments(key: string, paths: string[]): Promise<unknown>;
  downloadAttachment(url: string): Promise<Uint8Array>;
  deleteAttachment(id: string): Promise<void>;
}

export interface DiscoveryGateway {
  projects(): Promise<unknown>;
  project(key: string): Promise<unknown>;
  fields(): Promise<unknown>;
  users(queryText: string): Promise<unknown>;
  assignableUsers(issueKey: string, queryText?: string): Promise<unknown>;
}
