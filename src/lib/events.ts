import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import type { RunEvent } from "./types.js";

export function eventPath(stateDir: string): string {
  return join(stateDir, "events.jsonl");
}

export async function appendEvent(stateDir: string, event: RunEvent): Promise<void> {
  const path = eventPath(stateDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(event)}\n`, { flag: "a", mode: 0o600 });
}

export async function readEvents(stateDir: string): Promise<RunEvent[]> {
  try {
    const raw = await readFile(eventPath(stateDir), "utf8");
    const events: RunEvent[] = [];
    for (const line of raw.split("\n").filter(Boolean)) {
      try {
        events.push(JSON.parse(line) as RunEvent);
      } catch {
        continue;
      }
    }
    return events;
  } catch {
    return [];
  }
}

export function repoName(repo: string): string {
  return basename(repo.replace(/\/$/, "")) || "unknown";
}
