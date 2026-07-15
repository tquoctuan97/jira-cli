import { Command } from "commander";
import { invalidInput } from "../../domain/errors.js";
import type { Runtime } from "../runtime.js";

type InstallOptions = {
  skills?: boolean;
  global?: boolean;
  force?: boolean;
  skillsDir?: string;
};

export function registerInstall(program: Command, runtime: Runtime): void {
  program
    .command("install")
    .description("Install jira-cli integrations")
    .option("--skills", "install the bundled AI Skill")
    .option("--global", "install under ~/.agents/skills instead of the current project")
    .option("--skills-dir <path>", "override the skills root directory")
    .option("--force", "replace an existing installation")
    .action(async (local: InstallOptions) => {
      if (!local.skills) throw invalidInput("Specify --skills");
      if (local.global && local.skillsDir)
        throw invalidInput("--global cannot be combined with --skills-dir");
      runtime.setResult(
        await runtime.installSkills({
          global: Boolean(local.global),
          force: Boolean(local.force),
          ...(local.skillsDir === undefined ? {} : { skillsDir: local.skillsDir }),
        }),
      );
    });
}
