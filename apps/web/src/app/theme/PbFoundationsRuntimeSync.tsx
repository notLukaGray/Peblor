"use client";

import { useEffect } from "react";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import { subscribeWorkbenchSessionChanges } from "@/core/lib/workbench-session-subscribe";
import { serializePbFoundationsCss } from "@/app/theme/pb-foundation-css";

const STYLE_ELEMENT_ID = "pb-foundations-runtime";

function updateFoundationStyleTag(): void {
  if (typeof document === "undefined") return;
  const styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!(styleEl instanceof HTMLStyleElement)) return;
  const css = serializePbFoundationsCss(getWorkbenchSession());
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
