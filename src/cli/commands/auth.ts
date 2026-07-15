import { Command } from "commander";
import { stdin } from "node:process";
import { normalizeBaseUrl } from "../../application/auth-service.js";
import { invalidInput } from "../../domain/errors.js";
import { prompt, promptSecret, readStdin } from "../io.js";
import type { Runtime } from "../runtime.js";

export function registerAuth(program: Command, runtime: Runtime): void {
  const auth = program.command("auth").description("Manage the active Jira session");

  auth
    .command("login")
    .description("Authenticate using a personal access token")
    .option("--base-url <url>", "Jira base URL")
    .option("--token-stdin", "read the PAT from stdin")
    .action(async (local: { baseUrl?: string; tokenStdin?: boolean }, command: Command) => {
      const options = runtime.options(command);
      let suppliedBaseUrl = local.baseUrl ?? process.env.JIRA_BASE_URL;
      if (!suppliedBaseUrl) {
        if (!stdin.isTTY)
          throw invalidInput(
            "A Jira base URL must be provided through --base-url or JIRA_BASE_URL",
          );
        suppliedBaseUrl = await prompt("Jira base URL: ");
      }
      const baseUrl = normalizeBaseUrl(suppliedBaseUrl);
      let token = process.env.JIRA_TOKEN;
      if (!token && local.tokenStdin) token = (await readStdin()).trim();
      if (!token) token = await promptSecret("Personal access token: ");
      if (!token) throw invalidInput("A personal access token is required");
      runtime.setResult(await runtime.login(options, baseUrl, token));
    });

  auth
    .command("status")
    .description("Show the active Jira session")
    .action(async (_local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(await runtime.auth(options).status());
    });

  auth
    .command("logout")
    .description("Remove the active Jira session")
    .action(async (_local: unknown, command: Command) => {
      const options = runtime.options(command);
      runtime.setResult(await runtime.auth(options).logout());
    });
}
