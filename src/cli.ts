#!/usr/bin/env node
import { startDashboard } from "./dashboard/server.js";
import {
  auditPrivacy,
  buildAnalytics,
  buildHandoff,
  buildPlan,
  buildPresence,
  buildStatusline,
  doctor,
  openBridge,
  postBotMessage,
  prWatch,
  wrapCommand,
} from "./lib/index.js";
import { formatJson, printResult } from "./lib/output.js";
import type { CommandResult } from "./lib/types.js";

interface GlobalOptions {
  json: boolean;
  stateDir: string;
  shellbookBin: string;
}

interface Parsed {
  command: string;
  subcommand?: string;
  flags: Map<string, string | boolean>;
  args: string[];
  globals: GlobalOptions;
}

const helpText = `Shellbook Lab

Usage:
  shellbook-lab [global flags] <command> [flags]

Global flags:
  --json
  --state-dir <path>         default .shellbook-lab
  --shellbook-bin <path>     default SHELLBOOK_BIN or shellbook
  -h, --help
  --version

Commands:
  plan
  dashboard [--host 127.0.0.1] [--port 8791] [--open true|false]
  bot --kind room|dm --target <name> --message <text> [--send]
  pr-watch [--repo <path>] [--timeout-ms 8000]
  handoff [--title <title>] [--summary <text>] [--status <status>] [--output <path>] [--format markdown|json]
  presence [--agent <name>] [--repo <path>] [--status <status>] [--read]
  statusline [--plain]
  privacy audit [paths...] [--max-bytes 1000000]
  analytics
  bridge [--session shellbook-chat] [--attach] [--create-only]
  wrap <command> [args...] [--label <label>] [--repo <path>]
  doctor
`;

async function main(argv: string[]): Promise<void> {
  const parsed = parse(argv);
  if (parsed.flags.has("version")) {
    console.log("0.1.0");
    return;
  }
  if (parsed.flags.has("help") || parsed.flags.has("h") || parsed.command === "help" || parsed.command === "") {
    console.log(helpText);
    return;
  }

  const result = await run(parsed);
  if (parsed.command !== "statusline") {
    await printResult(result, parsed.globals);
  }
  if (!result.ok) {
    const wrappedExitCode = "exitCode" in result ? result.exitCode : undefined;
    if (parsed.command !== "wrap" || typeof wrappedExitCode !== "number") {
      process.exitCode = parsed.command === "privacy" ? 3 : 2;
    }
  }
}

