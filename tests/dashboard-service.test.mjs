import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import { dashboardSnapshot, handoffPreview, privacyAudit, readPresenceSnapshot, writePresenceSnapshot } from "../dist/services/dashboard-service.js";
import { eventPath } from "../dist/lib/events.js";
import { tempDir } from "./helpers.mjs";

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
  assert.equal(snapshot.health.ok, false);
  assert.equal(snapshot.presence.ok, true);
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
