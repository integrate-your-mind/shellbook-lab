import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import { eventPath } from "../dist/lib/events.js";
import { buildOpsState, missionsFromEvents, replayFromEvents } from "../dist/lib/ops.js";
import { renderTui } from "../dist/lib/tui.js";
import { tempDir, withEnv, writeExecutable } from "./helpers.mjs";

function event(overrides = {}) {
  return {
    id: overrides.id ?? "evt-1",
    label: overrides.label ?? "codex",
    command: overrides.command ?? "node",
    args: overrides.args ?? ["--version"],
    repo: overrides.repo ?? "/tmp/shellbook-lab",
    repoName: overrides.repoName ?? "shellbook-lab",
    startedAt: overrides.startedAt ?? new Date(0).toISOString(),
    endedAt: overrides.endedAt ?? new Date(3000).toISOString(),
    durationMs: overrides.durationMs ?? 3000,
    exitCode: overrides.exitCode ?? 0,
  };
}

test("ops derives mission state and replay frames from wrapped events", () => {
  const failed = event({ id: "evt-1", label: "codex", exitCode: 2, endedAt: new Date(1000).toISOString() });
  const passed = event({ id: "evt-2", label: "claude", exitCode: 0, endedAt: new Date(2000).toISOString(), durationMs: 1200 });
  const presence = { ok: true, title: "presence", summary: "ok", data: { agent: "codex", status: "available", repoName: "shellbook-lab" } };

  const missions = missionsFromEvents([failed, passed], presence, "/tmp/shellbook-lab", new Date(3000));
  const replay = replayFromEvents([failed, passed], 2);

  assert.deepEqual(missions.map((mission) => mission.status).sort(), ["ok", "review"]);
  assert.equal(replay[0].id, "evt-2");
  assert.equal(replay[1].status, "failed");
  assert.match(replay[1].nextAction, /Inspect failure/);
});

test("ops falls back to presence when no replay events exist", () => {
  const presence = { ok: true, title: "presence", summary: "ok", data: { agent: "codex", status: "available", repoName: "shellbook-lab" } };
  const missions = missionsFromEvents([], presence, "/tmp/shellbook-lab");

  assert.equal(missions.length, 1);
  assert.equal(missions[0].status, "idle");
  assert.equal(missions[0].lastRunAge, "none");
  assert.match(missions[0].nextAction, /wrap/);
});

test("ops redacts replay command secrets, bounds replay limits, and marks stale missions", () => {
  const now = new Date("2026-06-19T12:00:00.000Z");
  const secretPrefix = `s${"k"}-`;
  const secret = `${secretPrefix}1234567890abcdefghijklmnop`;
  const oldPassed = event({
    id: "evt-secret",
    args: ["--api-key", secret, `OPENAI_API_KEY=${secretPrefix}abcdef1234567890`, "Bearer", "github_pat_1234567890abcdef"],
    endedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    exitCode: 0,
  });
  const presence = { ok: true, title: "presence", summary: "ok", data: { agent: "codex", status: "available", repoName: "shellbook-lab" } };

  const missions = missionsFromEvents([oldPassed], presence, "/tmp/shellbook-lab", now);
  const replay = replayFromEvents([oldPassed], 0);

  assert.equal(missions[0].status, "stale");
  assert.equal(missions[0].lastRunAge, "2d ago");
  assert.match(missions[0].nextAction, /Rerun proof/);
  assert.equal(replay.length, 1);
  assert.doesNotMatch(replay[0].command, new RegExp(secret));
  assert.doesNotMatch(replay[0].command, new RegExp(`OPENAI_API_KEY=${secretPrefix}`));
  assert.match(replay[0].command, /--api-key \[redacted\]/);
  assert.match(replay[0].command, /OPENAI_API_KEY=\[redacted\]/);
});

test("ops state and TUI render mission control with local command shims", async () => {
  const stateDir = await tempDir("ops-state");
  const binDir = await tempDir("ops-bin");
  await writeFile(eventPath(stateDir), `${JSON.stringify(event({ id: "evt-ops", exitCode: 1, durationMs: 4500 }))}\n`);
  const shellbook = await writeExecutable(
    binDir,
    "shellbook",
    `#!/bin/sh
if [ "$1" = "version" ]; then
  echo "shellbook 1.0.0"
  exit 0
fi
if [ "$1" = "setup" ] && [ "$2" = "check" ]; then
  echo "identity: ok @bunny"
  exit 0
fi
if [ "$1" = "statusline" ]; then
  echo "Shellbook @bunny"
  exit 0
fi
exit 64
`,
  );
  await writeExecutable(binDir, "tmux", `#!/bin/sh\necho "tmux 3.5"\n`);
  await writeExecutable(binDir, "git", `#!/bin/sh\necho "git ok"\n`);

  const result = await withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () =>
    buildOpsState({ stateDir, shellbookBin: shellbook, repo: process.cwd(), limit: 4 }),
  );
  const screen = renderTui(result.data, { view: "all", color: false, width: 84 });

  assert.equal(result.ok, true);
  assert.equal(result.data.handle, "@bunny");
  assert.match(screen, /Shellbook Labs TUI/);
  assert.match(screen, /Mission Control/);
  assert.match(screen, /Run Replay Timeline/);
  assert.doesNotMatch(screen, /\u001b\[/);
});
