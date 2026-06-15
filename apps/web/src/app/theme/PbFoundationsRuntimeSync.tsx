"use client";

import { useEffect } from "react";
import { subscribeWorkbenchSessionChanges } from "@/core/lib/workbench-session-subscribe";
import { serializePbFoundationsCss } from "@/app/theme/pb-foundation-css";
import type { FoundationSession } from "@/app/theme/pb-foundation-css";

const STYLE_ELEMENT_ID = "pb-foundations-runtime";
const WORKBENCH_SESSION_STORAGE_KEY = "workbench-session-v2";

function readWorkbenchSession(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function updateFoundationStyleTag(): void {
  if (typeof document === "undefined") return;
  const styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!(styleEl instanceof HTMLStyleElement)) return;
  const session = readWorkbenchSession();
  if (!session) return;
  // Dev-only: session structure matches FoundationSession written by apps/studio.
  const css = serializePbFoundationsCss(session as unknown as FoundationSession);
  if (styleEl.textContent !== css) styleEl.textContent = css;
}

export function PbFoundationsRuntimeSync(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    updateFoundationStyleTag();
    return subscribeWorkbenchSessionChanges(updateFoundationStyleTag);
  }, []);

  return null;
}
