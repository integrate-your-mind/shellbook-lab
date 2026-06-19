"use client";

import {
  Activity,
  Bot,
  ClipboardCheck,
  GitPullRequest,
  Handshake,
  Radio,
  ScanSearch,
  Terminal,
  Users,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { modules } from "@/src/lib/plan";
import type {
  DashboardActionId,
  DashboardActionPayload,
  DashboardSnapshot,
  HandoffPayload,
  PresencePayload,
  PrivacyAuditPayload,
} from "@/src/services/dashboard-service";

export interface FeaturePanelProps {
  panel: FeaturePanel;
  snapshot: DashboardSnapshot | null;
  audit: PrivacyAuditPayload | null;
  handoff: HandoffPayload | null;
  presence: PresencePayload | null;
  actionResult: DashboardActionPayload | null;
  loading: Record<FeatureLoadingKey, boolean>;
  actions: {
    refreshSnapshot: () => Promise<void>;
    runPrivacyAudit: () => Promise<void>;
    previewHandoff: () => Promise<void>;
    markPresence: () => Promise<void>;
    runDashboardAction: (action: DashboardActionId) => Promise<void>;
  };
}

export type FeatureLoadingKey = "snapshot" | "privacy" | "handoff" | "presence" | "action";

export interface FeatureAction {
  label: string;
  key: keyof FeaturePanelProps["actions"];
  loadingKey: FeatureLoadingKey;
  actionId?: DashboardActionId;
}

export interface FeaturePanel {
  id: string;
  name: string;
  command: string;
  summary: string;
  icon: LucideIcon;
  actions: FeatureAction[];
  render: (props: FeaturePanelProps) => React.ReactNode;
}

const panelExtras = {
  "agent-ops-dashboard": {
    icon: Activity,
    actions: [{ label: "Refresh", key: "refreshSnapshot", loadingKey: "snapshot" }],
    render: (props) => <AgentOpsPanel {...props} />,
  },
  "room-dm-bots": {
    icon: Bot,
    actions: [
      {
        label: "Run dry-run",
        key: "runDashboardAction",
        loadingKey: "action",
        actionId: "bot-dry-run",
      },
    ],
    render: (props) => <BotPanel {...props} />,
  },
  "pr-ci-watcher": {
    icon: GitPullRequest,
    actions: [{ label: "Refresh PR", key: "refreshSnapshot", loadingKey: "snapshot" }],
    render: (props) => <PrPanel {...props} />,
  },
  "handoff-cards": {
    icon: Handshake,
    actions: [{ label: "Generate preview", key: "previewHandoff", loadingKey: "handoff" }],
    render: (props) => <HandoffPanel {...props} />,
  },
  "team-presence": {
    icon: Users,
    actions: [{ label: "Mark available", key: "markPresence", loadingKey: "presence" }],
    render: (props) => <PresencePanel {...props} />,
  },
  "statusline-plugin": {
    icon: Radio,
    actions: [
      {
        label: "Preview statusline",
        key: "runDashboardAction",
        loadingKey: "action",
        actionId: "statusline-preview",
      },
    ],
    render: (props) => <StatuslinePanel {...props} />,
  },
  "privacy-auditor": {
    icon: ScanSearch,
    actions: [{ label: "Run local audit", key: "runPrivacyAudit", loadingKey: "privacy" }],
    render: (props) => <PrivacyPanel {...props} />,
  },
  "personal-analytics": {
    icon: ClipboardCheck,
    actions: [{ label: "Refresh metrics", key: "refreshSnapshot", loadingKey: "snapshot" }],
    render: (props) => <AnalyticsPanel {...props} />,
  },
  "shellbook-bridge": {
    icon: Waypoints,
    actions: [
      {
        label: "Create bridge",
        key: "runDashboardAction",
        loadingKey: "action",
        actionId: "bridge-create",
      },
    ],
    render: (props) => <BridgePanel {...props} />,
  },
  "codex-wrapper-enhancements": {
    icon: Terminal,
    actions: [
      {
        label: "Run smoke wrap",
        key: "runDashboardAction",
        loadingKey: "action",
        actionId: "wrap-smoke",
      },
    ],
    render: (props) => <WrapPanel {...props} />,
  },
} satisfies Record<string, Omit<FeaturePanel, "id" | "name" | "command" | "summary">>;

type PanelId = keyof typeof panelExtras;

export const featurePanels: FeaturePanel[] = modules.map((module) => {
  const extra = panelExtras[module.id as PanelId];
  if (!extra) {
    throw new Error(`Missing feature panel extras for ${module.id}`);
  }
  return {
    id: module.id,
    name: module.name,
    command: `shellbook-lab ${module.command}`,
    summary: module.summary,
    ...extra,
  };
});

function AgentOpsPanel({ snapshot }: FeaturePanelProps) {
  return (
    <div className="grid gap-4">
      <MetricGrid snapshot={snapshot} />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <MissionControlCard snapshot={snapshot} />
        <FeedCard snapshot={snapshot} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ReplayTimelineCard snapshot={snapshot} />
        <SessionTableCard snapshot={snapshot} />
      </div>
    </div>
  );
}

function MetricGrid({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  const metrics = snapshot?.metrics ?? [];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">{metric.label}</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-2xl font-semibold">{metric.value}</span>
              <Badge variant={metric.tone === "ok" ? "ok" : metric.tone === "warn" ? "warn" : "secondary"}>
                {metric.tone}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MissionControlCard({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  const missions = snapshot?.missions ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mission Control</CardTitle>
        <CardDescription>Active agent state derived from wrapped runs and local presence.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {missions.length === 0 ? (
          <EmptyState text="No mission state loaded. Run the wrapper smoke action or wrap a real command." />
        ) : (
          missions.map((mission) => (
            <div key={`${mission.agent}-${mission.repo}`} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{mission.agent}</div>
                  <div className="truncate text-xs text-muted-foreground">{mission.repo}</div>
                </div>
                <Badge variant={mission.status === "review" || mission.status === "stale" ? "warn" : "ok"}>
                  {mission.status}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <span>last run {mission.lastRunAge}</span>
                <span>duration {mission.duration}</span>
                <span>exit {mission.exitCode ?? "none"}</span>
              </div>
              <p className="mt-2 text-sm">{mission.nextAction}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ReplayTimelineCard({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  const replay = snapshot?.replay ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Run Replay Timeline</CardTitle>
        <CardDescription>Recent wrapped commands with outcome and next action.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {replay.length === 0 ? (
          <EmptyState text="No replay frames yet. Run the wrapper smoke action to prove capture works." />
        ) : (
          replay.map((frame) => (
            <div key={frame.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{frame.command}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {frame.label} in {frame.repo} after {frame.duration}
                  </div>
                </div>
                <Badge variant={frame.status === "ok" ? "ok" : "warn"}>{frame.status}</Badge>
              </div>
              <p className="mt-2 text-sm">{frame.nextAction}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SessionTableCard({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  const sessions = snapshot?.sessions ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>What the dashboard can prove from local state right now.</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState text="No session rows are available yet." />
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Agent</th>
                  <th className="py-2 pr-3 font-medium">Repo</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={`${session.agent}-${session.repo}-${session.duration}`} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3 font-medium">{session.agent}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{session.repo}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={session.status === "review" ? "warn" : "ok"}>{session.status}</Badge>
                    </td>
                    <td className="py-2">{session.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BotPanel(props: FeaturePanelProps) {
  const result = resultForAction(props, "bot-dry-run");
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Room / DM dry-run</CardTitle>
          <CardDescription>No message is sent from the dashboard. The action returns the exact CLI intent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Fact label="Mode" value="dry-run" />
          <Fact label="Target" value="shellbook-lab" />
          <Fact label="External send" value="disabled" />
        </CardContent>
      </Card>
      <ActionResultCard result={result} empty="Run the dry-run to see the post payload before any real send." />
    </div>
  );
}

function PrPanel({ snapshot }: FeaturePanelProps) {
  const pr = snapshot?.pr as PrData | undefined;
  const linkedPr = pr?.pr;
  return (
    <Card>
      <CardHeader>
        <CardTitle>PR state</CardTitle>
        <CardDescription>{linkedPr ? "GitHub PR metadata is linked." : "Local git is checked; no current PR is linked."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Fact label="Branch" value={pr?.branch ?? "unknown"} />
          <Fact label="Dirty files" value={String(pr?.dirtyFiles ?? 0)} />
          <Fact label="Upstream" value={pr?.upstream ?? "not set"} />
        </div>
        {linkedPr ? (
          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <div className="font-semibold">{linkedPr.title ?? "Untitled PR"}</div>
            {linkedPr.url ? (
              <a className="mt-1 block break-all text-primary" href={linkedPr.url} rel="noreferrer" target="_blank">
                {linkedPr.url}
              </a>
            ) : null}
          </div>
        ) : (
          <EmptyState text="No open PR is associated with this branch. The dashboard is showing local branch health only." />
        )}
      </CardContent>
    </Card>
  );
}

function HandoffPanel({ handoff }: FeaturePanelProps) {
  const data = objectData(handoff?.result.data);
  const checks = arrayOfStrings(data?.checks);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Handoff preview</CardTitle>
        <CardDescription>{handoff?.result.summary ?? "Generate a preview before writing or sending a handoff."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Fact label="Title" value={stringValue(data?.title, "Not generated")} />
          <Fact label="Status" value={stringValue(data?.status, "Not generated")} />
          <Fact label="Created" value={formatDate(stringValue(data?.createdAt, ""))} />
        </div>
        {checks.length > 0 ? (
          <div className="rounded-md border border-border bg-background p-3">
            <div className="text-sm font-semibold">Review gates</div>
            <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
              {checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState text="No handoff preview has been generated in this browser session." />
        )}
        <details className="rounded-md border border-border bg-background p-3 text-sm">
          <summary className="cursor-pointer font-medium">Raw JSON</summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-foreground p-4 text-xs text-background">
            {JSON.stringify(handoff?.result.data ?? { status: "not generated" }, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

function PresencePanel({ presence, snapshot }: FeaturePanelProps) {
  const data = objectData(presence?.result.data ?? snapshot?.presence.data);
  const updatedAt = stringValue(data?.updatedAt, "");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Local presence</CardTitle>
        <CardDescription>{presence?.result.summary ?? snapshot?.presence.summary ?? "Presence is local state."}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-4">
        <Fact label="Agent" value={stringValue(data?.agent, "codex")} />
        <Fact label="Status" value={stringValue(data?.status, "unknown")} />
        <Fact label="Repo" value={stringValue(data?.repoName, "shellbook-lab")} />
        <Fact label="Updated" value={formatDate(updatedAt)} />
      </CardContent>
    </Card>
  );
}

function StatuslinePanel(props: FeaturePanelProps) {
  const result = resultForAction(props, "statusline-preview");
  const line = stringValue(objectData(result?.result.data)?.line ?? result?.result.summary, "Run preview to build a line.");
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Statusline preview</CardTitle>
          <CardDescription>Builds the actual line from local analytics and presence.</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block overflow-auto rounded-md bg-foreground p-4 text-sm text-background">{line}</code>
        </CardContent>
      </Card>
      <ActionResultCard result={result} empty="Preview the statusline to verify the prompt text before shell integration." />
    </div>
  );
}

function PrivacyPanel({ audit }: FeaturePanelProps) {
  const findings = (audit?.result.data?.findings ?? []) as Array<{ file: string; type: string; detail: string }>;
  const scannedFiles = Number(audit?.result.data?.scannedFiles ?? 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy audit</CardTitle>
        <CardDescription>{audit?.result.summary ?? "Run a local publish blocker scan."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Files scanned" value={audit ? String(scannedFiles) : "Not run"} />
          <Fact label="Findings" value={audit ? String(findings.length) : "Not run"} />
          <Fact label="Publish gate" value={audit?.result.ok ? "Ready" : audit ? "Blocked" : "Unknown"} />
        </div>
        {audit && findings.length === 0 ? (
          <EmptyState text="Audit ran and found no local blockers in the scanned files." />
        ) : findings.length > 0 ? (
          <div className="flex flex-col gap-2">
            {findings.slice(0, 6).map((finding) => (
              <div key={`${finding.file}-${finding.type}`} className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium">{finding.type}</div>
                <div className="break-all text-muted-foreground">{finding.file}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Audit has not run in this browser session yet." />
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel({ snapshot }: FeaturePanelProps) {
  const analytics = snapshot?.analytics;
  const totalRuns = Number(analytics?.data?.totalRuns ?? 0);
  const failedRuns = Number(analytics?.data?.failedRuns ?? 0);
  const totalDurationMs = Number(analytics?.data?.totalDurationMs ?? 0);
  const failureRate = totalRuns > 0 ? Math.round((failedRuns / totalRuns) * 100) : 0;
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Fact label="Runs" value={String(totalRuns)} />
        <Fact label="Failed" value={String(failedRuns)} />
        <Fact label="Failure rate" value={`${failureRate}%`} />
        <Fact label="Duration" value={`${Math.round(totalDurationMs / 1000)}s`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Run trend</CardTitle>
          <CardDescription>{analytics?.summary ?? "No analytics loaded."}</CardDescription>
        </CardHeader>
        <CardContent>
          <RunTrend replay={snapshot?.replay ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function BridgePanel(props: FeaturePanelProps) {
  const result = resultForAction(props, "bridge-create");
  const data = objectData(result?.result.data);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Tmux bridge</CardTitle>
          <CardDescription>Create-only mode prepares Shellbook chat without stealing the terminal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Fact label="Session" value={stringValue(data?.session, "shellbook-chat")} />
          <Fact label="Created now" value={data?.created === true ? "yes" : data ? "no" : "not checked"} />
          <Fact label="Attach" value="tmux attach -t shellbook-chat" />
        </CardContent>
      </Card>
      <ActionResultCard result={result} empty="Create the bridge to prove tmux and Shellbook TUI are reachable." />
    </div>
  );
}

function WrapPanel(props: FeaturePanelProps) {
  const result = resultForAction(props, "wrap-smoke");
  const latest = props.snapshot?.replay?.[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Wrapper smoke proof</CardTitle>
          <CardDescription>Runs a local Node smoke command through the wrapper and records replay metadata.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Fact label="Latest label" value={latest?.label ?? "none"} />
          <Fact label="Latest status" value={latest?.status ?? "none"} />
          <Fact label="Latest duration" value={latest?.duration ?? "0s"} />
        </CardContent>
      </Card>
      <ActionResultCard result={result} empty="Run smoke wrap to create a real replay event and refresh analytics." />
    </div>
  );
}

function ActionResultCard({ result, empty }: { result: DashboardActionPayload | null; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action result</CardTitle>
        <CardDescription>{result?.result.summary ?? empty}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {result ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Fact label="Action" value={result.action} />
              <Fact label="Side effect" value={result.sideEffect} />
              <Fact label="Generated" value={formatDate(result.generatedAt)} />
            </div>
            <code className="block overflow-auto rounded-md bg-foreground p-4 text-xs text-background">{result.command}</code>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-sm font-semibold">Next steps</div>
              <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                {result.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <EmptyState text={empty} />
        )}
      </CardContent>
    </Card>
  );
}

export function runFeatureAction(action: FeatureAction, props: FeaturePanelProps) {
  switch (action.key) {
    case "refreshSnapshot":
      return props.actions.refreshSnapshot();
    case "runPrivacyAudit":
      return props.actions.runPrivacyAudit();
    case "previewHandoff":
      return props.actions.previewHandoff();
    case "markPresence":
      return props.actions.markPresence();
    case "runDashboardAction":
      if (!action.actionId) {
        throw new Error(`Missing dashboard action id for ${props.panel.id}`);
      }
      return props.actions.runDashboardAction(action.actionId);
  }
}

function FeedCard({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  const feed = snapshot?.feed ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity feed</CardTitle>
        <CardDescription>Recent wrapper events and local dashboard cues.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {feed.length === 0 ? (
          <EmptyState text="No activity yet." />
        ) : (
          feed.map((item) => (
            <div key={`${item.time}-${item.text}`} className="rounded-md border border-border p-3 text-sm">
              <div className="text-xs text-muted-foreground">{item.time}</div>
              <div>{item.text}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RunTrend({ replay }: { replay: Array<{ id: string; status: string; duration: string; label: string }> }) {
  if (replay.length === 0) {
    return <EmptyState text="No trend yet. Run the wrapper smoke action to draw the first point." />;
  }

  const ordered = [...replay].reverse();
  const values = ordered.map((frame) => Math.max(1, durationMs(frame.duration)));
  const max = Math.max(...values);
  const points = values.map((value, index) => {
    const x = ordered.length === 1 ? 50 : (index / (ordered.length - 1)) * 100;
    const y = 90 - (value / max) * 70;
    return `${x},${y}`;
  });

  return (
    <div className="flex flex-col gap-4">
      <svg aria-label="Recent run duration trend" className="h-48 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polyline fill="none" points={points.join(" ")} stroke="hsl(var(--primary))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {ordered.map((frame, index) => {
          const [x, y] = points[index].split(",").map(Number);
          return (
            <circle
              key={frame.id}
              cx={x}
              cy={y}
              fill={frame.status === "ok" ? "hsl(160 60% 39%)" : "hsl(37 90% 55%)"}
              r="2.6"
            />
          );
        })}
      </svg>
      <div className="grid gap-2 sm:grid-cols-4">
        {ordered.slice(-4).map((frame) => (
          <div key={frame.id} className="rounded-md border border-border bg-background p-3 text-xs">
            <div className="truncate font-medium">{frame.label}</div>
            <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground">
              <span>{frame.duration}</span>
              <Badge variant={frame.status === "ok" ? "ok" : "warn"}>{frame.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border bg-background p-3 text-sm text-muted-foreground">{text}</p>;
}

function resultForAction(props: FeaturePanelProps, action: DashboardActionId): DashboardActionPayload | null {
  return props.actionResult?.action === action ? props.actionResult : null;
}

function objectData(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatDate(value: string): string {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function durationMs(value: string): number {
  if (value.endsWith("ms")) {
    return Number(value.slice(0, -2)) || 1;
  }
  if (value.endsWith("s")) {
    return (Number(value.slice(0, -1)) || 1) * 1000;
  }
  return 1;
}

interface PrData {
  branch?: string;
  dirtyFiles?: number;
  upstream?: string | null;
  pr?: {
    title?: string;
    url?: string;
  } | null;
}
