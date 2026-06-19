"use client";

import { create, type StateCreator } from "zustand";
import type {
  DashboardSnapshot,
  HandoffPayload,
  PresencePayload,
  PrivacyAuditPayload,
} from "@/src/services/dashboard-service";

type LoadingKey = "snapshot" | "privacy" | "handoff" | "presence" | "copy";

interface DashboardStore {
  activeView: string;
  snapshot: DashboardSnapshot | null;
  audit: PrivacyAuditPayload | null;
  handoff: HandoffPayload | null;
  presence: PresencePayload | null;
  message: string;
  loading: Record<LoadingKey, boolean>;
  setActiveView: (view: string) => void;
  setInitialSnapshot: (snapshot: DashboardSnapshot | null) => void;
  refreshSnapshot: () => Promise<void>;
  runPrivacyAudit: () => Promise<void>;
  previewHandoff: () => Promise<void>;
  markPresence: () => Promise<void>;
  copyCommand: (command: string) => Promise<void>;
}

type DashboardStoreSet = Parameters<StateCreator<DashboardStore>>[0];

const idle: DashboardStore["loading"] = {
  snapshot: false,
  privacy: false,
  handoff: false,
  presence: false,
  copy: false,
};

const createDashboardStore: StateCreator<DashboardStore> = (set, get) => ({
  activeView: "agent-ops-dashboard",
  snapshot: null,
  audit: null,
  handoff: null,
  presence: null,
  message: "Ready",
  loading: idle,
  setActiveView: (view) => set({ activeView: view }),
  setInitialSnapshot: (snapshot) => {
    if (!get().snapshot) {
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
  copyCommand: async (command) =>
    runAction(set, "copy", async () => {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(command);
          set({ message: `Copied: ${command}` });
          return;
        }
      } catch {
        set({ message: `Copy unavailable; command ready: ${command}` });
        return;
      }
      set({ message: `Copy unavailable; command ready: ${command}` });
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
