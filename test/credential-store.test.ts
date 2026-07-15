import { access, chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Runtime } from "../src/cli/runtime.js";
import { FileCredentialStore } from "../src/infrastructure/session/credential-store.js";

const directories: string[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("FileCredentialStore", () => {
  it("saves, loads, replaces, and deletes a credential with mode 0600", async () => {
    const directory = await temporaryDirectory();
    const sessionPath = join(directory, "session.json");
    const credentialPath = join(directory, "credentials.json");
    const store = new FileCredentialStore(sessionPath);

    await store.save("active", "first-token");
    expect(await store.load("active")).toBe("first-token");
    expect((await stat(credentialPath)).mode & 0o777).toBe(0o600);

    await chmod(credentialPath, 0o644);
    await store.save("active", "replacement-token");
    expect(await store.load("active")).toBe("replacement-token");
    expect((await stat(credentialPath)).mode & 0o777).toBe(0o600);

    await store.delete("active");
    await expect(access(credentialPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an invalid credential file without overwriting it", async () => {
    const directory = await temporaryDirectory();
    const sessionPath = join(directory, "session.json");
    const credentialPath = join(directory, "credentials.json");
    await writeFile(credentialPath, "not-json", { mode: 0o600 });
    const store = new FileCredentialStore(sessionPath);

    await expect(store.save("active", "token")).rejects.toMatchObject({
      code: "INVALID_CREDENTIAL_FILE",
    });
    expect(await readFile(credentialPath, "utf8")).toBe("not-json");
  });

  it("keeps the PAT out of login output while reporting plaintext storage", async () => {
    const directory = await temporaryDirectory();
    const sessionPath = join(directory, "session.json");
    const token = "fixture-secret-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ name: "daniel", displayName: "Daniel" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await new Runtime().login(
      { config: sessionPath, output: "json", verbose: false },
      "https://jira.example.com",
      token,
    );

    expect(JSON.stringify(result)).not.toContain(token);
    expect(result).toMatchObject({
      authenticated: true,
      credentialStorage: {
        type: "plaintext-file",
        path: join(directory, "credentials.json"),
        permissions: "0600",
      },
    });
    expect(await readFile(join(directory, "credentials.json"), "utf8")).toContain(token);
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "jira-cli-credentials-"));
  directories.push(directory);
  return directory;
}
