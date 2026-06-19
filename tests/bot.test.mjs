import assert from "node:assert/strict";
import test from "node:test";
import { postBotMessage } from "../dist/lib/bot.js";

test("bot dry-runs room messages by default", async () => {
  const result = await postBotMessage({
    kind: "room",
    target: "lounge",
    message: "hello shellbook",
    send: false,
    shellbookBin: "shellbook",
  });

  assert.equal(result.ok, true);
  assert.match(result.summary, /Would run/);
  assert.equal(result.data.send, false);
});

test("bot rejects invalid destination kinds", async () => {
  const result = await postBotMessage({
    kind: "email",
    target: "someone",
    message: "hello",
    send: false,
    shellbookBin: "shellbook",
  });

  assert.equal(result.ok, false);
});

