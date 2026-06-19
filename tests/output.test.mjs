import assert from "node:assert/strict";
import test from "node:test";
import { formatJson, printResult } from "../dist/lib/output.js";

async function captureStdout(run) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => {
    lines.push(args.join(" "));
  };
  try {
    await run();
  } finally {
    console.log = original;
  }
  return lines.join("\n");
}

test("output formats json and human result prefixes", async () => {
  assert.equal(formatJson({ ok: true }), '{\n  "ok": true\n}');

  const ok = await captureStdout(() => printResult({ ok: true, title: "done", summary: "All set." }, {}));
  const err = await captureStdout(() => printResult({ ok: false, title: "blocked" }, {}));
  const json = await captureStdout(() => printResult({ ok: true, title: "json" }, { json: true }));

  assert.equal(ok, "OK done\nAll set.");
  assert.equal(err, "ERR blocked");
  assert.match(json, /"title": "json"/);
});
