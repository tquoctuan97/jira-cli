import type { Command } from "commander";
import { z } from "zod";
import type { CommandResult, GlobalOptions } from "../application/contracts.js";
import { AttachmentService } from "../application/attachment-service.js";
import { AuthService } from "../application/auth-service.js";
import { CommentService } from "../application/comment-service.js";
import { DiscoveryService } from "../application/discovery-service.js";
import { IssueService } from "../application/issue-service.js";
import { JiraApi } from "../infrastructure/jira/api.js";
import { JiraClient } from "../infrastructure/jira/client.js";
import { FileCredentialStore } from "../infrastructure/session/credential-store.js";
import { SessionStore } from "../infrastructure/session/session-store.js";

const globalOptionsSchema = z.object({
  config: z.string().optional(),
  output: z.enum(["json", "raw", "markdown", "text"]).default("json"),
  outputFile: z.string().optional(),
  timeout: z.number().int().positive().optional(),
  verbose: z.boolean().default(false),
});

export type Services = {
  issues: IssueService;
  comments: CommentService;
  attachments: AttachmentService;
  discovery: DiscoveryService;
};

export class Runtime {
  result?: CommandResult;
  private services?: Services;

  options(command: Command): GlobalOptions {
    const parsed = globalOptionsSchema.parse(command.optsWithGlobals());
    return {
      output: parsed.output,
      verbose: parsed.verbose,
      ...(parsed.config === undefined ? {} : { config: parsed.config }),
      ...(parsed.outputFile === undefined ? {} : { outputFile: parsed.outputFile }),
      ...(parsed.timeout === undefined ? {} : { timeout: parsed.timeout }),
    };
  }

  setResult(value: unknown, outputFileHandled = false): void {
    this.result = { value, ...(outputFileHandled ? { outputFileHandled: true } : {}) };
  }

  auth(options: GlobalOptions): AuthService {
    return new AuthService(
      new SessionStore(options.config),
      new FileCredentialStore(options.config),
    );
  }

  async login(options: GlobalOptions, baseUrl: string, token: string): Promise<unknown> {
    const api = new JiraApi(new JiraClient(baseUrl, token, options.timeout));
    const credentials = new FileCredentialStore(options.config);
    const result = await new AuthService(new SessionStore(options.config), credentials).login(
      api,
      baseUrl,
      token,
    );
    return {
      ...(result as Record<string, unknown>),
      credentialStorage: {
        type: "plaintext-file",
        path: credentials.location,
        permissions: "0600",
      },
    };
  }

  async jira(options: GlobalOptions): Promise<Services> {
    if (this.services) return this.services;
    const sessions = new SessionStore(options.config);
    const session = await sessions.load();
    const token = await new FileCredentialStore(options.config).load(session.credentialKey);
    const api = new JiraApi(new JiraClient(session.baseUrl, token, options.timeout));
    this.services = {
      issues: new IssueService(api),
      comments: new CommentService(api),
      attachments: new AttachmentService(api),
      discovery: new DiscoveryService(api),
    };
    return this.services;
  }
}
