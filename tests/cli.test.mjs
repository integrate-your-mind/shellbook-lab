import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { eventPath } from "../dist/lib/events.js";
import { tempDir, writeExecutable } from "./helpers.mjs";

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
  assert.match(help.stdout, /tui/);
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

test("cli renders the Shellbook Labs TUI from wrapped events", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-cli-tui-"));
  const binDir = await tempDir("cli-tui-bin");
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
  await writeFile(
    eventPath(stateDir),
    `${JSON.stringify({
      id: "evt-cli-tui",
      label: "codex",
      command: "node",
      args: ["--version"],
      repo: process.cwd(),
      repoName: "shellbook-lab",
      startedAt: new Date(0).toISOString(),
      endedAt: new Date(1000).toISOString(),
      durationMs: 1000,
      exitCode: 0,
    })}\n`,
  );

  const { stdout } = await runCli(
    ["--state-dir", stateDir, "--shellbook-bin", shellbook, "tui", "--no-color", "--width", "80"],
    { env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` } },
  );

  assert.match(stdout, /Shellbook Labs TUI/);
  assert.match(stdout, /Mission Control/);
  assert.match(stdout, /Run Replay Timeline/);
  assert.match(stdout, /node --version/);
});

test("cli rejects invalid ops flags and reports degraded replay status", async () => {
  const stateDir = await mkdtemp(join(tmpdir(), "shellbook-lab-cli-ops-failure-"));
  const invalidLimit = await runCliError(["--state-dir", stateDir, "replay", "--limit", "0"]);
  const invalidView = await runCliError(["--state-dir", stateDir, "--shellbook-bin", "missing-shellbook-bin", "tui", "--view", "nonsense", "--no-color"]);
  const replay = await runCliError(["--state-dir", stateDir, "--shellbook-bin", "missing-shellbook-bin", "--json", "replay"]);

  assert.equal(invalidLimit.code, 1);
  assert.match(invalidLimit.stderr, /--limit must be at least 1/);
  assert.equal(invalidView.code, 2);
  assert.match(invalidView.stdout, /Unknown view/);
  assert.equal(replay.code, 2);
  assert.equal(JSON.parse(replay.stdout).ok, false);
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
