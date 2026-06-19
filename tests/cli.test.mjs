import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("statusline prints exactly one plain line", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-statusline-"));
  const { stdout } = await execFileAsync("node", [
    "dist/cli.js",
    "--state-dir",
    stateDir,
    "--shellbook-bin",
    "missing-shellbook-bin",
    "statusline",
    "--plain",
  ]);

  assert.equal(stdout.trim().split("\n").length, 1);
  assert.match(stdout, /^Shellbook Lab \|/);
});

test("wrap preserves the wrapped command exit code", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-wrap-"));
  const error = await execFileAsync("node", [
    "dist/cli.js",
    "--state-dir",
    stateDir,
    "wrap",
    "node",
    "-e",
    "process.exit(7)",
    "--repo",
    process.cwd(),
  ]).then(
    () => null,
    (caught) => caught,
  );

  assert.ok(error);
  assert.equal(error.code, 7);
  assert.match(error.stdout, /ERR wrapped command/);
});
