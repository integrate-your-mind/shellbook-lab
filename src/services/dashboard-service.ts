import { Effect } from "effect";
import {
  buildAnalytics,
  buildHandoff,
  buildPresence,
  buildStatusline,
  doctor,
  openBridge,
  postBotMessage,
  prWatch,
  readEvents,
  wrapCommand,
} from "../lib/index.js";
import { missionsFromEvents, replayFromEvents, type AgentMission, type ReplayFrame } from "../lib/ops.js";
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
  missions: AgentMission[];
  replay: ReplayFrame[];
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

type DashboardActionSideEffect = "none" | "local-only";

interface DashboardActionConfig {
  command: string;
  sideEffect: DashboardActionSideEffect;
  nextSteps: string[];
  run: (options: DashboardServiceOptions) => Promise<CommandResult>;
}

const dashboardActions = {
  "bot-dry-run": {
    command: "shellbook-lab bot --kind room --target shellbook-lab --message \"Shellbook Lab dashboard dry-run\"",
    sideEffect: "none",
    nextSteps: ["Inspect the dry-run payload.", "Only add --send from the CLI when you intend to post."],
    run: (options) =>
      postBotMessage({
        kind: "room",
        target: "shellbook-lab",
        message: "Shellbook Lab dashboard dry-run. No message was sent.",
        send: false,
        shellbookBin: options.shellbookBin,
      }),
  },
  "statusline-preview": {
    command: "shellbook-lab statusline --plain",
    sideEffect: "none",
    nextSteps: ["Paste the line into tmux, starship, or a shell prompt hook."],
    run: (options) =>
      buildStatusline({
        stateDir: options.stateDir,
        plain: true,
        shellbookBin: options.shellbookBin,
      }),
  },
  "bridge-create": {
    command: "shellbook-lab bridge --session shellbook-chat --create-only",
    sideEffect: "local-only",
    nextSteps: ["Attach with tmux attach -t shellbook-chat.", "Keep create-only mode for dashboard safety."],
    run: (options) =>
      openBridge({
        session: "shellbook-chat",
        attach: false,
        createOnly: true,
        shellbookBin: options.shellbookBin,
      }),
  },
  "wrap-smoke": {
    command: "shellbook-lab wrap node -e \"process.stdout.write('shellbook-lab dashboard smoke')\" --label dashboard-smoke",
    sideEffect: "local-only",
    nextSteps: ["Refresh Agent Ops or Analytics to see the replay event.", "Use wrap on real commands to build history."],
    run: (options) =>
      wrapCommand({
        command: process.execPath,
        args: ["-e", "process.stdout.write('shellbook-lab dashboard smoke\\n')"],
        label: "dashboard-smoke",
        repo: options.repo,
        stateDir: options.stateDir,
      }),
  },
} satisfies Record<string, DashboardActionConfig>;

export type DashboardActionId = keyof typeof dashboardActions;

export const dashboardActionIds = Object.keys(dashboardActions) as DashboardActionId[];

export interface DashboardActionPayload {
  action: DashboardActionId;
  command: string;
  generatedAt: string;
  sideEffect: DashboardActionSideEffect;
  nextSteps: string[];
  result: CommandResult;
}

export type DashboardActionRequest =
  | { ok: true; action: DashboardActionId; confirmLocalOnly: boolean }
  | { ok: false; status: number; title: string; summary: string };

export type PresenceStatus = "available" | "busy" | "reviewing" | "offline";

export type PresenceStatusRequest =
  | { ok: true; status: PresenceStatus }
  | { ok: false; statusCode: number; title: string; summary: string };

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

export async function dashboardAction(
  action: DashboardActionId,
  options = serviceOptions(),
  request: { confirmLocalOnly?: boolean } = {},
): Promise<DashboardActionPayload> {
  const config = dashboardActions[action];
  if (config.sideEffect === "local-only" && request.confirmLocalOnly !== true) {
    return actionPayload(action, failedResult("confirmation required", `${action} requires confirmLocalOnly: true.`));
  }

  return Effect.runPromise(
    tryCommand(() => config.run(options), `dashboard action ${action}`).pipe(Effect.map((result) => actionPayload(action, result))),
  );
}

export function isDashboardActionId(value: unknown): value is DashboardActionId {
  return typeof value === "string" && value in dashboardActions;
}

export function validateDashboardActionRequest(body: unknown): DashboardActionRequest {
  const data = objectData(body);
  const action = data?.action;
  if (!isDashboardActionId(action)) {
    return {
      ok: false,
      status: 400,
      title: "invalid dashboard action",
      summary: `Use ${dashboardActionIds.join(", ")}.`,
    };
  }

  const confirmLocalOnly = data?.confirmLocalOnly === true;
  if (dashboardActions[action].sideEffect === "local-only" && !confirmLocalOnly) {
    return {
      ok: false,
      status: 409,
      title: "local action confirmation required",
      summary: `${action} changes local machine state. Send confirmLocalOnly: true.`,
    };
  }

  return { ok: true, action, confirmLocalOnly };
}

export function parsePresenceStatusRequest(body: unknown): PresenceStatusRequest {
  const data = objectData(body);
  const status = data?.status;
  if (status === "available" || status === "busy" || status === "reviewing" || status === "offline") {
    return { ok: true, status };
  }

  return {
    ok: false,
    statusCode: 400,
    title: "invalid presence status",
    summary: "Use available, busy, reviewing, or offline.",
  };
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
        missions: missionsFromEvents(runEvents, presenceResult, options.repo),
        replay: replayFromEvents(runEvents, 8),
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

function actionPayload(action: DashboardActionId, result: CommandResult): DashboardActionPayload {
  const config = dashboardActions[action];
  return {
    action,
    command: config.command,
    generatedAt: new Date().toISOString(),
    sideEffect: config.sideEffect,
    nextSteps: config.nextSteps,
    result,
  };
}

function objectData(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
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
