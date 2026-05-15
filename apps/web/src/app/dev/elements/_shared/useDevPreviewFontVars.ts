"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import {
  getWorkbenchSession,
  WORKBENCH_SESSION_CHANGED_EVENT,
} from "@/app/dev/workbench/workbench-session";
import { DEV_NEUTRAL_FONT_CONFIGS } from "@/app/dev/fonts/font-tool-baseline";
import { buildBunnyFontUrl } from "@/app/fonts/webfont";

type SlotName = "primary" | "secondary" | "mono";

type SlotConfig = {
  family: string;
  weights: Record<string, number | undefined>;
  italic: boolean;
  source: "local" | "webfont";
};

function readSessionConfigs(): Record<SlotName, SlotConfig> {
  try {
    const session = getWorkbenchSession();
    return session.fonts.configs as Record<SlotName, SlotConfig>;
  } catch {
    return {
      primary: DEV_NEUTRAL_FONT_CONFIGS.primary,
      secondary: DEV_NEUTRAL_FONT_CONFIGS.secondary,
      mono: DEV_NEUTRAL_FONT_CONFIGS.mono,
    };
  }
}

function injectFontLink(url: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-dev-preview-font="${CSS.escape(url)}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.setAttribute("data-dev-preview-font", url);
  document.head.appendChild(link);
}

function loadWebfonts(configs: Record<SlotName, SlotConfig>): void {
  for (const slot of ["primary", "secondary", "mono"] as SlotName[]) {
    const c = configs[slot];
    if (!c || c.source !== "webfont") continue;
    try {
      const url = buildBunnyFontUrl(
        c.family,
        c.weights as Parameters<typeof buildBunnyFontUrl>[1],
        c.italic
      );
      injectFontLink(url);
    } catch {
      /* skip on url-build error */
    }
  }
}

function buildVars(configs: Record<SlotName, SlotConfig>): CSSProperties {
  const primary = `'${configs.primary.family}', sans-serif`;
  const secondary = `'${configs.secondary.family}', serif`;
  const mono = `'${configs.mono.family}', monospace`;
  return {
    // Raw slot vars
    ["--font-primary" as string]: primary,
    ["--font-secondary" as string]: secondary,
    ["--font-mono-face" as string]: mono,
    // Semantic vars — must be set explicitly here because the browser computes
    // these at :root (resolving their var() references against :root's --font-primary)
    // and then inherits the already-resolved values, so overriding --font-primary
    // alone on this wrapper does not retroactively update them.
    ["--font-sans" as string]: primary,
    ["--font-serif" as string]: secondary,
    ["--font-mono" as string]: mono,
    ["--font-heading" as string]: primary,
    ["--font-body" as string]: primary,
    ["--font-accent" as string]: secondary,
  };
}

// Stable neutral defaults — used for SSR and as the hydration-safe initial value.
const NEUTRAL_DEFAULTS: Record<SlotName, SlotConfig> = {
  primary: DEV_NEUTRAL_FONT_CONFIGS.primary,
  secondary: DEV_NEUTRAL_FONT_CONFIGS.secondary,
  mono: DEV_NEUTRAL_FONT_CONFIGS.mono,
};
const NEUTRAL_VARS = buildVars(NEUTRAL_DEFAULTS);

/**
 * Reads the workbench session font configs and returns CSS custom properties
 * for `--font-primary`, `--font-secondary`, and `--font-mono-face`.
 *
 * Apply the returned object as an inline `style` on the preview container so
 * that typography classes (`typography-heading-*`, `typography-body-*`) resolve
 * to the foundation typefaces rather than the production committed fonts.
 *
 * Side-effect: injects Bunny Fonts `<link>` tags for any webfont slots.
 */
function subscribeToFontChanges(callback: () => void): () => void {
  window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedVars: CSSProperties = NEUTRAL_VARS;

function getVarsSnapshot(): CSSProperties {
  const configs = readSessionConfigs();
  loadWebfonts(configs);
  const next = buildVars(configs);
  // useSyncExternalStore requires a stable reference when the value hasn't changed.
  const isEqual =
    (cachedVars as Record<string, string>)["--font-primary"] ===
      (next as Record<string, string>)["--font-primary"] &&
    (cachedVars as Record<string, string>)["--font-secondary"] ===
      (next as Record<string, string>)["--font-secondary"] &&
    (cachedVars as Record<string, string>)["--font-mono-face"] ===
      (next as Record<string, string>)["--font-mono-face"];
  if (!isEqual) cachedVars = next;
  return cachedVars;
}

export function useDevPreviewFontVars(): CSSProperties {
  return useSyncExternalStore(subscribeToFontChanges, getVarsSnapshot, () => NEUTRAL_VARS);
}
