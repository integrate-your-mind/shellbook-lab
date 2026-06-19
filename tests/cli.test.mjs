import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

function runCli(args, options = {}) {
  return execFileAsync("node", ["dist/cli.js", ...args], options);
}

async function runCliError(args, options = {}) {
  return runCli(args, options).then(
    () => null,
    (error) => error,
  );
}

test("cli prints help, version, and json plan", async () => {
  const help = await runCli(["--help"]);
  const version = await runCli(["--version"]);
  const plan = await runCli(["--json", "plan"]);

  assert.match(help.stdout, /Shellbook Lab/);
  assert.match(help.stdout, /privacy audit/);
  assert.equal(version.stdout.trim(), "0.1.0");
  assert.equal(JSON.parse(plan.stdout).data.modules.length, 10);
});

test("cli reports unknown and invalid commands with nonzero exit codes", async () => {
  const unknown = await runCliError(["unknown-command"]);
  const invalidPrivacy = await runCliError(["privacy", "status"]);
  const missingWrap = await runCliError(["wrap"]);
  const missingBotFlag = await runCliError(["bot", "--kind", "room", "--target", "ops"]);

  assert.equal(unknown.code, 2);
  assert.match(unknown.stdout, /Unknown command: unknown-command/);
  assert.equal(invalidPrivacy.code, 3);
  assert.match(invalidPrivacy.stdout, /Use: shellbook-lab privacy audit/);
  assert.equal(missingWrap.code, 2);
  assert.match(missingWrap.stdout, /Use: shellbook-lab wrap/);
  assert.equal(missingBotFlag.code, 1);
  assert.match(missingBotFlag.stderr, /missing required flag/);
});

test("cli writes handoff json and presence snapshots", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-cli-state-"));
  const handoff = await runCli([
    "--state-dir",
    stateDir,
    "--json",
    "handoff",
    "--title",
    "QA Done",
    "--summary",
    "Coverage raised.",
    "--status",
    "done",
    "--format",
    "json",
  ]);
  const presenceWrite = await runCli(["--state-dir", stateDir, "--json", "presence", "--agent", "codex", "--repo", "/tmp/shellbook-lab", "--status", "busy"]);
  const presenceRead = await runCli(["--state-dir", stateDir, "--json", "presence", "--read"]);

  assert.equal(JSON.parse(handoff.stdout).data.title, "QA Done");
  assert.equal(JSON.parse(presenceWrite.stdout).data.status, "busy");
  assert.equal(JSON.parse(presenceRead.stdout).data.status, "busy");
});

test("statusline prints exactly one plain line", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-statusline-"));
  const { stdout } = await runCli([
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
  const error = await runCli([
    "--state-dir",
    stateDir,
    "wrap",
    "node",
    "-e",
    "process.exit(7)",
    "--repo",
    process.cwd(),
  ]).then(() => null, (caught) => caught);

  assert.ok(error);
  assert.equal(error.code, 7);
  assert.match(error.stdout, /ERR wrapped command/);
});
