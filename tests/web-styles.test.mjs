import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

test("Next build emits Tailwind utilities for the dashboard", async () => {
  const globals = await readFile("app/globals.css", "utf8");
  const cssFiles = (await readdir(".next/static/css")).filter((file) => file.endsWith(".css"));
  const css = (await Promise.all(cssFiles.map((file) => readFile(join(".next/static/css", file), "utf8")))).join("\n");

  assert.match(globals, /source\(none\)/);
  assert.match(globals, /@source "\.\.\/src"/);
  assert.match(css, /\.bg-background/);
  assert.match(css, /\.text-foreground/);
  assert.match(css, /\.min-h-screen/);
  assert.match(css, /\.lg\\:grid-cols-\\\[260px_1fr\\\]/);
});
