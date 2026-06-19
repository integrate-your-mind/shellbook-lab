import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildPresence } from "../dist/lib/presence.js";

test("presence writes and reads local snapshots", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-presence-"));
  const write = await buildPresence({
    stateDir,
    agent: "codex",
    repo: "/tmp/example-repo",
    status: "busy",
    read: false,
  });
  const read = await buildPresence({
    stateDir,
    agent: "codex",
    repo: "/tmp/example-repo",
    status: "available",
    read: true,
  });

  assert.equal(write.ok, true);
  assert.equal(read.data.agent, "codex");
  assert.equal(read.data.repoName, "example-repo");
  assert.equal(read.data.status, "busy");
});

