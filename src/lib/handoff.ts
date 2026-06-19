import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CommandResult } from "./types.js";

export interface HandoffOptions {
  title: string;
  summary: string;
  status: string;
  output?: string;
  format: string;
  stateDir: string;
}

export async function buildHandoff(options: HandoffOptions): Promise<CommandResult> {
  const card = {
    title: options.title,
    status: options.status,
    summary: options.summary || "No summary provided.",
    createdAt: new Date().toISOString(),
    checks: ["privacy audit before publish", "tests/lint/build before PR", "Shellbook sends are opt-in"],
  };

  if (options.format === "json") {
    return { ok: true, title: "handoff json", summary: card.summary, data: card };
  }

  const markdown = [
    `# ${card.title}`,
    "",
    `Status: ${card.status}`,
    `Created: ${card.createdAt}`,
    "",
    "## Summary",
    "",
    card.summary,
    "",
    "## Required Checks",
    "",
    ...card.checks.map((check) => `- ${check}`),
    "",
  ].join("\n");
  const output = options.output ?? join(options.stateDir, "handoffs", `${slug(card.title)}.md`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, markdown, { mode: 0o600 });

  return {
    ok: true,
    title: "handoff written",
    summary: `Wrote handoff card to ${output}`,
    data: { output, markdown },
  };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "handoff";
}

