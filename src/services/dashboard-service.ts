import { Effect } from "effect";
import { buildAnalytics, buildHandoff, buildPresence, doctor, prWatch, readEvents } from "../lib/index.js";
import { modules } from "../lib/plan.js";
import { auditPrivacy } from "../lib/privacy.js";
import type { CommandResult, ModulePlan, RunEvent } from "../lib/types.js";

export interface DashboardServiceOptions {
  stateDir: string;
  shellbookBin: string;
  repo: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  tone: "ok" | "warn" | "neutral";
}

export interface DashboardSnapshot {
  handle: string;
  modules: ModulePlan[];
  metrics: DashboardMetric[];
  sessions: Array<{ agent: string; repo: string; status: string; duration: string }>;
  pr: unknown;
  feed: Array<{ time: string; text: string }>;
  health: CommandResult;
  analytics: CommandResult;
  presence: CommandResult;
}

export interface HandoffPayload {
  result: CommandResult;
}

export interface PresencePayload {
  result: CommandResult;
}

export interface PrivacyAuditPayload {
  result: CommandResult;
}

export function serviceOptions(): DashboardServiceOptions {
  return {
    stateDir: process.env.SHELLBOOK_LAB_STATE_DIR ?? ".shellbook-lab",
    shellbookBin: process.env.SHELLBOOK_BIN ?? "shellbook",
    repo: process.cwd(),
  };
}

export async function dashboardSnapshot(options = serviceOptions()): Promise<DashboardSnapshot> {
  return Effect.runPromise(snapshotProgram(options));
}

export async function privacyAudit(options = serviceOptions()): Promise<PrivacyAuditPayload> {
  return Effect.runPromise(
    tryCommand(() => auditPrivacy({ paths: [options.repo], maxBytes: 500_000 }), "privacy audit").pipe(
      Effect.map((result) => ({ result })),
    ),
  );
}

export async function handoffPreview(options = serviceOptions()): Promise<HandoffPayload> {
  return Effect.runPromise(
    tryCommand(
      () =>
        buildHandoff({
          title: "Shellbook Lab dashboard handoff",
          summary: "Preview generated from the local Next dashboard.",
          status: "preview",
          format: "json",
          stateDir: options.stateDir,
        }),
      "handoff preview",
    ).pipe(Effect.map((result) => ({ result }))),
  );
}

export async function readPresenceSnapshot(options = serviceOptions()): Promise<PresencePayload> {
  return Effect.runPromise(
    tryCommand(
      () =>
        buildPresence({
          stateDir: options.stateDir,
          agent: "codex",
          repo: options.repo,
          status: "available",
          read: true,
        }),
      "presence read",
    ).pipe(Effect.map((result) => ({ result }))),
  );
}

export async function writePresenceSnapshot(status: string, options = serviceOptions()): Promise<PresencePayload> {
  return Effect.runPromise(
    tryCommand(
      () =>
        buildPresence({
          stateDir: options.stateDir,
          agent: "codex",
          repo: options.repo,
          status,
          read: false,
        }),
      "presence write",
    ).pipe(Effect.map((result) => ({ result }))),
  );
}

function snapshotProgram(options: DashboardServiceOptions) {
  const health = tryCommand(() => doctor({ shellbookBin: options.shellbookBin }), "doctor");
  const analytics = tryCommand(
    () => buildAnalytics({ stateDir: options.stateDir, shellbookBin: options.shellbookBin }),
    "analytics",
  );
  const pr = tryCommand(() => prWatch({ repo: options.repo, timeoutMs: 2000 }), "pr watcher");
  const presence = tryCommand(
    () =>
      buildPresence({
        stateDir: options.stateDir,
        agent: "codex",
        repo: options.repo,
        status: "available",
        read: true,
      }),
    "presence",
  );
  const events = tryValue(() => readEvents(options.stateDir), [] as RunEvent[]);

  return Effect.all([health, analytics, pr, presence, events], { concurrency: "unbounded" }).pipe(
    Effect.map(([healthResult, analyticsResult, prResult, presenceResult, runEvents]) => {
      const recent = runEvents.slice(-6).reverse();
      return {
        handle: String(healthResult.data?.identity ?? "@unknown"),
        modules,
        metrics: [
          { label: "Shellbook", value: healthResult.ok ? "Ready" : "Needs review", tone: healthResult.ok ? "ok" : "warn" },
          { label: "Wrapped runs", value: String(analyticsResult.data?.totalRuns ?? 0), tone: "neutral" },
          { label: "Failed runs", value: String(analyticsResult.data?.failedRuns ?? 0), tone: failedTone(analyticsResult) },
          { label: "PR state", value: prResult.ok ? "Checked" : "Local only", tone: prResult.ok ? "ok" : "warn" },
        ],
        sessions: sessionsFromEvents(recent),
        pr: prResult.data ?? { branch: "unknown", status: prResult.summary },
        feed: feedFromEvents(recent),
        health: healthResult,
        analytics: analyticsResult,
        presence: presenceResult,
      } satisfies DashboardSnapshot;
    }),
  );
}

function tryCommand(run: () => Promise<CommandResult>, title: string) {
  return Effect.tryPromise({
    try: run,
    catch: (error) => error,
  }).pipe(Effect.catchAll((error) => Effect.succeed(failedResult(title, error))));
}

function tryValue<T>(run: () => Promise<T>, fallback: T) {
  return Effect.tryPromise({
    try: run,
    catch: () => undefined,
  }).pipe(Effect.catchAll(() => Effect.succeed(fallback)));
}

function failedResult(title: string, error: unknown): CommandResult {
  return {
    ok: false,
    title,
    summary: error instanceof Error ? error.message : String(error),
  };
}

function sessionsFromEvents(events: RunEvent[]): DashboardSnapshot["sessions"] {
  if (events.length === 0) {
    return [{ agent: "codex", repo: "shellbook-lab", status: "idle", duration: "0s" }];
  }
  return events.map((event) => ({
    agent: event.label,
    repo: event.repoName,
    status: event.exitCode === 0 ? "ok" : "review",
    duration: `${Math.round(event.durationMs / 1000)}s`,
  }));
}

function feedFromEvents(events: RunEvent[]): DashboardSnapshot["feed"] {
  if (events.length === 0) {
    return [
      { time: "now", text: "Dashboard ready. Run shellbook-lab wrap to record agent sessions." },
      { time: "now", text: "Room and DM bots stay dry-run until --send is passed." },
    ];
  }
  return events.map((event) => ({
    time: new Date(event.endedAt).toLocaleTimeString(),
    text: `${event.label} exited ${event.exitCode} in ${Math.round(event.durationMs / 1000)}s`,
  }));
}

function failedTone(result: CommandResult): DashboardMetric["tone"] {
  return (result.data?.failedRuns ?? 0) > 0 ? "warn" : "ok";
}
