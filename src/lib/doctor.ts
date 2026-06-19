import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommandResult } from "./types.js";

const execFileAsync = promisify(execFile);

export async function doctor(options: { shellbookBin: string }): Promise<CommandResult> {
  const checks = await Promise.all([
    checkCommand(options.shellbookBin, ["version"], "shellbook"),
    checkCommand("tmux", ["-V"], "tmux"),
    checkCommand("git", ["--version"], "git"),
  ]);
  const setup = await checkCommand(options.shellbookBin, ["setup", "check"], "setup");
  const identity = parseIdentity(setup.output);
  const ok = checks.every((check) => check.ok) && setup.ok;

  return {
    ok,
    title: "doctor",
    summary: ok ? `Shellbook Lab ready${identity ? ` for ${identity}` : ""}.` : "One or more prerequisites need review.",
    data: { checks, setup: setup.output, identity },
  };
}

async function checkCommand(command: string, args: string[], name: string) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 5000 });
    return { name, ok: true, output: `${stdout}${stderr}`.trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { name, ok: false, output: message };
  }
}

function parseIdentity(output: string): string | null {
  const match = output.match(/identity:\s+ok\s+(@[A-Za-z0-9_]+)/);
  return match?.[1] ?? null;
}

