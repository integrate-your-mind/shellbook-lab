import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendEvent, repoName } from "./events.js";
import type { CommandResult, RunEvent } from "./types.js";

export interface WrapOptions {
  command: string;
  args: string[];
  label: string;
  repo: string;
  stateDir: string;
}

export async function wrapCommand(options: WrapOptions): Promise<CommandResult & { exitCode: number }> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const exitCode = await runPassthrough(options.command, options.args, options.repo);
  const ended = Date.now();
  const event: RunEvent = {
    id: randomUUID(),
    label: options.label,
    command: options.command,
    args: options.args,
    repo: options.repo,
    repoName: repoName(options.repo),
    startedAt,
    endedAt: new Date(ended).toISOString(),
    durationMs: ended - started,
    exitCode,
  };
  await appendEvent(options.stateDir, event);

  return {
    ok: exitCode === 0,
    title: "wrapped command",
    summary: `${options.command} exited ${exitCode}; metadata written to ${options.stateDir}.`,
    exitCode,
    data: event,
  };
}

async function runPassthrough(command: string, args: string[], cwd: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    child.on("error", () => resolve(127));
    child.on("close", (code, signal) => {
      if (signal) {
        resolve(128);
      } else {
        resolve(code ?? 1);
      }
    });
  });
}

