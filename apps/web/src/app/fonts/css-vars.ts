import type { FontSlotConfig, FontWeightMap } from "./config";
import type { TypeScaleConfig } from "./type-scale";
import { TYPE_SCALE_VAR_PREFIXES } from "./type-scale";

function definedWeightEntries(weights: FontWeightMap): [string, number][] {
  return (Object.entries(weights) as [string, number | undefined][]).filter(
    (e): e is [string, number] => e[1] !== undefined
  );
}

/**
 * Generates a CSS block (`:root` + `@media` override) that sets:
 *
 * **Font weight vars** — `--font-weight-{name}` from the primary slot's weight
 * map. Consumed by `typography-font-*` and all heading/body classes.
 *
 * **Webfont family vars** — `--font-{primary|secondary|mono}` for slots using
 * `source: "webfont"`. Local slots are handled by next/font/local instead.
 *
 * **Type scale vars** — `--type-{class}-size`, `--type-{class}-lh`,
 * `--type-{class}-ls`, `--type-{class}-fw` (references `--font-weight-*`). Mobile in `:root`, desktop overrides in
 * `@media (min-width: 768px)`. Consumed by the typography classes in globals.css,
 * replacing all hardcoded pixel values.
 *
 * Inject as a `<style>` tag at the top of <head> in layout.tsx.
 */
export function generateFontCssVars(
  primary: FontSlotConfig,
  secondary: FontSlotConfig,
  mono: FontSlotConfig,
  typeScale: TypeScaleConfig
): string {
  const root: string[] = [];
  const desktop: string[] = [];

  // ── Weight vars ──────────────────────────────────────────────────────────
  for (const [name, value] of definedWeightEntries(primary.weights)) {
    root.push(`  --font-weight-${name}: ${value};`);
  }

  // ── Webfont family vars ──────────────────────────────────────────────────
  if (primary.source === "webfont") {
    root.push(`  --font-primary: ${webfontFamilyStack(primary.webfont.family, "sans-serif")};`);
  }
  if (secondary.source === "webfont") {
    root.push(`  --font-secondary: ${webfontFamilyStack(secondary.webfont.family, "serif")};`);
  }
  if (mono.source === "webfont") {
    root.push(`  --font-mono-face: ${webfontFamilyStack(mono.webfont.family, "monospace")};`);
  }

  // ── Type scale vars ──────────────────────────────────────────────────────
  for (const [key, prefix] of Object.entries(TYPE_SCALE_VAR_PREFIXES)) {
    const entry = typeScale[key as keyof TypeScaleConfig];
    root.push(`  ${prefix}-size: ${entry.sizeMobile}px;`);
    root.push(`  ${prefix}-lh: ${entry.lineHeightMobile}px;`);
    root.push(`  ${prefix}-ls: ${entry.letterSpacing};`);
    root.push(`  ${prefix}-fw: var(--font-weight-${entry.fontWeightRole});`);
    desktop.push(`  ${prefix}-size: ${entry.sizeDesktop}px;`);
    desktop.push(`  ${prefix}-lh: ${entry.lineHeightDesktop}px;`);
  }

  const rootBlock = `:root {\n${root.join("\n")}\n}`;
  const desktopBlock =
    desktop.length > 0
      ? `\n@media (min-width: 768px) {\n  :root {\n${desktop.map((l) => "  " + l).join("\n")}\n  }\n}`
      : "";

  return rootBlock + desktopBlock;
}

/** OpenType font metrics — units per em are 1000 for all fonts in use. */
interface FontMetrics {
  family: string;
  xHeight: number;
  ascender: number;
  descender: number;
  lineGap: number;
}

/**
 * Known OpenType metrics for webfonts and their system fallback counterparts.
 *
 * Sources:
 *   Urbanist       — Google Fonts metadata
 *   Vollkorn       — Google Fonts metadata
 *   Intel One Mono — Frere-Jones Type / font source
 *   Arial          — OpenType spec (converted from 2048 UPM to 1000)
 *   Times New Roman — OpenType spec (converted from 2048 UPM to 1000)
 *   Courier New    — OpenType spec (converted from 2048 UPM to 1000)
 */
const WEBFONT_METRICS: Record<string, FontMetrics> = {
  Urbanist: { family: "Urbanist", xHeight: 500, ascender: 935, descender: 265, lineGap: 0 },
  Vollkorn: { family: "Vollkorn", xHeight: 450, ascender: 940, descender: 231, lineGap: 0 },
  "Intel One Mono": {
    family: "Intel One Mono",
    xHeight: 520,
    ascender: 1000,
    descender: 250,
    lineGap: 0,
  },
};

const FALLBACK_METRICS: Record<string, FontMetrics> = {
  Arial: { family: "Arial", xHeight: 519, ascender: 905, descender: 212, lineGap: 34 },
  "Times New Roman": {
    family: "Times New Roman",
    xHeight: 449,
    ascender: 906,
    descender: 211,
    lineGap: 28,
  },
  "Courier New": {
    family: "Courier New",
    xHeight: 420,
    ascender: 860,
    descender: 215,
    lineGap: 34,
  },
};

/** Which system font to use as metric-adjusted fallback per webfont family. */
const FALLBACK_MAP: Record<string, string> = {
  Urbanist: "Arial",
  Vollkorn: "Times New Roman",
  "Intel One Mono": "Courier New",
};

