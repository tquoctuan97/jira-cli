export type SkillInstallRequest = {
  targetRoot: string;
  force: boolean;
};

export type SkillInstallResult = {
  name: string;
  path: string;
  replaced: boolean;
};

export interface SkillInstallerPort {
  install(request: SkillInstallRequest): Promise<SkillInstallResult>;
}
