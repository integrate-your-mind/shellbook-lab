import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { openBridge } from "../dist/lib/bridge.js";
import { tempDir, withEnv, writeExecutable } from "./helpers.mjs";

test("bridge creates a missing tmux session and respects create-only summary", async () => {
  const binDir = await tempDir("bridge-bin");
  const log = join(binDir, "tmux.log");
  await writeExecutable(
    binDir,
    "tmux",
    `#!/bin/sh
echo "$@" >> "${log}"
if [ "$1" = "has-session" ]; then
  exit 1
fi
exit 0
`,
  );

  const result = await withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () =>
    openBridge({ session: "lab-test", attach: false, createOnly: true, shellbookBin: "shellbook" }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.title, "bridge created");
  assert.equal(result.data.created, true);
  assert.match(result.summary, /session lab-test is ready/);
  assert.match(await readFile(log, "utf8"), /new-session -d -s lab-test shellbook tui/);
});

test("bridge reuses an existing session and attaches when requested", async () => {
  const binDir = await tempDir("bridge-existing-bin");
  const log = join(binDir, "tmux.log");
  await writeExecutable(
    binDir,
    "tmux",
    `#!/bin/sh
echo "$@" >> "${log}"
exit 0
`,
  );

  const result = await withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () =>
    openBridge({ session: "lab-existing", attach: true, createOnly: false, shellbookBin: "shellbook" }),
  );

  const calls = await readFile(log, "utf8");
  assert.equal(result.ok, true);
  assert.equal(result.title, "bridge ready");
  assert.equal(result.data.created, false);
  assert.match(calls, /has-session -t lab-existing/);
  assert.match(calls, /attach-session -t lab-existing/);
});
