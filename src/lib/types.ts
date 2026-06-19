export interface CommandResult {
  ok: boolean;
  title: string;
  summary: string;
  data?: any;
}

export interface ModulePlan {
  id: string;
  name: string;
  command: string;
  maturity: "mvp" | "deferred" | "experimental";
  summary: string;
}

export interface RunEvent {
  id: string;
  label: string;
  command: string;
  args: string[];
  repo: string;
  repoName: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number;
}
