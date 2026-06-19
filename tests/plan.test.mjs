import assert from "node:assert/strict";
import test from "node:test";
import { buildPlan, modules } from "../dist/lib/plan.js";

test("plan maps all ten extension ideas to commands", () => {
  const result = buildPlan();

  assert.equal(result.ok, true);
  assert.equal(modules.length, 10);
  assert.deepEqual(
    modules.map((module) => module.command),
    ["dashboard", "bot", "pr-watch", "handoff", "presence", "statusline", "privacy audit", "analytics", "bridge", "wrap"],
  );
});

