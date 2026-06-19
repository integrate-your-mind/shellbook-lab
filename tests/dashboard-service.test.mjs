import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  dashboardAction,
  dashboardActionIds,
  dashboardSnapshot,
  handoffPreview,
  parsePresenceStatusRequest,
  privacyAudit,
  readPresenceSnapshot,
  validateDashboardActionRequest,
  writePresenceSnapshot,
} from "../dist/services/dashboard-service.js";
import { eventPath, readEvents } from "../dist/lib/events.js";
import { tempDir, withEnv } from "./helpers.mjs";

function event(overrides = {}) {
  return {
    id: "evt-1",
    label: "codex",
    command: "node",
    args: ["--version"],
    repo: "/tmp/shellbook-lab",
    repoName: "shellbook-lab",
    startedAt: new Date(0).toISOString(),
    endedAt: new Date(3000).toISOString(),
    durationMs: 3000,
    exitCode: 1,
    ...overrides,
  };
}

test("dashboard snapshot degrades failed tools into rendered dashboard data", async () => {
  const stateDir = await tempDir("dashboard-service");
  const repo = await tempDir("dashboard-repo");
  await writeFile(eventPath(stateDir), `${JSON.stringify(event())}\n`);

  const snapshot = await dashboardSnapshot({ stateDir, repo, shellbookBin: "missing-shellbook-bin" });

  assert.equal(snapshot.handle, "@unknown");
  assert.equal(snapshot.modules.length, 10);
  assert.equal(snapshot.metrics.find((metric) => metric.label === "Failed runs").value, "1");
  assert.equal(snapshot.metrics.find((metric) => metric.label === "Failed runs").tone, "warn");
  assert.equal(snapshot.sessions[0].status, "review");
  assert.match(snapshot.feed[0].text, /exited 1/);
  assert.equal(snapshot.missions.length, 1);
  assert.equal(snapshot.missions[0].status, "review");
  assert.equal(snapshot.replay.length, 1);
  assert.equal(snapshot.replay[0].status, "failed");
  assert.equal(snapshot.health.ok, false);
  assert.equal(snapshot.presence.ok, true);
});

test("dashboard snapshot exposes redacted mission control and replay payloads", async () => {
  const stateDir = await tempDir("dashboard-service-ops");
  const repo = await tempDir("dashboard-ops-repo");
  const fakeKey = `s${"k"}-1234567890abcdefghijklmnop`;
  await writeFile(
    eventPath(stateDir),
    `${JSON.stringify(event({ id: "evt-secret", args: ["--token", fakeKey], exitCode: 0 }))}\n`,
  );

  const snapshot = await dashboardSnapshot({ stateDir, repo, shellbookBin: "missing-shellbook-bin" });

  assert.equal(snapshot.missions[0].repo, "shellbook-lab");
  assert.match(snapshot.replay[0].command, /--token \[redacted\]/);
  assert.doesNotMatch(snapshot.replay[0].command, new RegExp(fakeKey));
});

test("dashboard service exposes handoff, privacy, and presence API payloads", async () => {
  const stateDir = await tempDir("dashboard-service-actions");
  const repo = await tempDir("dashboard-service-repo");
  await writeFile(`${repo}/README.md`, "# clean\n");

  const handoff = await handoffPreview({ stateDir, repo, shellbookBin: "missing-shellbook-bin" });
  const privacy = await privacyAudit({ stateDir, repo, shellbookBin: "missing-shellbook-bin" });
  const written = await writePresenceSnapshot("reviewing", { stateDir, repo, shellbookBin: "missing-shellbook-bin" });
  const read = await readPresenceSnapshot({ stateDir, repo, shellbookBin: "missing-shellbook-bin" });

  assert.equal(handoff.result.ok, true);
  assert.match(handoff.result.summary, /Preview generated/);
  assert.equal(privacy.result.ok, true);
  assert.equal(written.result.data.status, "reviewing");
  assert.equal(read.result.data.status, "reviewing");
});

