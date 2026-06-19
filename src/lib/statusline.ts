import type { CommandResult } from "./types.js";
import { buildAnalytics } from "./analytics.js";
import { buildPresence } from "./presence.js";

export async function buildStatusline(options: { stateDir: string; plain: boolean; shellbookBin: string }): Promise<CommandResult & { line: string }> {
  const [analytics, presence] = await Promise.all([
    buildAnalytics({ stateDir: options.stateDir, shellbookBin: options.shellbookBin }),
    buildPresence({ stateDir: options.stateDir, agent: "codex", repo: process.cwd(), status: "available", read: true }),
  ]);
  const totalRuns = analytics.data?.totalRuns ?? 0;
  const failedRuns = analytics.data?.failedRuns ?? 0;
  const status = presence.data?.status ?? "idle";
  const repo = presence.data?.repoName ?? "no-presence";
  const line = `Shellbook Lab | ${status} | ${repo} | runs ${totalRuns} | failed ${failedRuns}`;

  return {
    ok: true,
    title: "statusline",
    summary: line,
    line,
    data: { totalRuns, failedRuns, presence: presence.data },
  };
}

