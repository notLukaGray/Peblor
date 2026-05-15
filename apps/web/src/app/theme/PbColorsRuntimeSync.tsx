"use client";

import { useEffect } from "react";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import { subscribeWorkbenchSessionChanges } from "@/core/lib/workbench-session-subscribe";
import { buildWorkbenchThemeColorVarMap } from "@/app/theme/pb-workbench-color-var-map";

const STYLE_ELEMENT_ID = "pb-colors-runtime";

function buildColorCss(session: ReturnType<typeof getWorkbenchSession>): string {
  const colors = session.colors;
  const lightVars = buildWorkbenchThemeColorVarMap(colors, "light");
  const darkVars = buildWorkbenchThemeColorVarMap(colors, "dark");

  const rootLines = Object.keys(lightVars)
    .sort()
    .map((id) => `  ${id}: ${lightVars[id]};`)
    .join("\n");
  const darkLines = Object.keys(darkVars)
    .sort()
    .map((id) => `  ${id}: ${darkVars[id]};`)
    .join("\n");

  return `:root {\n${rootLines}\n}\n\n.dark {\n${darkLines}\n}`;
}

function ensureStyleTag(): HTMLStyleElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const el = document.createElement("style");
  el.id = STYLE_ELEMENT_ID;
  document.head.appendChild(el);
  return el;
}

function updateColorStyleTag(): void {
  const el = ensureStyleTag();
  if (!el) return;
  const css = buildColorCss(getWorkbenchSession());
  if (el.textContent !== css) el.textContent = css;
}

/**
 * Dev-only: syncs M1 brand + derived color CSS vars (`:root` / `.dark`) from the
 * workbench color session whenever it changes. This makes color tool changes
 * visible everywhere in `/dev` without a build step.
 */
export function PbColorsRuntimeSync(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    updateColorStyleTag();
    return subscribeWorkbenchSessionChanges(updateColorStyleTag);
  }, []);

  return null;
}
