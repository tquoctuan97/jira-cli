import { homedir } from "node:os";
import { resolve } from "node:path";
import type { SkillInstallerPort } from "./ports/skill-installer.js";

export type InstallSkillsOptions = {
  global: boolean;
  force: boolean;
  skillsDir?: string;
  cwd?: string;
};

export class InstallService {
  constructor(private readonly installer: SkillInstallerPort) {}

  async installSkills(options: InstallSkillsOptions): Promise<unknown> {
    const cwd = options.cwd ?? process.cwd();
    const targetRoot = options.skillsDir
      ? resolve(cwd, options.skillsDir)
      : options.global
        ? resolve(homedir(), ".agents", "skills")
        : resolve(cwd, ".agents", "skills");
    const result = await this.installer.install({ targetRoot, force: options.force });
    return {
      installed: result.name,
      scope: options.global ? "global" : "project",
      path: result.path,
      replaced: result.replaced,
    };
  }
}
