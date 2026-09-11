import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { gt, valid } from "semver";
import { updateCheckPath } from "../infrastructure/session/paths.js";

const REGISTRY_URL = "https://registry.npmjs.org/@tquoctuan97%2Fjira-cli/latest";
const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_TIMEOUT_MS = 1_000;

type UpdateCache = { checkedAt: number; latestVersion?: string };
type UpdateCheckOptions = {
  config?: string;
  quiet: boolean;
  currentVersion: string;
  now?: () => number;
  fetchImpl?: typeof fetch;
};

/** Runs in the background and never rejects or affects the Jira command. */
export async function checkForUpdate(options: UpdateCheckOptions): Promise<void> {
  if (options.quiet || process.env.JIRA_CLI_NO_UPDATE_CHECK === "1") return;
  const current = valid(options.currentVersion);
  if (!current || options.currentVersion.includes("-") || options.currentVersion.includes("+"))
    return;

  const now = options.now ?? Date.now;
  const path = updateCheckPath(options.config);
  const cached = await readCache(path);
  if (cached && now() >= cached.checkedAt && now() - cached.checkedAt < DAY_MS) {
    notifyIfNewer(current, cached.latestVersion);
    return;
  }

  const latestVersion = await fetchLatestVersion(options.fetchImpl ?? fetch);
  await writeCache(path, {
    checkedAt: now(),
    ...(latestVersion === undefined ? {} : { latestVersion }),
  });
  notifyIfNewer(current, latestVersion);
}

async function fetchLatestVersion(fetchImpl: typeof fetch): Promise<string | undefined> {
  try {
    const response = await Promise.race([
      fetchImpl(REGISTRY_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      }),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error("update check timed out")),
          CHECK_TIMEOUT_MS,
        );
        timer.unref?.();
      }),
    ]);
    if (!response.ok) return undefined;

    const body: unknown = await response.json();
    const version =
      body && typeof body === "object" ? (body as Record<string, unknown>).version : undefined;
    return typeof version === "string" && valid(version) ? version : undefined;
  } catch {
    // Update checks are advisory and must never interfere with Jira commands.
    return undefined;
  }
}

function notifyIfNewer(current: string, latest: string | undefined): void {
  if (latest && gt(latest, current))
    process.stderr.write(
      `UPDATE_AVAILABLE: jira-cli ${current} -> ${latest}. Ask the user for approval, then run: npm install --global @tquoctuan97/jira-cli@latest\n`,
    );
}

async function readCache(path: string): Promise<UpdateCache | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!parsed || typeof parsed !== "object") return undefined;
    const value = parsed as Record<string, unknown>;
    if (typeof value.checkedAt !== "number" || !Number.isFinite(value.checkedAt)) return undefined;
    if (value.latestVersion !== undefined && typeof value.latestVersion !== "string")
      return undefined;
    if (typeof value.latestVersion === "string" && !valid(value.latestVersion)) return undefined;
    return {
      checkedAt: value.checkedAt,
      ...(typeof value.latestVersion === "string" ? { latestVersion: value.latestVersion } : {}),
    };
  } catch {
    return undefined;
  }
}

async function writeCache(path: string, cache: UpdateCache): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, path);
  } catch {
    // A read-only or otherwise unavailable cache is non-fatal.
  }
}
