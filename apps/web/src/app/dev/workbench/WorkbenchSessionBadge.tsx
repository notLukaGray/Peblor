"use client";

import { useSyncExternalStore } from "react";
import {
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, cb);
  };
}

function getSnapshot(): boolean {
  try {
    return !!localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * Badge indicating whether the current workbench preview is seeded from a live
 * session or from compiled defaults. Shown in route headers to give authors
 * immediate trust signal on first load.
 */
export function WorkbenchSessionBadge({ className }: { className?: string }) {
  const hasSession = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <span
      title={
        hasSession
          ? "Preview values are seeded from your live workbench session stored in this browser."
          : "No saved session found — previews are using compiled defaults."
      }
      className={
        "inline-flex cursor-default items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide " +
        (hasSession
          ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
          : "border-zinc-500/40 bg-zinc-500/10 text-zinc-400") +
        (className ? " " + className : "")
      }
    >
      {hasSession ? "Session · live" : "Session · defaults"}
    </span>
  );
}