async function run(parsed: Parsed): Promise<CommandResult> {
  const flag = (name: string, fallback = "") => stringFlag(parsed.flags, name, fallback);
  const bool = (name: string) => parsed.flags.get(name) === true;
  const number = (name: string, fallback: number) => Number.parseInt(flag(name, String(fallback)), 10);

  switch (parsed.command) {
    case "plan":
      return buildPlan();
    case "dashboard":
      return startDashboard({
        host: flag("host", "127.0.0.1"),
        port: number("port", 8791),
        stateDir: parsed.globals.stateDir,
        open: flag("open", "false") === "true",
        shellbookBin: parsed.globals.shellbookBin,
      });
    case "bot":
      requireFlags(parsed.flags, ["kind", "target", "message"]);
      return postBotMessage({
        kind: flag("kind"),
        target: flag("target"),
        message: flag("message"),
        send: bool("send"),
        shellbookBin: parsed.globals.shellbookBin,
      });
    case "pr-watch":
      return prWatch({ repo: flag("repo", process.cwd()), timeoutMs: number("timeout-ms", 8000) });
    case "handoff":
      return buildHandoff({
        title: flag("title", "Shellbook Lab handoff"),
        summary: flag("summary", ""),
        status: flag("status", "needs-review"),
        output: optionalStringFlag(parsed.flags, "output"),
        format: flag("format", "markdown"),
        stateDir: parsed.globals.stateDir,
      });
    case "presence":
      return buildPresence({
        stateDir: parsed.globals.stateDir,
        agent: flag("agent", "codex"),
        repo: flag("repo", process.cwd()),
        status: flag("status", "available"),
        read: bool("read"),
      });
    case "statusline": {
      const result = await buildStatusline({
        stateDir: parsed.globals.stateDir,
        plain: bool("plain"),
        shellbookBin: parsed.globals.shellbookBin,
      });
      if (parsed.globals.json) {
        console.log(formatJson(result));
      } else {
        console.log(result.line);
      }
      return { ok: true, title: "statusline printed", summary: result.line };
    }
    case "privacy":
      if (parsed.subcommand !== "audit") {
        return { ok: false, title: "invalid privacy command", summary: "Use: shellbook-lab privacy audit [paths...]" };
      }
      return auditPrivacy({
        paths: parsed.args.length > 0 ? parsed.args : ["."],
        maxBytes: number("max-bytes", 1_000_000),
      });
    case "analytics":
      return buildAnalytics({ stateDir: parsed.globals.stateDir, shellbookBin: parsed.globals.shellbookBin });
    case "bridge":
      return openBridge({
        session: flag("session", "shellbook-chat"),
        attach: bool("attach"),
        createOnly: bool("create-only"),
        shellbookBin: parsed.globals.shellbookBin,
      });
    case "wrap": {
      const [command, ...args] = parsed.args;
      if (!command) {
        return { ok: false, title: "missing command", summary: "Use: shellbook-lab wrap <command> [args...]" };
      }
      const result = await wrapCommand({
        command,
        args,
        label: flag("label", "agent"),
        repo: flag("repo", process.cwd()),
        stateDir: parsed.globals.stateDir,
      });
      process.exitCode = result.exitCode;
      return result;
    }
    case "doctor":
      return doctor({ shellbookBin: parsed.globals.shellbookBin });
    default:
      return { ok: false, title: "unknown command", summary: `Unknown command: ${parsed.command}. Use --help.` };
  }
}

function parse(argv: string[]): Parsed {
  const globals: GlobalOptions = {
    json: false,
    stateDir: ".shellbook-lab",
    shellbookBin: process.env.SHELLBOOK_BIN ?? "shellbook",
  };
  const flags = new Map<string, string | boolean>();
  const args: string[] = [];
  const booleanFlags = new Set(["json", "help", "version", "send", "read", "plain", "attach", "create-only"]);
  let command = "";
  let subcommand: string | undefined;
  let stopFlags = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") {
      stopFlags = true;
      continue;
    }
    if (!stopFlags && token.startsWith("--")) {
      const [rawName, inlineValue] = token.slice(2).split("=", 2);
      const next = argv[index + 1];
      const value = inlineValue ?? (booleanFlags.has(rawName) ? true : next && !next.startsWith("-") ? next : true);
      if (value === next) {
        index += 1;
      }
      if (rawName === "json") {
        globals.json = true;
      } else if (rawName === "state-dir") {
        globals.stateDir = String(value);
      } else if (rawName === "shellbook-bin") {
        globals.shellbookBin = String(value);
      } else {
        flags.set(rawName, value);
      }
      continue;
    }
    if (!stopFlags && token === "-h") {
      flags.set("help", true);
      continue;
    }
    if (!command) {
      command = token;
    } else if (command === "privacy" && !subcommand) {
      subcommand = token;
    } else {
      args.push(token);
    }
  }

  return { command, subcommand, flags, args, globals };
}

function stringFlag(flags: Map<string, string | boolean>, name: string, fallback = ""): string {
  const value = flags.get(name);
  return typeof value === "string" ? value : fallback;
}

function optionalStringFlag(flags: Map<string, string | boolean>, name: string): string | undefined {
  const value = flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function requireFlags(flags: Map<string, string | boolean>, names: string[]): void {
  const missing = names.filter((name) => typeof flags.get(name) !== "string");
  if (missing.length > 0) {
    throw new Error(`missing required flag(s): ${missing.map((name) => `--${name}`).join(", ")}`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`error: ${message}`);
  process.exit(1);
});
