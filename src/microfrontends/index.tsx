"use client";

import { Activity, Bot, ClipboardCheck, GitPullRequest, Handshake, Radio, ScanSearch, Terminal, Users, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { modules } from "@/src/lib/plan";
import type { DashboardSnapshot, HandoffPayload, PresencePayload, PrivacyAuditPayload } from "@/src/services/dashboard-service";

export interface FeaturePanelProps {
  panel: FeaturePanel;
  snapshot: DashboardSnapshot | null;
  audit: PrivacyAuditPayload | null;
  handoff: HandoffPayload | null;
  presence: PresencePayload | null;
  loading: Record<string, boolean>;
  actions: {
    refreshSnapshot: () => Promise<void>;
    runPrivacyAudit: () => Promise<void>;
    previewHandoff: () => Promise<void>;
    markPresence: () => Promise<void>;
    copyCommand: (command: string) => Promise<void>;
  };
}

export interface FeatureAction {
  label: string;
  key: keyof FeaturePanelProps["actions"];
  command?: string;
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
    actions: [{ label: "Refresh", key: "refreshSnapshot" }],
    render: (props) => <AgentOpsPanel {...props} />,
  },
  "room-dm-bots": {
    icon: Bot,
    actions: [{ label: "Copy dry-run", key: "copyCommand" }],
    render: (props) => <CommandPanel {...props} title="Room and DM bots" />,
  },
  "pr-ci-watcher": {
    icon: GitPullRequest,
    actions: [{ label: "Refresh PR", key: "refreshSnapshot" }],
    render: (props) => <PrPanel {...props} />,
  },
  "handoff-cards": {
    icon: Handshake,
    actions: [{ label: "Generate preview", key: "previewHandoff" }],
    render: (props) => <HandoffPanel {...props} />,
  },
  "team-presence": {
    icon: Users,
    actions: [{ label: "Mark available", key: "markPresence" }],
    render: (props) => <PresencePanel {...props} />,
  },
  "statusline-plugin": {
    icon: Radio,
    actions: [{ label: "Copy command", key: "copyCommand" }],
    render: (props) => <CommandPanel {...props} title="Statusline plugin" />,
  },
  "privacy-auditor": {
    icon: ScanSearch,
    actions: [{ label: "Run local audit", key: "runPrivacyAudit" }],
    render: (props) => <PrivacyPanel {...props} />,
  },
  "personal-analytics": {
    icon: ClipboardCheck,
    actions: [{ label: "Refresh metrics", key: "refreshSnapshot" }],
    render: (props) => <AnalyticsPanel {...props} />,
  },
  "shellbook-bridge": {
    icon: Waypoints,
    actions: [{ label: "Copy bridge", key: "copyCommand" }],
    render: (props) => <CommandPanel {...props} title="Shellbook bridge" />,
  },
  "codex-wrapper-enhancements": {
    icon: Terminal,
    actions: [{ label: "Copy wrapper", key: "copyCommand" }],
    render: (props) => <CommandPanel {...props} title="Codex wrapper" />,
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
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Live health</CardTitle>
          <CardDescription>{snapshot?.health.summary ?? "Waiting for snapshot."}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(snapshot?.metrics ?? []).map((metric) => (
            <div key={metric.label} className="rounded-md border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">{metric.label}</div>
              <div className="mt-1 flex items-center justify-between gap-2 text-lg font-semibold">
                <span>{metric.value}</span>
                <Badge variant={metric.tone === "ok" ? "ok" : metric.tone === "warn" ? "warn" : "secondary"}>
                  {metric.tone}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <FeedCard snapshot={snapshot} />
    </div>
  );
}

function PrPanel({ snapshot }: FeaturePanelProps) {
  const pr = snapshot?.pr as { branch?: string; dirtyFiles?: number; upstream?: string | null; pr?: { title?: string; url?: string } } | undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle>PR state</CardTitle>
        <CardDescription>Local git is checked first; GitHub PR data is optional.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <Fact label="Branch" value={pr?.branch ?? "unknown"} />
        <Fact label="Dirty files" value={String(pr?.dirtyFiles ?? 0)} />
        <Fact label="Upstream" value={pr?.upstream ?? "not set"} />
      </CardContent>
    </Card>
  );
}

function HandoffPanel(props: FeaturePanelProps) {
  const { handoff, loading } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Handoff preview</CardTitle>
        <CardDescription>{handoff?.result.summary ?? "Generate a JSON preview before writing a handoff card."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button disabled={loading.handoff} onClick={() => runFeatureAction(props.panel.actions[0], props)}>
          {loading.handoff ? "Generating..." : "Generate preview"}
        </Button>
        <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify(handoff?.result.data ?? { status: "not generated" }, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

function PresencePanel(props: FeaturePanelProps) {
  const { presence, loading } = props;
  const data = presence?.result.data as { agent?: string; status?: string; repoName?: string; updatedAt?: string } | null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Presence</CardTitle>
        <CardDescription>{presence?.result.summary ?? "Presence is local state, not private Shellbook data."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button disabled={loading.presence} onClick={() => runFeatureAction(props.panel.actions[0], props)}>
          {loading.presence ? "Writing..." : "Mark available"}
        </Button>
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Agent" value={data?.agent ?? "codex"} />
          <Fact label="Status" value={data?.status ?? "unknown"} />
          <Fact label="Repo" value={data?.repoName ?? "shellbook-lab"} />
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacyPanel(props: FeaturePanelProps) {
  const { audit, loading } = props;
  const findings = (audit?.result.data?.findings ?? []) as Array<{ file: string; type: string; detail: string }>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy audit</CardTitle>
        <CardDescription>{audit?.result.summary ?? "Run a local publish blocker scan."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button disabled={loading.privacy} onClick={() => runFeatureAction(props.panel.actions[0], props)}>
          {loading.privacy ? "Scanning..." : "Run local audit"}
        </Button>
        <div className="space-y-2">
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No findings loaded.</p>
          ) : (
            findings.slice(0, 6).map((finding) => (
              <div key={`${finding.file}-${finding.type}`} className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium">{finding.type}</div>
                <div className="text-muted-foreground">{finding.file}</div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel({ snapshot }: FeaturePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics</CardTitle>
        <CardDescription>{snapshot?.analytics.summary ?? "No analytics loaded."}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Fact label="Runs" value={String(snapshot?.analytics.data?.totalRuns ?? 0)} />
        <Fact label="Failed" value={String(snapshot?.analytics.data?.failedRuns ?? 0)} />
        <Fact label="Duration" value={`${Math.round((snapshot?.analytics.data?.totalDurationMs ?? 0) / 1000)}s`} />
      </CardContent>
    </Card>
  );
}

function CommandPanel(props: FeaturePanelProps & { title: string }) {
  const { title, snapshot, actions, panel } = props;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{snapshot ? "Command is ready to copy." : "Waiting for dashboard snapshot."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <code className="block overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">{panel.command}</code>
        <Button variant="secondary" onClick={() => actions.copyCommand(panel.command)}>
          Copy command
        </Button>
      </CardContent>
    </Card>
  );
}

export function runFeatureAction(action: FeatureAction, props: FeaturePanelProps) {
  if (action.key === "copyCommand") {
    return props.actions.copyCommand(action.command ?? props.panel.command);
  }
  return props.actions[action.key]();
}

function FeedCard({ snapshot }: { snapshot: DashboardSnapshot | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity feed</CardTitle>
        <CardDescription>Recent wrapper events.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(snapshot?.feed ?? []).map((item) => (
          <div key={`${item.time}-${item.text}`} className="rounded-md border border-border p-3 text-sm">
            <div className="text-xs text-muted-foreground">{item.time}</div>
            <div>{item.text}</div>
          </div>
        ))}
      </CardContent>
    </Card>
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
