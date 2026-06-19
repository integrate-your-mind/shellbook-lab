import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { auditPrivacy } from "../dist/lib/privacy.js";

test("privacy audit passes clean project", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shellbook-lab-clean-"));
  await writeFile(join(dir, "README.md"), "# clean\n");

  const result = await auditPrivacy({ paths: [dir], maxBytes: 1000 });

  assert.equal(result.ok, true);
  assert.equal(result.data.findings.length, 0);
});

test("privacy audit blocks Shellbook config and token-looking content", async () => {
  const dir = await mkdtemp(join(tmpdir(), "shellbook-lab-dirty-"));
  const authKey = ["access", "token"].join("_");
  const tokenPrefix = ["sk", "proj"].join("-");
  await writeFile(join(dir, "config.json"), JSON.stringify({ [authKey]: "secret" }));
  await writeFile(join(dir, "log.txt"), `token ${tokenPrefix}_abcdefghijklmnopqrstuvwxyz`);

  const result = await auditPrivacy({ paths: [dir], maxBytes: 1000 });

  assert.equal(result.ok, false);
  assert.equal(result.data.findings.length >= 2, true);
});
