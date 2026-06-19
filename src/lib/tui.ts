import { buildOpsState, type AgentMission, type OpsOptions, type OpsState, type ReplayFrame } from "./ops.js";
import type { CommandResult } from "./types.js";

export interface TuiOptions extends OpsOptions {
  view: string;
  color: boolean;
  width?: number;
}

export async function buildTui(options: TuiOptions): Promise<CommandResult & { screen: string }> {
  const result = await buildOpsState(options);
  const state = result.data as OpsState;
  const validView = isTuiView(options.view);
  const screen = renderTui(state, {
    view: options.view,
    color: options.color,
    width: options.width ?? process.stdout.columns ?? 100,
  });

  return {
    ok: result.ok && validView,
    title: "Shellbook Labs TUI",
    summary: validView ? result.summary : `Unknown TUI view: ${options.view}.`,
    screen,
    data: state,
  };
}

export function renderTui(state: OpsState, options: { view: string; color: boolean; width: number }): string {
  const width = clamp(options.width, 72, 140);
  const body: string[] = [];
  const color = palette(options.color);
  const title = `${color.primary}Shellbook Labs TUI${color.reset} ${state.handle}  ${badge(state.health.ok ? "READY" : "REVIEW", state.health.ok, color)}`;
  body.push(line(width));
  body.push(padLine(title, width));
  body.push(padLine(`generated ${new Date(state.generatedAt).toLocaleString()}  |  ${state.analytics.summary}`, width));
  body.push(line(width));

  if (options.view === "all" || options.view === "mission") {
    body.push(section("Mission Control", width, color));
    body.push(...renderMissions(state.missions, width, color));
  }

  if (options.view === "all" || options.view === "replay") {
    body.push(section("Run Replay Timeline", width, color));
    body.push(...renderReplay(state.replay, width, color));
  }

  if (options.view !== "all" && options.view !== "mission" && options.view !== "replay") {
    body.push(section("Unknown view", width, color));
    body.push(padLine(`Use --view all, --view mission, or --view replay. Received: ${options.view}`, width));
  }

  body.push(line(width));
  return body.join("\n");
}

function isTuiView(view: string): boolean {
  return view === "all" || view === "mission" || view === "replay";
}

function renderMissions(missions: AgentMission[], width: number, color: ReturnType<typeof palette>): string[] {
  const rows = missions.map((mission) => {
    const state = badge(mission.status.toUpperCase(), mission.status === "ok" || mission.status === "idle", color);
    return `${mission.agent} | ${mission.repo} | ${state} | ${mission.lastRunAge} | ${mission.duration} | ${mission.nextAction}`;
  });
  return rows.length > 0 ? rows.map((row) => padLine(row, width)) : [padLine("No missions yet. Wrap a command to seed Mission Control.", width)];
}

function renderReplay(replay: ReplayFrame[], width: number, color: ReturnType<typeof palette>): string[] {
  if (replay.length === 0) {
    return [padLine("No replay frames yet. Run shellbook-lab wrap <command> to capture one.", width)];
  }
  return replay.map((frame) => {
    const state = badge(frame.status.toUpperCase(), frame.status === "ok", color);
    return padLine(`${state} ${frame.label} ${frame.repo} ${frame.duration} :: ${frame.command} -> ${frame.nextAction}`, width);
  });
}

function section(label: string, width: number, color: ReturnType<typeof palette>): string {
  return padLine(`${color.accent}${label}${color.reset}`, width);
}

function badge(label: string, ok: boolean, color: ReturnType<typeof palette>): string {
  return `${ok ? color.ok : color.warn}[${label}]${color.reset}`;
}

function line(width: number): string {
  return `+${"-".repeat(width - 2)}+`;
}

function padLine(value: string, width: number): string {
  const stripped = stripAnsi(value);
  const clipped = stripped.length > width - 4 ? clipAnsi(value, width - 7) + "..." : value;
  const printable = stripAnsi(clipped);
  return `| ${clipped}${" ".repeat(Math.max(0, width - 3 - printable.length))}|`;
}

function clipAnsi(value: string, max: number): string {
  let visible = 0;
  let out = "";
  for (let index = 0; index < value.length && visible < max; index += 1) {
    if (value[index] === "\u001b") {
      const end = value.indexOf("m", index);
      if (end === -1) {
        break;
      }
      out += value.slice(index, end + 1);
      index = end;
      continue;
    }
    out += value[index];
    visible += 1;
  }
  return out;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function palette(enabled: boolean) {
  if (!enabled) {
    return { primary: "", accent: "", ok: "", warn: "", reset: "" };
  }
  return {
    primary: "\u001b[1;36m",
    accent: "\u001b[1;33m",
    ok: "\u001b[1;32m",
    warn: "\u001b[1;31m",
    reset: "\u001b[0m",
  };
}
