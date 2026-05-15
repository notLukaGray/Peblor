import type { Metadata } from "next";
import {
  DEV_NEUTRAL_FONT_CONFIGS,
  DEV_NEUTRAL_TYPE_SCALE,
} from "@/app/dev/fonts/font-tool-baseline";
import { FontDevClient } from "./index";

export const metadata: Metadata = {
  title: "Fonts & type scale (dev)",
  robots: { index: false, follow: false },
};

// Don't cache — always reflect current config on reload.
export const dynamic = "force-dynamic";

export type BunnyFontMeta = {
  /** Display name, e.g. "Inter" */
  name: string;
  weights: number[];
  styles: string[];
  variable?: boolean;
  /** Font category from Bunny catalog, e.g. "sans-serif", "serif", "monospace", "display", "handwriting" */
  category?: string;
};

/** Raw shape returned by https://fonts.bunny.net/list */
type BunnyListEntryRaw = {
  familyName?: string;
  weights?: number[];
  styles?: string[];
  isVariable?: boolean;
  category?: string;
};

function normalizeBunnyEntry(entry: unknown): BunnyFontMeta | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as BunnyListEntryRaw;
  if (typeof e.familyName !== "string" || !e.familyName.length) return null;
  return {
    name: e.familyName,
    weights: Array.isArray(e.weights) ? e.weights : [],
    styles: Array.isArray(e.styles) ? e.styles : [],
    variable: e.isVariable,
    category: typeof e.category === "string" ? e.category : undefined,
  };
}

function normalizeBunnyFontList(raw: Record<string, unknown>): Record<string, BunnyFontMeta> {
  const out: Record<string, BunnyFontMeta> = {};
  for (const [slug, v] of Object.entries(raw)) {
    const parsed = normalizeBunnyEntry(v);
    if (!parsed) continue;
    out[slug] = parsed;
  }
  return out;
}

async function fetchBunnyFontList(): Promise<Record<string, BunnyFontMeta>> {
  try {
    const res = await fetch("https://fonts.bunny.net/list", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    const raw = (await res.json()) as Record<string, unknown>;
    return normalizeBunnyFontList(raw);
  } catch {
    return {};
  }
}

export default async function FontDevPage() {
  const fontList = await fetchBunnyFontList();

  return (
    <FontDevClient
      fontList={fontList}
      initialConfigs={{
        primary: DEV_NEUTRAL_FONT_CONFIGS.primary,
        secondary: DEV_NEUTRAL_FONT_CONFIGS.secondary,
        mono: DEV_NEUTRAL_FONT_CONFIGS.mono,
      }}
      initialTypeScale={DEV_NEUTRAL_TYPE_SCALE}
    />
  );
}
