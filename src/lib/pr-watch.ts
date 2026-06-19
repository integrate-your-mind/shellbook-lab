import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommandResult } from "./types.js";

const execFileAsync = promisify(execFile);

export async function prWatch(options: { repo: string; timeoutMs: number }): Promise<CommandResult> {
  const gitRoot = await run("git", ["rev-parse", "--show-toplevel"], options);
  if (!gitRoot.ok) {
    return {
      ok: false,
      title: "not a git repository",
      summary: `${options.repo} is not inside a git repository.`,
      data: { repo: options.repo },
    };
  }

  const branch = await run("git", ["branch", "--show-current"], options);
  const status = await run("git", ["status", "--short"], options);
  const upstream = await run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], options);
  const ghPr = await run("gh", ["pr", "view", "--json", "number,title,state,url,isDraft,mergeStateStatus"], options);

  return {
    ok: true,
    title: "pr watcher",
    summary: ghPr.ok ? "Local git and GitHub PR state checked." : "Local git checked; no current GitHub PR found.",
    data: {
      root: gitRoot.stdout.trim(),
      branch: branch.stdout.trim() || "detached",
      dirtyFiles: status.stdout.split("\n").filter(Boolean).length,
      upstream: upstream.ok ? upstream.stdout.trim() : null,
      pr: ghPr.ok ? JSON.parse(ghPr.stdout) : null,
      prError: ghPr.ok ? null : ghPr.stderr || ghPr.stdout,
    },
  };
}

async function run(command: string, args: string[], options: { repo: string; timeoutMs: number }) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: options.repo, timeout: options.timeoutMs });
    return { ok: true, stdout, stderr };
  } catch (error: any) {
    return { ok: false, stdout: error.stdout ?? "", stderr: error.stderr ?? error.message ?? String(error) };
  }
}

