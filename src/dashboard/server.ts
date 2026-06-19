import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildAnalytics, doctor, prWatch, readEvents } from "../lib/index.js";
import { auditPrivacy } from "../lib/privacy.js";
import type { CommandResult } from "../lib/types.js";

export interface DashboardOptions {
  host: string;
  port: number;
  stateDir: string;
  open: boolean;
  shellbookBin: string;
}

export async function startDashboard(options: DashboardOptions): Promise<CommandResult> {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${options.host}:${options.port}`);
      if (url.pathname === "/") {
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end(await readFile(new URL("./client.html", import.meta.url), "utf8"));
        return;
      }
      if (url.pathname === "/styles.css") {
        response.setHeader("content-type", "text/css; charset=utf-8");
        response.end(await readFile(new URL("./styles.css", import.meta.url), "utf8"));
        return;
      }
      if (url.pathname === "/api/snapshot") {
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(await snapshot(options)));
        return;
      }
      if (url.pathname === "/api/privacy") {
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(await auditPrivacy({ paths: [process.cwd()], maxBytes: 500_000 })));
        return;
      }
      response.statusCode = 404;
      response.end("not found");
    } catch (error) {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, resolve);
  });

  const url = `http://${options.host}:${options.port}`;
  return {
    ok: true,
    title: "dashboard started",
    summary: `Shellbook Lab dashboard listening at ${url}`,
    data: { url, stateDir: join(process.cwd(), options.stateDir) },
  };
}

async function snapshot(options: DashboardOptions) {
  const [health, analytics, pr] = await Promise.all([
    doctor({ shellbookBin: options.shellbookBin }),
    buildAnalytics({ stateDir: options.stateDir, shellbookBin: options.shellbookBin }),
    prWatch({ repo: process.cwd(), timeoutMs: 2000 }),
  ]);
  const events = await readEvents(options.stateDir);
  const recent = events.slice(-6).reverse();

  return {
    handle: health.data?.identity ?? "@unknown",
    metrics: [
      { label: "Shellbook", value: health.ok ? "Ready" : "Needs review" },
      { label: "Wrapped runs", value: String(analytics.data?.totalRuns ?? 0) },
      { label: "Failed runs", value: String(analytics.data?.failedRuns ?? 0) },
      { label: "PR state", value: pr.ok ? "Checked" : "Local only" },
    ],
    sessions: recent.length
      ? recent.map((event) => ({
          agent: event.label,
          repo: event.repoName,
          status: event.exitCode === 0 ? "ok" : "review",
          duration: `${Math.round(event.durationMs / 1000)}s`,
        }))
      : [{ agent: "codex", repo: "shellbook-lab", status: "ok", duration: "idle" }],
    pr: pr.data ?? { branch: "unknown", status: pr.summary },
    feed: recent.length
      ? recent.map((event) => ({
          time: new Date(event.endedAt).toLocaleTimeString(),
          text: `${event.label} exited ${event.exitCode} in ${Math.round(event.durationMs / 1000)}s`,
        }))
      : [
          { time: "now", text: "Dashboard ready. Run shellbook-lab wrap to record agent sessions." },
          { time: "now", text: "Room and DM bots stay dry-run until --send is passed." },
        ],
  };
}
