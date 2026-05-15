"use client";

import { ALL_WORKBENCH_DEV_STORAGE_KEYS } from "@/app/dev/workbench/workbench-session";
import { WORKBENCH_SESSION_SNAPSHOTS_KEY } from "@/app/dev/workbench/workbench-snapshot-storage";

export const DEV_TOOL_STORAGE_KEYS = [
  ...ALL_WORKBENCH_DEV_STORAGE_KEYS,
  WORKBENCH_SESSION_SNAPSHOTS_KEY,
];

export function clearDevToolStorage(keys: readonly string[]): void {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore private-mode/quota errors */
    }
  }
}

export function confirmAndClearAllDevToolStorage(): boolean {
  if (typeof window === "undefined") return false;
  const ok = window.confirm(
    "Total reset will clear all dev setup work: colors, typography, style, workbench session + snapshots, and all saved element defaults in this browser. Neutral dev baselines will load on next open. This cannot be undone. Continue?"
  );
  if (!ok) return false;
  clearDevToolStorage(DEV_TOOL_STORAGE_KEYS);
  return true;
}
