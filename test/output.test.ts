import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeResult } from "../src/cli/output.js";

const directories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("output pipeline", () => {
  it("does not overwrite a binary file already handled by a command", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jira-cli-output-"));
    directories.push(directory);
    const destination = join(directory, "attachment.bin");
    const binary = Buffer.from([0, 1, 2, 3, 255]);
    await writeFile(destination, binary);
    vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await writeResult(
      { value: { downloaded: "10", outputFile: destination }, outputFileHandled: true },
      { output: "json", outputFile: destination, quiet: false, verbose: false },
    );

    expect(await readFile(destination)).toEqual(binary);
    expect(process.stdout.write).toHaveBeenCalledOnce();
  });
});
