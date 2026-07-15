import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type {
  SkillInstallerPort,
  SkillInstallRequest,
  SkillInstallResult,
} from "../../application/ports/skill-installer.js";
import { CliError, invalidInput } from "../../domain/errors.js";

const SKILL_NAME = "jira-cli";

export class FilesystemSkillInstaller implements SkillInstallerPort {
  constructor(private readonly sourceDirectory: string) {}

  async install(request: SkillInstallRequest): Promise<SkillInstallResult> {
    await assertSkillBundle(this.sourceDirectory);
    const destination = join(request.targetRoot, SKILL_NAME);
    const replaced = await exists(destination);
    if (replaced && !request.force)
      throw invalidInput(
        `Skill is already installed at ${destination}. Use --force to replace it.`,
      );

    await mkdir(request.targetRoot, { recursive: true });
    const nonce = `${process.pid}-${Date.now()}`;
    const temporary = `${destination}.tmp-${nonce}`;
    const backup = `${destination}.backup-${nonce}`;

    try {
      await cp(this.sourceDirectory, temporary, { recursive: true, errorOnExist: true });
      if (replaced) await rename(destination, backup);
      await rename(temporary, destination);
      if (replaced) await rm(backup, { recursive: true, force: true });
    } catch (error) {
      await rm(temporary, { recursive: true, force: true }).catch(() => undefined);
      if (replaced && (await exists(backup)) && !(await exists(destination)))
        await rename(backup, destination).catch(() => undefined);
      if (error instanceof CliError) throw error;
      throw new CliError("SKILL_INSTALL_FAILED", `Unable to install Skill at ${destination}`, 3);
    }

    return { name: SKILL_NAME, path: destination, replaced };
  }
}

async function assertSkillBundle(sourceDirectory: string): Promise<void> {
  if (!(await exists(join(sourceDirectory, "SKILL.md"))))
    throw new CliError(
      "SKILL_BUNDLE_NOT_FOUND",
      `The packaged ${SKILL_NAME} Skill could not be found`,
      3,
    );
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
