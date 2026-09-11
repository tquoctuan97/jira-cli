import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkForUpdate } from "../src/application/update-check.js";

const directories: string[] = [];

describe("update check", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("checks stale metadata once, then notifies from a fresh cache on each invocation", async () => {
    const config = await configPath();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ version: "0.3.0" }) });

    await checkForUpdate({
      config,
      quiet: false,
      currentVersion: "0.2.0",
      now: () => 100_000,
      fetchImpl,
    });
    await checkForUpdate({
      config,
      quiet: false,
      currentVersion: "0.2.0",
      now: () => 100_001,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(stderr).toHaveBeenCalledTimes(2);
    expect(stderr.mock.calls[0]?.[0]).toContain("UPDATE_AVAILABLE: jira-cli 0.2.0 -> 0.3.0");
    expect(stdout).not.toHaveBeenCalled();
    expect(
      JSON.parse(await readFile(join(join(config, ".."), "update-check.json"), "utf8")),
    ).toEqual({
      checkedAt: 100_000,
      latestVersion: "0.3.0",
    });
  });

  it("silences equal, older, and local prerelease versions", async () => {
    const cases: Array<[string, string]> = [
      ["0.2.0", "0.2.0"],
      ["0.2.0", "0.1.0"],
      ["0.3.0-beta.1", "0.4.0"],
    ];
    for (const [currentVersion, latestVersion] of cases) {
      const config = await configPath();
      const fetchImpl = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ version: latestVersion }) });
      const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

      await checkForUpdate({
        config,
        quiet: false,
        currentVersion,
        now: () => 200_000,
        fetchImpl,
      });

      if (currentVersion.includes("-")) expect(fetchImpl).not.toHaveBeenCalled();
      else expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(stderr).not.toHaveBeenCalled();
      stderr.mockClear();
    }
  });

  it("skips both network checks and notices in quiet and environment opt-out modes", async () => {
    const config = await configPath();
    const fetchImpl = vi.fn();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    await checkForUpdate({ config, quiet: true, currentVersion: "0.2.0", fetchImpl });
    const previous = process.env.JIRA_CLI_NO_UPDATE_CHECK;
    process.env.JIRA_CLI_NO_UPDATE_CHECK = "1";
    try {
      await checkForUpdate({ config, quiet: false, currentVersion: "0.2.0", fetchImpl });
    } finally {
      if (previous === undefined) delete process.env.JIRA_CLI_NO_UPDATE_CHECK;
      else process.env.JIRA_CLI_NO_UPDATE_CHECK = previous;
    }

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
  });

  it("caches failed and malformed registry attempts without notices", async () => {
    const responses: Array<{ ok: boolean; json: () => Promise<unknown> }> = [
      { ok: false, json: async () => ({ version: "0.3.0" }) },
      { ok: true, json: async () => ({ version: "not-semver" }) },
      {
        ok: true,
        json: async () => {
          throw new Error("malformed JSON");
        },
      },
    ];
    for (const response of responses) {
      const config = await configPath();
      const fetchImpl = vi.fn().mockResolvedValue(response);
      const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

      await checkForUpdate({
        config,
        quiet: false,
        currentVersion: "0.2.0",
        now: () => 300_000,
        fetchImpl,
      });

      expect(stderr).not.toHaveBeenCalled();
      expect(
        JSON.parse(await readFile(join(join(config, ".."), "update-check.json"), "utf8")),
      ).toEqual({ checkedAt: 300_000 });
      stderr.mockClear();
    }
  });

  it("recovers from malformed cache and fails open when the cache cannot be written", async () => {
    const config = await configPath();
    const cache = join(join(config, ".."), "update-check.json");
    await writeFile(cache, "not-json");
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ version: "0.2.0" }) });
    await checkForUpdate({
      config,
      quiet: false,
      currentVersion: "0.2.0",
      now: () => 400_000,
      fetchImpl,
    });
    expect(JSON.parse(await readFile(cache, "utf8"))).toEqual({
      checkedAt: 400_000,
      latestVersion: "0.2.0",
    });

    await rm(cache);
    await mkdir(cache);
    await expect(
      checkForUpdate({
        config,
        quiet: false,
        currentVersion: "0.2.0",
        now: () => 500_000,
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
  });

  it("times out a hanging registry request and remains non-fatal", async () => {
    const config = await configPath();
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const fetchImpl = vi.fn().mockImplementation(() => new Promise<Response>(() => undefined));
    const started = Date.now();

    await expect(
      checkForUpdate({
        config,
        quiet: false,
        currentVersion: "0.2.0",
        now: () => 600_000,
        fetchImpl,
      }),
    ).resolves.toBeUndefined();

    expect(Date.now() - started).toBeLessThan(2_000);
    expect(stderr).not.toHaveBeenCalled();
  }, 3_000);
});

async function configPath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "jira-cli-update-"));
  directories.push(directory);
  return join(directory, "session.json");
}
