import { InvalidArgumentError, Option } from "commander";
import { invalidInput } from "../domain/errors.js";

export function positiveInteger(value: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0)
    throw new InvalidArgumentError("must be a positive integer");
  return result;
}

export function nonNegativeInteger(value: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new InvalidArgumentError("must be a non-negative integer");
  return result;
}

export function confirm(expected: string, actual: string): void {
  if (actual !== expected)
    throw invalidInput(`Destructive operation requires --confirm ${expected}`);
}

export const outputOption = new Option("-o, --output <format>", "output format")
  .choices(["json", "raw", "markdown", "text"])
  .default("json");
