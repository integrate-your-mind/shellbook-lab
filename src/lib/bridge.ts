import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommandResult } from "./types.js";

const execFileAsync = promisify(execFile);

export interface BridgeOptions {
  session: string;
  attach: boolean;
  createOnly: boolean;
  shellbookBin: string;
}

export async function openBridge(options: BridgeOptions): Promise<CommandResult> {
  const hasSession = await tmuxHasSession(options.session);
  if (!hasSession) {
    await execFileAsync("tmux", ["new-session", "-d", "-s", options.session, `${options.shellbookBin} tui`]);
  }

  if (options.attach && !options.createOnly) {
    await execFileAsync("tmux", ["attach-session", "-t", options.session], { stdio: "inherit" } as any);
  }

  return {
    ok: true,
    title: hasSession ? "bridge ready" : "bridge created",
    summary: options.createOnly
      ? `Shellbook tmux session ${options.session} is ready.`
      : `Attach with: tmux attach -t ${options.session}`,
    data: { session: options.session, created: !hasSession },
  };
}

async function tmuxHasSession(session: string): Promise<boolean> {
  try {
    await execFileAsync("tmux", ["has-session", "-t", session], { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

