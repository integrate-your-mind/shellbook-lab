"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { featurePanels, runFeatureAction } from "@/src/microfrontends";
import { useDashboardStore } from "@/src/store/dashboard-store";
import type { DashboardSnapshot } from "@/src/services/dashboard-service";
import { cn } from "@/src/lib/utils";

export function DashboardApp({ initialSnapshot }: { initialSnapshot: DashboardSnapshot | null }) {
  const {
    activeView,
    snapshot,
    audit,
    handoff,
    presence,
    message,
    loading,
    setActiveView,
    setInitialSnapshot,
    refreshSnapshot,
    runPrivacyAudit,
    previewHandoff,
    markPresence,
    copyCommand,
  } = useDashboardStore();
  const currentSnapshot = snapshot ?? initialSnapshot;
  const activePanel = featurePanels.find((panel) => panel.id === activeView) ?? featurePanels[0];
  const Icon = activePanel.icon;

  useEffect(() => {
    setInitialSnapshot(initialSnapshot);
  }, [initialSnapshot, setInitialSnapshot]);

  const panelProps = {
    panel: activePanel,
    snapshot: currentSnapshot,
    audit,
    handoff,
    presence,
    loading,
    actions: {
      refreshSnapshot,
      runPrivacyAudit,
      previewHandoff,
      markPresence,
      copyCommand,
    },
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={currentSnapshot?.health.ok ? "ok" : "warn"}>{currentSnapshot?.handle ?? "@unknown"}</Badge>
              <span className="text-sm text-muted-foreground">Shellbook Lab</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Agent operations lab</h1>
            <p className="mt-2 max-w-3xl break-words text-sm text-muted-foreground">{activePanel.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => refreshSnapshot()} disabled={loading.snapshot}>
              <RefreshCw className={cn("size-4", loading.snapshot && "animate-spin")} />
              Refresh
            </Button>
            <Badge variant="secondary">{message}</Badge>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[260px_1fr]">
          <nav className="grid min-w-0 content-start gap-2 overflow-hidden border-b border-border pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
            {featurePanels.map((panel) => {
              const PanelIcon = panel.icon;
              const active = panel.id === activePanel.id;
              return (
                <button
                  key={panel.id}
                  className={cn(
                    "flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                  data-view={panel.id}
                  onClick={() => setActiveView(panel.id)}
                  type="button"
                >
                  <PanelIcon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{panel.name}</span>
                    <span className={cn("block truncate text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {panel.command}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <section className="min-w-0 space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{activePanel.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{activePanel.command}</p>
                </div>
              </div>
              <Button onClick={() => runFeatureAction(activePanel.actions[0], panelProps)}>{activePanel.actions[0].label}</Button>
            </div>
            {activePanel.render(panelProps)}
          </section>
        </div>
      </div>
    </main>
  );
}
