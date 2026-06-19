import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const roots = ["app", "components", "src", "tests", "scripts"];
const issues = [];

for (const root of roots) {
  await walk(root);
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(issue);
  }
  process.exit(1);
}

console.log("lint ok");

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "dist", "coverage"].includes(entry.name)) {
        await walk(full);
      }
      continue;
    }
    if (!/\.(ts|js|mjs|css|html|md)$/.test(entry.name)) {
      continue;
    }
    await lintFile(full);
  }
}

async function lintFile(path) {
  const text = await readFile(path, "utf8");
  if (!text.endsWith("\n")) {
    issues.push(`${path}: missing trailing newline`);
  }
  text.split("\n").forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      issues.push(`${path}:${index + 1}: trailing whitespace`);
    }
    if (line.length > 160) {
      issues.push(`${path}:${index + 1}: line exceeds 160 characters`);
    }
  });
}
