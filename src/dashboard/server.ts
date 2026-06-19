import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CommandResult } from "../lib/types.js";

export interface DashboardOptions {
  host: string;
  port: number;
  stateDir: string;
  open: boolean;
  shellbookBin: string;
}

export async function startDashboard(options: DashboardOptions): Promise<CommandResult> {
  const url = `http://${options.host}:${options.port}`;
  const hasBuild = existsSync(join(process.cwd(), ".next", "BUILD_ID"));
  const script = hasBuild ? "start:web" : "dev:web";
  const child = spawn("npm", ["run", script, "--", "--hostname", options.host, "--port", String(options.port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SHELLBOOK_LAB_STATE_DIR: options.stateDir,
      SHELLBOOK_BIN: options.shellbookBin,
    },
    stdio: "inherit",
  });

  child.once("error", (error) => {
    console.error(`dashboard failed to start: ${error.message}`);
    process.exitCode = 1;
  });

  const shutdown = (signal: NodeJS.Signals) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  child.once("close", (code) => {
    process.exitCode = code ?? 0;
  });

  if (options.open) {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  }

  console.log(`OK dashboard started`);
  console.log(`Shellbook Lab Next dashboard listening at ${url} (${hasBuild ? "production" : "development"})`);

  return new Promise<CommandResult>((resolve) => {
    child.once("close", (code) => {
      resolve({
        ok: code === 0 || code === null,
        title: "dashboard stopped",
        summary: `Shellbook Lab dashboard exited with code ${code ?? 0}.`,
        data: {
          url,
          stateDir: join(process.cwd(), options.stateDir),
          stack: ["Next.js", "Effect", "Zustand", "shadcn/ui"],
        },
      });
    });
  });
}
