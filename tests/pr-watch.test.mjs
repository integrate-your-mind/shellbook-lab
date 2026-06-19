import assert from "node:assert/strict";
import test from "node:test";
import { prWatch } from "../dist/lib/pr-watch.js";

test("prWatch degrades cleanly outside a git repository", async () => {
  const result = await prWatch({ repo: "/tmp", timeoutMs: 1000 });

  assert.equal(result.ok, false);
  assert.match(result.summary, /not inside a git repository/);
});
