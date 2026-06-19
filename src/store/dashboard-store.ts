"use client";

import { create, type StateCreator } from "zustand";
import type {
  DashboardActionId,
  DashboardActionPayload,
  DashboardSnapshot,
  HandoffPayload,
  PresencePayload,
  PrivacyAuditPayload,
} from "@/src/services/dashboard-service";

type LoadingKey = "snapshot" | "privacy" | "handoff" | "presence" | "action";

interface DashboardStore {
  activeView: string;
  snapshot: DashboardSnapshot | null;
  audit: PrivacyAuditPayload | null;
  handoff: HandoffPayload | null;
  presence: PresencePayload | null;
  actionResult: DashboardActionPayload | null;
  message: string;
  loading: Record<LoadingKey, boolean>;
  setActiveView: (view: string) => void;
  setInitialSnapshot: (snapshot: DashboardSnapshot | null) => void;
  refreshSnapshot: () => Promise<void>;
  runPrivacyAudit: () => Promise<void>;
  previewHandoff: () => Promise<void>;
  markPresence: () => Promise<void>;
  runDashboardAction: (action: DashboardActionId) => Promise<void>;
}

type DashboardStoreSet = Parameters<StateCreator<DashboardStore>>[0];

const idle: DashboardStore["loading"] = {
  snapshot: false,
  privacy: false,
  handoff: false,
  presence: false,
  action: false,
};

const createDashboardStore: StateCreator<DashboardStore> = (set) => ({
  activeView: "agent-ops-dashboard",
  snapshot: null,
  audit: null,
  handoff: null,
  presence: null,
  actionResult: null,
  message: "Ready",
  loading: idle,
  setActiveView: (view) => set({ activeView: view }),
  setInitialSnapshot: (snapshot) => {
    if (snapshot) {
      set({ snapshot });
    }
  },
  refreshSnapshot: async () =>
    runAction(set, "snapshot", async () => {
      const snapshot = await requestJson<DashboardSnapshot>("/api/snapshot");
      set({ snapshot, message: "Snapshot refreshed" });
    }),
  runPrivacyAudit: async () =>
    runAction(set, "privacy", async () => {
      const audit = await requestJson<PrivacyAuditPayload>("/api/privacy");
      set({ audit, message: audit.result.summary });
    }),
  previewHandoff: async () =>
    runAction(set, "handoff", async () => {
      const handoff = await requestJson<HandoffPayload>("/api/handoff-preview");
      set({ handoff, message: handoff.result.summary });
    }),
  markPresence: async () =>
    runAction(set, "presence", async () => {
      const presence = await requestJson<PresencePayload>("/api/presence", {
        method: "POST",
        body: JSON.stringify({ status: "available" }),
      });
      set({ presence, message: presence.result.summary });
    }),
  runDashboardAction: async (action) =>
    runAction(set, "action", async () => {
      const actionResult = await requestJson<DashboardActionPayload>("/api/actions", {
        method: "POST",
        body: JSON.stringify({ action, confirmLocalOnly: true }),
      });
      if (actionResult.action === "wrap-smoke") {
        const snapshot = await requestJson<DashboardSnapshot>("/api/snapshot");
        set({ actionResult, snapshot, message: actionResult.result.summary });
        return;
      }
      set({ actionResult, message: actionResult.result.summary });
    }),
});

export const useDashboardStore = create<DashboardStore>(createDashboardStore);

async function runAction(
  set: DashboardStoreSet,
  key: LoadingKey,
  action: () => Promise<void>,
) {
  set((state) => ({ loading: { ...state.loading, [key]: true }, message: "Working..." }));
  try {
    await action();
  } catch (error) {
    set({ message: error instanceof Error ? error.message : String(error) });
  } finally {
    set((state) => ({ loading: { ...state.loading, [key]: false } }));
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
