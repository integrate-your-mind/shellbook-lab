import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { buildHandoff } from "../dist/lib/handoff.js";
import { tempDir } from "./helpers.mjs";

test("handoff json returns preview data without writing a file", async () => {
  const stateDir = await tempDir("handoff-json");
  const result = await buildHandoff({
    title: "Dashboard pass",
    summary: "Ready for review.",
    status: "preview",
    format: "json",
    stateDir,
  });

  assert.equal(result.ok, true);
  assert.equal(result.title, "handoff json");
  assert.equal(result.data.title, "Dashboard pass");
  assert.equal(result.data.status, "preview");
  assert.deepEqual(result.data.checks, ["privacy audit before publish", "tests/lint/build before PR", "Shellbook sends are opt-in"]);
});

test("handoff markdown writes the default slug path and fallback summary", async () => {
  const stateDir = await tempDir("handoff-markdown");
  const result = await buildHandoff({
    title: "!!!",
    summary: "",
    status: "needs-review",
    format: "markdown",
    stateDir,
  });

  const expectedOutput = join(stateDir, "handoffs", "handoff.md");
  const content = await readFile(expectedOutput, "utf8");
  const mode = (await stat(expectedOutput)).mode & 0o777;

  assert.equal(result.ok, true);
  assert.equal(result.data.output, expectedOutput);
  assert.match(content, /^# !!!/);
  assert.match(content, /No summary provided\./);
  assert.equal(mode, 0o600);
});

test("handoff markdown honors custom output path", async () => {
  const stateDir = await tempDir("handoff-output");
  const output = join(stateDir, "custom", "launch.md");
  const result = await buildHandoff({
    title: "Launch Shellbook Lab",
    summary: "Ship it after QA.",
    status: "done",
    output,
    format: "markdown",
    stateDir,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.output, output);
  assert.match(await readFile(output, "utf8"), /Ship it after QA\./);
});
