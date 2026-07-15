import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { invalidInput } from "../domain/errors.js";

export async function readJsonInput(path: string): Promise<unknown> {
  const content = path === "-" ? await readStdin() : await readFile(path, "utf8");
  try {
    return JSON.parse(content);
  } catch {
    throw invalidInput(`${path === "-" ? "stdin" : path} must contain valid JSON`);
  }
}

export function readTextInput(path: string): Promise<string> {
  return path === "-" ? readStdin() : readFile(path, "utf8");
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

export async function prompt(label: string): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return await readline.question(label);
  } finally {
    readline.close();
  }
}

export async function promptSecret(label: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY)
    throw invalidInput("A PAT must be provided through JIRA_TOKEN or --token-stdin");
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let secret = "";
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(secret);
          return;
        }
        if (character === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Interrupted"));
          return;
        }
        if (character === "\u007f" || character === "\b") secret = secret.slice(0, -1);
        else if (character >= " ") secret += character;
      }
    };
    stdin.on("data", onData);
  });
}
