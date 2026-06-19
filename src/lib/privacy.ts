import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { CommandResult } from "./types.js";

const suspiciousNames = new Set(["config.json", "social.db", "identity.json", ".env", ".env.local"]);
const authWords = [
  ["access", "token"],
  ["refresh", "token"],
  ["supabase", "anon", "key"],
  ["supabase", "user", "id"],
].map((parts) => parts.join("_"));
const transcriptWords = [
  ["BEGIN", "PROMPT"].join(" "),
  ["BEGIN", "TRANSCRIPT"].join(" "),
  ["assistant", "response:"].join(" "),
  ["terminal", "output:"].join(" "),
];
const secretPatterns = [
  { name: "OpenAI/API key", pattern: /\b(sk-[A-Za-z0-9_-]{20,}|gho_[A-Za-z0-9_]{20,}|hch-[A-Za-z0-9_-]{20,})\b/ },
  { name: "Shellbook auth", pattern: new RegExp(`\\b(${authWords.join("|")})\\b`, "i") },
  { name: "Private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Transcript marker", pattern: new RegExp(transcriptWords.join("|"), "i") },
];

export async function auditPrivacy(options: { paths: string[]; maxBytes: number }): Promise<CommandResult> {
  const files = await collectFiles(options.paths);
  const findings = [];

  for (const file of files) {
    const info = await stat(file);
    const name = basename(file);
    if (name === "social.db" || file.includes(".shellbook/")) {
      findings.push({ file, type: "shellbook-sensitive-file", detail: "Do not publish Shellbook local data." });
      continue;
    }
    if (suspiciousNames.has(name)) {
      findings.push({ file, type: "suspicious-name", detail: `${name} often contains secrets or local state.` });
    }
    if (info.size > options.maxBytes) {
      continue;
    }
    const content = await readFile(file, "utf8").catch(() => "");
    for (const check of secretPatterns) {
      if (check.pattern.test(content)) {
        findings.push({ file, type: check.name, detail: "Potential sensitive content matched." });
      }
    }
  }

  return {
    ok: findings.length === 0,
    title: "privacy audit",
    summary: findings.length === 0 ? `No blockers found in ${files.length} files.` : `${findings.length} blocker(s) found.`,
    data: { scannedFiles: files.length, findings },
  };
}

async function collectFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    await collect(path, out);
  }
  return out;
}

async function collect(path: string, out: string[]): Promise<void> {
  const info = await stat(path).catch(() => null);
  if (!info) {
    return;
  }
  if (info.isFile()) {
    out.push(path);
    return;
  }
  if (!info.isDirectory()) {
    return;
  }
  const name = basename(path);
  if (["node_modules", ".git", "dist", "coverage"].includes(name)) {
    return;
  }
  const entries = await readdir(path);
  for (const entry of entries) {
    await collect(join(path, entry), out);
  }
}
