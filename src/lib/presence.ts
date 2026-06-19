import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CommandResult } from "./types.js";
import { repoName } from "./events.js";

export interface PresenceOptions {
  stateDir: string;
  agent: string;
  repo: string;
  status: string;
  read: boolean;
}

export async function buildPresence(options: PresenceOptions): Promise<CommandResult> {
  const path = join(options.stateDir, "presence.json");
  if (options.read) {
    const data = await readPresence(path);
    return {
      ok: true,
      title: "presence",
      summary: data ? `${data.agent} is ${data.status} in ${data.repoName}` : "No presence snapshot exists.",
      data,
    };
  }

  const presence = {
    agent: options.agent,
    repo: options.repo,
    repoName: repoName(options.repo),
    status: options.status,
    updatedAt: new Date().toISOString(),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(presence, null, 2), { mode: 0o600 });
  return {
    ok: true,
    title: "presence written",
    summary: `${presence.agent} is ${presence.status} in ${presence.repoName}.`,
    data: presence,
  };
}

async function readPresence(path: string) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

