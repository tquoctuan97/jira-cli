import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { InstallService } from "../src/application/install-service.js";
import { FilesystemSkillInstaller } from "../src/infrastructure/install/filesystem-skill-installer.js";
import type { SkillInstallerPort } from "../src/application/ports/skill-installer.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("Skill installer", () => {
  it("installs into a project .agents/skills directory", async () => {
    const root = await temporaryDirectory();
    const source = join(root, "bundle", "jira-cli");
    await writeFileIn(source, "SKILL.md", "---\nname: jira-cli\n---\n");
    const service = new InstallService(new FilesystemSkillInstaller(source));

    const result = await service.installSkills({ global: false, force: false, cwd: root });

    const destination = join(root, ".agents", "skills", "jira-cli");
    expect(result).toEqual({
      installed: "jira-cli",
      scope: "project",
      path: destination,
      replaced: false,
    });
    expect(await readFile(join(destination, "SKILL.md"), "utf8")).toContain("name: jira-cli");
  });

  it("requires --force and replaces the complete bundle atomically", async () => {
    const root = await temporaryDirectory();
    const source = join(root, "bundle", "jira-cli");
    const targetRoot = join(root, "target");
    await writeFileIn(source, "SKILL.md", "version: new\n");
    await writeFileIn(join(targetRoot, "jira-cli"), "SKILL.md", "version: old\n");
    await writeFileIn(join(targetRoot, "jira-cli"), "obsolete.md", "old\n");
    const installer = new FilesystemSkillInstaller(source);

    await expect(installer.install({ targetRoot, force: false })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(installer.install({ targetRoot, force: true })).resolves.toMatchObject({
      replaced: true,
    });
    expect(await readFile(join(targetRoot, "jira-cli", "SKILL.md"), "utf8")).toBe("version: new\n");
    await expect(readFile(join(targetRoot, "jira-cli", "obsolete.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("uses the user-level .agents/skills root for global installs", async () => {
    let targetRoot: string | undefined;
    const installer: SkillInstallerPort = {
      install: async (request) => {
        targetRoot = request.targetRoot;
        return { name: "jira-cli", path: join(request.targetRoot, "jira-cli"), replaced: false };
      },
    };

    await new InstallService(installer).installSkills({ global: true, force: false });

    expect(targetRoot).toBe(join(homedir(), ".agents", "skills"));
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "jira-cli-skill-"));
  directories.push(directory);
  return directory;
}

async function writeFileIn(directory: string, name: string, content: string): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, name), content);
}
