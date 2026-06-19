import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { startDashboard } from "../dist/dashboard/server.js";
import { tempDir, withCwd, withEnv, writeExecutable } from "./helpers.mjs";

async function withFakeNpm(exitCode, run) {
  const binDir = await tempDir("dashboard-bin");
  const argsLog = join(binDir, "npm.args");
  const envLog = join(binDir, "npm.env");
  await writeExecutable(
    binDir,
    "npm",
    `#!/bin/sh
printf '%s\\n' "$*" > "${argsLog}"
printf '%s\\n%s\\n' "$SHELLBOOK_LAB_STATE_DIR" "$SHELLBOOK_BIN" > "${envLog}"
exit ${exitCode}
`,
  );

  return withEnv({ PATH: `${binDir}:${process.env.PATH}` }, () => run({ argsLog, envLog }));
}

test("dashboard server chooses production start when a Next build exists", async () => {
  const cwd = await tempDir("dashboard-prod");
  await mkdir(join(cwd, ".next"), { recursive: true });
  await writeFile(join(cwd, ".next", "BUILD_ID"), "build-id");
  const previousExitCode = process.exitCode;

  try {
    await withCwd(cwd, () =>
      withFakeNpm(0, async ({ argsLog, envLog }) => {
        const result = await startDashboard({
          host: "127.0.0.1",
          port: 9876,
          stateDir: "state",
          open: false,
          shellbookBin: "fake-shellbook",
        });

        assert.equal(result.ok, true);
        assert.equal(result.data.url, "http://127.0.0.1:9876");
        assert.deepEqual(result.data.stack, ["Next.js", "Effect", "Zustand", "shadcn/ui"]);
        assert.match(await readFile(argsLog, "utf8"), /run start:web -- --hostname 127\.0\.0\.1 --port 9876/);
        assert.equal(await readFile(envLog, "utf8"), "state\nfake-shellbook\n");
      }),
    );
  } finally {
    process.exitCode = previousExitCode;
  }
});

test("dashboard server chooses dev start without build and reports child failures", async () => {
  const cwd = await tempDir("dashboard-dev");
  const previousExitCode = process.exitCode;

  try {
    await withCwd(cwd, () =>
      withFakeNpm(9, async ({ argsLog }) => {
        const result = await startDashboard({
          host: "0.0.0.0",
          port: 8791,
          stateDir: ".state",
          open: false,
          shellbookBin: "shellbook",
        });

        assert.equal(result.ok, false);
        assert.match(result.summary, /code 9/);
        assert.match(await readFile(argsLog, "utf8"), /run dev:web -- --hostname 0\.0\.0\.0 --port 8791/);
      }),
    );
  } finally {
    process.exitCode = previousExitCode;
  }
});
