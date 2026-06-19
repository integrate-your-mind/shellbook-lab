import type { CommandResult } from "./types.js";

export function formatJson(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

export async function printResult(result: CommandResult, options: { json?: boolean }): Promise<void> {
  if (options.json) {
    console.log(formatJson(result));
    return;
  }

  console.log(`${result.ok ? "OK" : "ERR"} ${result.title}`);
  if (result.summary) {
    console.log(result.summary);
  }
}

