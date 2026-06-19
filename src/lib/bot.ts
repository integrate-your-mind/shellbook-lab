import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommandResult } from "./types.js";

const execFileAsync = promisify(execFile);

export interface BotOptions {
  kind: string;
  target: string;
  message: string;
  send: boolean;
  shellbookBin: string;
}

export async function postBotMessage(options: BotOptions): Promise<CommandResult> {
  if (!["room", "dm"].includes(options.kind)) {
    return { ok: false, title: "invalid bot kind", summary: "--kind must be room or dm" };
  }

  const args = options.kind === "room" ? ["room", "post", options.target, options.message] : ["dm", "send", options.target, options.message];

  if (!options.send) {
    return {
      ok: true,
      title: "dry-run bot message",
      summary: `Would run: ${options.shellbookBin} ${quoteArgs(args)}`,
      data: { send: false, kind: options.kind, target: options.target, message: options.message },
    };
  }

  const { stdout, stderr } = await execFileAsync(options.shellbookBin, args, { timeout: 10_000 });
  return {
    ok: true,
    title: "message sent",
    summary: stdout.trim() || stderr.trim() || `Sent ${options.kind} message to ${options.target}.`,
    data: { send: true, kind: options.kind, target: options.target },
  };
}

function quoteArgs(args: string[]): string {
  return args.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(" ");
}

