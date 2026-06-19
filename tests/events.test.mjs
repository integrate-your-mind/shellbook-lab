import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { eventPath, readEvents } from "../dist/lib/events.js";

test("readEvents keeps valid entries when one JSONL line is corrupt", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-events-"));
  const event = {
    id: "evt-1",
    label: "codex",
    command: "node",
    args: ["--version"],
    repo: process.cwd(),
    repoName: "shellbook-lab",
    startedAt: new Date(0).toISOString(),
    endedAt: new Date(1).toISOString(),
    durationMs: 1,
    exitCode: 0,
  };
  await writeFile(eventPath(stateDir), `${JSON.stringify(event)}\nnot json\n`);

  const events = await readEvents(stateDir);

  assert.equal(events.length, 1);
  assert.equal(events[0].id, "evt-1");
});