/**
 * Compute `@font-face` override values so the fallback system font matches the
 * webfont's vertical metrics exactly. After size-adjust scales the fallback
 * proportionally to match x-height, ascent-override and descent-override
 * correct the line-height metrics so line boxes don't shift during font swap.
 *
 * Formula:
 *   size-adjust = fallback.xHeight / webfont.xHeight
 *   ascent-override = webfont.ascender / (fallback.ascender * size-adjust)
 *   descent-override = webfont.descender / (fallback.descender * size-adjust)
 */
function computeFontFaceOverrides(
  webfontFamily: string,
  fallbackFamily: string
): {
  sizeAdjust: string;
  ascentOverride: string;
  descentOverride: string;
  lineGapOverride: string;
} {
  const webfont = WEBFONT_METRICS[webfontFamily];
  const fallback = FALLBACK_METRICS[fallbackFamily];

  if (!webfont || !fallback) {
    return {
      sizeAdjust: "100%",
      ascentOverride: "100%",
      descentOverride: "100%",
      lineGapOverride: "0%",
    };
  }

  const sizeAdjust = fallback.xHeight / webfont.xHeight;
  const ascentOverride = webfont.ascender / (fallback.ascender * sizeAdjust);
  const descentOverride = webfont.descender / (fallback.descender * sizeAdjust);
  const lineGapOverride = webfont.lineGap / (fallback.lineGap * sizeAdjust);

  return {
    sizeAdjust: `${(sizeAdjust * 100).toFixed(1)}%`,
    ascentOverride: `${(ascentOverride * 100).toFixed(1)}%`,
    descentOverride: `${(descentOverride * 100).toFixed(1)}%`,
    lineGapOverride: `${lineGapOverride}%`,
  };
}

/** Metric-adjusted @font-face rules for system fallback fonts.
 *  Each rule creates a synthetic font family (e.g. 'Urbanist Fallback') backed by a
 *  local system font (Arial) with ascent/descent/size overrides tuned to match the
 *  webfont's metrics. When the browser renders text with the fallback font before the
 *  webfont loads, the metrics are identical → zero layout shift on font swap.
 *
 *  Inject as a <style> tag in <head> before the font-family CSS vars and webfont
 *  stylesheets so the adjusted fallback families are ready for font-family stacks. */
export function generateFallbackFontFaces(
  primary: FontSlotConfig,
  secondary: FontSlotConfig,
  mono: FontSlotConfig
): string {
  const rules: string[] = [];

  const slots: { config: FontSlotConfig; key: string }[] = [
    { config: primary, key: "primary" },
    { config: secondary, key: "secondary" },
    { config: mono, key: "mono" },
  ];

  for (const slot of slots) {
    if (slot.config.source !== "webfont") continue;

    const family = slot.config.webfont.family;
    const fallbackFamily = FALLBACK_MAP[family];
    if (!fallbackFamily) {
      console.warn(
        `[css-vars] No fallback font mapped for "${family}" — skipping fallback @font-face`
      );
      continue;
    }

    const overrides = computeFontFaceOverrides(family, fallbackFamily);

    rules.push(`@font-face {
  font-family: '${family} Fallback';
  src: local('${fallbackFamily}');
  ascent-override: ${overrides.ascentOverride};
  descent-override: ${overrides.descentOverride};
  line-gap-override: ${overrides.lineGapOverride};
  size-adjust: ${overrides.sizeAdjust};
}`);
  }

  return rules.join("\n");
}

/** Returns the font-family stack for a webfont slot, including the metric-adjusted
 *  fallback between the webfont name and the generic family. This ensures zero-CLS
 *  font swap: the fallback font has identical metrics to the webfont. */
export function webfontFamilyStack(family: string, generic: string): string {
  return `'${family}', '${family} Fallback', ${generic}`;
}

/**
 * Inline style vars for `globals.css` typography utilities (`--type-*-size`, etc.).
 * The root layout injects these on `:root`; workbench previews must repeat them on
 * the preview subtree or typography classes keep static fallbacks.
 */
export function typeScaleToWorkbenchTypographyStyleVars(options: {
  typeScale: TypeScaleConfig;
  primaryWeights: FontWeightMap;
  useMobileSizes: boolean;
}): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [name, value] of Object.entries(options.primaryWeights)) {
    if (value !== undefined && value !== null) {
      vars[`--font-weight-${name}`] = String(value);
    }
  }
  for (const [key, prefix] of Object.entries(TYPE_SCALE_VAR_PREFIXES) as [
    keyof TypeScaleConfig,
    string,
  ][]) {
    const entry = options.typeScale[key];
    const size = options.useMobileSizes ? entry.sizeMobile : entry.sizeDesktop;
    const lineHeight = options.useMobileSizes ? entry.lineHeightMobile : entry.lineHeightDesktop;
    vars[`${prefix}-size`] = `${size}px`;
    vars[`${prefix}-lh`] = `${lineHeight}px`;
    vars[`${prefix}-ls`] = entry.letterSpacing;
    vars[`${prefix}-fw`] = `var(--font-weight-${entry.fontWeightRole})`;
  }
  return vars;
}
