"use client";

import { useEffect } from "react";
import { subscribeWorkbenchSessionChanges } from "@/core/lib/workbench-session-subscribe";
import { buildWorkbenchThemeColorVarMap } from "@/app/theme/pb-workbench-color-var-map";
import type { ColorToolPersistedLike } from "@/app/theme/pb-workbench-color-var-map";

const STYLE_ELEMENT_ID = "pb-colors-runtime";
const WORKBENCH_SESSION_STORAGE_KEY = "workbench-session-v2";

function readWorkbenchColors(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(WORKBENCH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const colors = parsed["colors"];
    if (!colors || typeof colors !== "object" || Array.isArray(colors)) return null;
    return colors as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildColorCss(): string {
  const colors = readWorkbenchColors();
  if (!colors) return "";
  // Dev-only: the colors object structure matches ColorToolPersistedLike written by apps/studio.
  const colorData = colors as unknown as ColorToolPersistedLike;
  const lightVars = buildWorkbenchThemeColorVarMap(colorData, "light");
  const darkVars = buildWorkbenchThemeColorVarMap(colorData, "dark");

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
  const css = buildColorCss();
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
