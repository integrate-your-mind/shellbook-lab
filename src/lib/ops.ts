import { buildAnalytics } from "./analytics.js";
import { doctor } from "./doctor.js";
import { readEvents } from "./events.js";
import { buildPresence } from "./presence.js";
import { prWatch } from "./pr-watch.js";
import type { CommandResult, RunEvent } from "./types.js";

export interface OpsOptions {
  stateDir: string;
  shellbookBin: string;
  repo: string;
  timeoutMs?: number;
  limit?: number;
}

export interface AgentMission {
  agent: string;
  repo: string;
  status: "idle" | "ok" | "review" | "stale";
  lastRun: string;
  lastRunAge: string;
  duration: string;
  exitCode: number | null;
  nextAction: string;
}

export interface ReplayFrame {
  id: string;
  label: string;
  command: string;
  repo: string;
  status: "ok" | "failed";
  duration: string;
  endedAt: string;
  nextAction: string;
}

export interface OpsState {
  handle: string;
  generatedAt: string;
  health: CommandResult;
  analytics: CommandResult;
  presence: CommandResult;
  pr: CommandResult;
  missions: AgentMission[];
  replay: ReplayFrame[];
}

export async function buildOpsState(options: OpsOptions): Promise<CommandResult> {
  const limit = options.limit ?? 8;
  const [health, analytics, presence, pr, events] = await Promise.all([
    safeResult(() => doctor({ shellbookBin: options.shellbookBin }), "doctor"),
    safeResult(() => buildAnalytics({ stateDir: options.stateDir, shellbookBin: options.shellbookBin }), "analytics"),
    safeResult(
      () =>
        buildPresence({
          stateDir: options.stateDir,
          agent: "codex",
          repo: options.repo,
          status: "available",
          read: true,
        }),
      "presence",
    ),
    safeResult(() => prWatch({ repo: options.repo, timeoutMs: options.timeoutMs ?? 2000 }), "pr watcher"),
    readEvents(options.stateDir),
  ]);
  const state: OpsState = {
    handle: String(health.data?.identity ?? "@unknown"),
    generatedAt: new Date().toISOString(),
    health,
    analytics,
    presence,
    pr,
    missions: missionsFromEvents(events, presence, options.repo),
    replay: replayFromEvents(events, limit),
  };

  return {
    ok: health.ok && presence.ok,
    title: "ops state",
    summary: `${state.missions.length} mission(s), ${state.replay.length} replay frame(s).`,
    data: state,
  };
}

const DEFAULT_REPLAY_LIMIT = 8;
const MAX_REPLAY_LIMIT = 100;
const STALE_MISSION_MS = 24 * 60 * 60 * 1000;

export function missionsFromEvents(
  events: RunEvent[],
  presence: CommandResult,
  fallbackRepo: string,
  now = new Date(),
): AgentMission[] {
  const latest = new Map<string, RunEvent>();
  for (const event of events) {
    latest.set(`${event.label}:${event.repo}`, event);
  }
  const missions = [...latest.values()].map((event) => toMission(event, now));
  if (missions.length > 0) {
    return missions.sort((a, b) => b.lastRun.localeCompare(a.lastRun));
  }

  const presenceData = presence.data as { agent?: string; repoName?: string; status?: string } | null | undefined;
  return [
    {
      agent: presenceData?.agent ?? "codex",
      repo: presenceData?.repoName ?? repoNameFromPath(fallbackRepo),
      status: presenceData?.status === "available" ? "idle" : "stale",
      lastRun: "no wrapped runs",
      lastRunAge: "none",
      duration: "0s",
      exitCode: null,
      nextAction: "Run shellbook-lab wrap to start replay capture.",
    },
  ];
}

