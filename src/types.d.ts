declare module "semver" {
  export function gt(version1: string, version2: string): boolean;
  export function valid(version: string): string | null;
}
