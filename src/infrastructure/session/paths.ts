import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

export function sessionPath(override?: string): string {
  return override ?? join(configDirectory(), "session.json");
}

export function credentialsPath(sessionOverride?: string): string {
  return sessionOverride
    ? join(dirname(sessionOverride), "credentials.json")
    : join(configDirectory(), "credentials.json");
}

export function updateCheckPath(sessionOverride?: string): string {
  return join(dirname(sessionPath(sessionOverride)), "update-check.json");
}

function configDirectory(): string {
  if (platform() === "win32")
    return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "jira-cli");
  if (platform() === "darwin") return join(homedir(), "Library", "Application Support", "jira-cli");
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "jira-cli");
}