test("dashboard actions run real service-backed work instead of copy-only placeholders", async () => {
  const stateDir = await tempDir("dashboard-actions");
  const repo = await tempDir("dashboard-actions-repo");
  const options = { stateDir, repo, shellbookBin: "missing-shellbook-bin" };

  const bot = await dashboardAction("bot-dry-run", options);
  const statusline = await dashboardAction("statusline-preview", options);

  assert.equal(bot.sideEffect, "none");
  assert.equal(bot.result.ok, true);
  assert.equal(bot.result.data.send, false);
  assert.match(bot.result.summary, /Would run/);
  assert.equal(statusline.sideEffect, "none");
  assert.equal(statusline.result.ok, true);
  assert.match(statusline.result.summary, /Shellbook Lab/);
});

test("local-only dashboard actions require confirmation and write replay data when confirmed", async () => {
  const stateDir = await tempDir("dashboard-wrap-action");
  const repo = await tempDir("dashboard-wrap-repo");
  const options = { stateDir, repo, shellbookBin: "missing-shellbook-bin" };

  const denied = await dashboardAction("wrap-smoke", options);
  assert.equal(denied.result.ok, false);
  assert.equal((await readEvents(stateDir)).length, 0);

  const first = await dashboardAction("wrap-smoke", options, { confirmLocalOnly: true });
  const second = await dashboardAction("wrap-smoke", options, { confirmLocalOnly: true });
  const events = await readEvents(stateDir);
  const snapshot = await dashboardSnapshot(options);

  assert.equal(first.result.ok, true);
  assert.equal(second.result.ok, true);
  assert.equal(events.length, 2);
  assert.notEqual(events[0].id, events[1].id);
  assert.equal(snapshot.replay[0].label, "dashboard-smoke");
  assert.match(snapshot.replay[0].command, /process\.stdout\.write/);
});

test("dashboard action validation blocks unknown and unconfirmed local actions", () => {
  assert.deepEqual(validateDashboardActionRequest({ action: "bot-dry-run" }), {
    ok: true,
    action: "bot-dry-run",
    confirmLocalOnly: false,
  });

  const missing = validateDashboardActionRequest({ action: "bridge-create" });
  const unknown = validateDashboardActionRequest({ action: "nope" });

  assert.equal(missing.ok, false);
  assert.equal(missing.status, 409);
  assert.equal(unknown.ok, false);
  assert.equal(unknown.status, 400);
});

test("bridge action failures are returned as JSON-safe command results", async () => {
  const stateDir = await tempDir("dashboard-bridge-action");
  const repo = await tempDir("dashboard-bridge-repo");
  const binDir = await tempDir("dashboard-empty-path");
  const result = await withEnv({ PATH: binDir }, () =>
    dashboardAction("bridge-create", { stateDir, repo, shellbookBin: "shellbook" }, { confirmLocalOnly: true }),
  );

  assert.equal(result.action, "bridge-create");
  assert.equal(result.sideEffect, "local-only");
  assert.equal(result.result.ok, false);
  assert.match(result.result.summary, /ENOENT|tmux/);
});

test("presence write validation rejects malformed or unsupported statuses", () => {
  assert.deepEqual(parsePresenceStatusRequest({ status: "available" }), { ok: true, status: "available" });

  const missing = parsePresenceStatusRequest({});
  const unsupported = parsePresenceStatusRequest({ status: "away" });

  assert.equal(missing.ok, false);
  assert.equal(missing.statusCode, 400);
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.statusCode, 400);
});

test("microfrontend registry has no copy-only action gaps", async () => {
  const source = await readFile("src/microfrontends/index.tsx", "utf8");

  assert.doesNotMatch(source, /copyCommand/);
  assert.doesNotMatch(source, /Copy dry-run/);
  for (const actionId of dashboardActionIds) {
    assert.match(source, new RegExp(actionId));
  }
});
