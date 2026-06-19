import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readEvents } from "./events.js";
import type { CommandResult } from "./types.js";

const execFileAsync = promisify(execFile);

export async function buildAnalytics(options: { stateDir: string; shellbookBin: string }): Promise<CommandResult> {
  const events = await readEvents(options.stateDir);
  const totalRuns = events.length;
  const failedRuns = events.filter((event) => event.exitCode !== 0).length;
  const totalDurationMs = events.reduce((sum, event) => sum + event.durationMs, 0);
  const shellbook = await safeShellbookStatusline(options.shellbookBin);

  return {
    ok: true,
    title: "analytics",
    summary: `${totalRuns} wrapped runs, ${failedRuns} failed, ${Math.round(totalDurationMs / 1000)}s captured.`,
    data: {
      totalRuns,
      failedRuns,
      totalDurationMs,
      shellbook,
    },
  };
}

async function safeShellbookStatusline(shellbookBin: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(shellbookBin, ["statusline", "--style", "plain"], { timeout: 2500 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

