import assert from "node:assert/strict";
import test from "node:test";
import { doctor } from "../dist/lib/doctor.js";
import { tempDir, withEnv, writeExecutable } from "./helpers.mjs";

test("doctor reports ready with parsed Shellbook identity", async () => {
  const binDir = await tempDir("doctor-bin");
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
exit 64
`,
  );
  await writeExecutable(binDir, "tmux", `#!/bin/sh\necho "tmux 3.5"\n`);
  await writeExecutable(binDir, "git", `#!/bin/sh\necho "git version 2.50.0"\n`);

  const result = await withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () => doctor({ shellbookBin: shellbook }));

  assert.equal(result.ok, true);
  assert.equal(result.data.identity, "@bunny");
  assert.match(result.summary, /@bunny/);
  assert.equal(result.data.checks.every((check) => check.ok), true);
});

test("doctor reports prerequisite failure and keeps missing identity null", async () => {
  const binDir = await tempDir("doctor-failure-bin");
  const shellbook = await writeExecutable(
    binDir,
    "shellbook",
    `#!/bin/sh
if [ "$1" = "version" ]; then
  echo "shellbook 1.0.0"
  exit 0
fi
if [ "$1" = "setup" ] && [ "$2" = "check" ]; then
  echo "identity: missing"
  exit 42
fi
exit 64
`,
  );
  await writeExecutable(binDir, "tmux", `#!/bin/sh\necho "tmux missing" >&2\nexit 127\n`);
  await writeExecutable(binDir, "git", `#!/bin/sh\necho "git version 2.50.0"\n`);

  const result = await withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () => doctor({ shellbookBin: shellbook }));

  assert.equal(result.ok, false);
  assert.equal(result.data.identity, null);
  assert.match(result.summary, /prerequisites/);
  assert.equal(result.data.checks.some((check) => check.name === "tmux" && !check.ok), true);
});