function toMission(event: RunEvent, now: Date): AgentMission {
  const ok = event.exitCode === 0;
  const lastRunMs = Date.parse(event.endedAt);
  const ageMs = Number.isFinite(lastRunMs) ? Math.max(0, now.getTime() - lastRunMs) : null;
  const stale = ok && ageMs !== null && ageMs > STALE_MISSION_MS;
  return {
    agent: event.label,
    repo: event.repoName,
    status: stale ? "stale" : ok ? "ok" : "review",
    lastRun: event.endedAt,
    lastRunAge: formatAge(ageMs),
    duration: formatDuration(event.durationMs),
    exitCode: event.exitCode,
    nextAction: stale
      ? "Rerun proof before handoff; the last successful run is stale."
      : ok
        ? "Ready for handoff or another run."
        : "Review logs, rerun tests, or generate a handoff.",
  };
}

export function replayFromEvents(events: RunEvent[], limit = 8): ReplayFrame[] {
  return events.slice(-normalizeReplayLimit(limit)).reverse().map(toReplayFrame);
}

function toReplayFrame(event: RunEvent): ReplayFrame {
  const ok = event.exitCode === 0;
  return {
    id: event.id,
    label: event.label,
    command: redactCommand([event.command, ...event.args]).join(" "),
    repo: event.repoName,
    status: ok ? "ok" : "failed",
    duration: formatDuration(event.durationMs),
    endedAt: event.endedAt,
    nextAction: ok ? "Capture proof in handoff." : "Inspect failure path before continuing.",
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${Math.round(ms / 1000)}s`;
}

function formatAge(ms: number | null): string {
  if (ms === null) {
    return "unknown";
  }
  if (ms < 60_000) {
    return "just now";
  }
  if (ms < 3_600_000) {
    return `${Math.round(ms / 60_000)}m ago`;
  }
  if (ms < 86_400_000) {
    return `${Math.round(ms / 3_600_000)}h ago`;
  }
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function normalizeReplayLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_REPLAY_LIMIT;
  }
  return Math.min(MAX_REPLAY_LIMIT, Math.max(1, Math.trunc(limit)));
}

function redactCommand(parts: string[]): string[] {
  const redacted: string[] = [];
  let redactNext = false;
  for (const part of parts) {
    if (redactNext) {
      redacted.push("[redacted]");
      redactNext = false;
      continue;
    }
    const inline = redactInlineSecret(part);
    redacted.push(inline.value);
    redactNext = inline.redactNext;
  }
  return redacted;
}

function redactInlineSecret(value: string): { value: string; redactNext: boolean } {
  const [name, inline] = value.split("=", 2);
  if (isSensitiveKey(name)) {
    return { value: inline === undefined ? value : `${name}=[redacted]`, redactNext: inline === undefined };
  }
  if (/^(authorization|proxy-authorization):/i.test(value)) {
    return { value: "[redacted]", redactNext: false };
  }
  if (/^(bearer|basic)$/i.test(value)) {
    return { value, redactNext: true };
  }
  if (looksSecret(value)) {
    return { value: "[redacted]", redactNext: false };
  }
  return { value, redactNext: false };
}

function isSensitiveKey(value: string): boolean {
  return /(^|[-_])(api[-_]?key|apikey|auth|authorization|bearer|client[-_]?secret|password|secret|token)([-_]|$)/i.test(value);
}

function looksSecret(value: string): boolean {
  return (
    /sk-[A-Za-z0-9_-]{12,}/.test(value) ||
    /(ghp|github_pat|glpat|xox[baprs]|hf)_[A-Za-z0-9_-]{12,}/.test(value) ||
    /^[A-Za-z0-9+/=]{32,}$/.test(value)
  );
}

function repoNameFromPath(path: string): string {
  return path.replace(/\/$/, "").split("/").filter(Boolean).pop() ?? "unknown";
}

async function safeResult(run: () => Promise<CommandResult>, title: string): Promise<CommandResult> {
  try {
    return await run();
  } catch (error) {
    return {
      ok: false,
      title,
      summary: error instanceof Error ? error.message : String(error),
    };
  }
}
