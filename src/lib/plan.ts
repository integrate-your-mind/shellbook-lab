import type { CommandResult, ModulePlan } from "./types.js";

export const modules: ModulePlan[] = [
  {
    id: "agent-ops-dashboard",
    name: "Agent Ops Dashboard",
    command: "dashboard",
    maturity: "mvp",
    summary: "Local web dashboard for wrapped sessions, PR state, privacy status, and activity.",
  },
  {
    id: "room-dm-bots",
    name: "Room/DM Bots",
    command: "bot",
    maturity: "mvp",
    summary: "Dry-run-first Shellbook room/DM posting through the public CLI.",
  },
  {
    id: "pr-ci-watcher",
    name: "PR / CI Watcher",
    command: "pr-watch",
    maturity: "mvp",
    summary: "Local git and optional gh PR/check state inspection.",
  },
  {
    id: "handoff-cards",
    name: "Agent Handoff Cards",
    command: "handoff",
    maturity: "mvp",
    summary: "Markdown/JSON cards for task continuation and review.",
  },
  {
    id: "team-presence",
    name: "Team Presence Layer",
    command: "presence",
    maturity: "mvp",
    summary: "Local presence snapshots without hidden Shellbook presence dependencies.",
  },
  {
    id: "statusline-plugin",
    name: "Shellbook Statusline Plugin",
    command: "statusline",
    maturity: "mvp",
    summary: "Compact statusline output for tmux/starship/scripts.",
  },
  {
    id: "privacy-auditor",
    name: "Local Privacy Auditor",
    command: "privacy audit",
    maturity: "mvp",
    summary: "Publish blocker scan for secrets, Shellbook auth files, DB dumps, and transcripts.",
  },
  {
    id: "personal-analytics",
    name: "Agent League / Personal Analytics",
    command: "analytics",
    maturity: "mvp",
    summary: "Local metrics from wrapper events and public Shellbook statusline output.",
  },
  {
    id: "shellbook-bridge",
    name: "Shellbook Bridge",
    command: "bridge",
    maturity: "mvp",
    summary: "TUI/tmux launcher using documented Shellbook CLI behavior.",
  },
  {
    id: "codex-wrapper-enhancements",
    name: "Codex Wrapper Enhancements",
    command: "wrap",
    maturity: "mvp",
    summary: "Opt-in agent command wrapper that captures metadata, not raw output.",
  },
];

export function buildPlan(): CommandResult {
  return {
    ok: true,
    title: "Shellbook Lab plan",
    summary: `${modules.length} modules are mapped to CLI commands.`,
    data: { modules },
  };
}

