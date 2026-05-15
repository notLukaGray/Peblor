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
  _mono: FontSlotConfig
): string {
  const rules: string[] = [];

  if (primary.source === "webfont") {
    // Urbanist → Arial (geometric sans → grotesk sans; adjust ascent/descent)
    rules.push(`@font-face {
  font-family: '${primary.webfont.family} Fallback';
  src: local('Arial');
  ascent-override: 105%;
  descent-override: 25%;
  line-gap-override: 2%;
  size-adjust: 98%;
}`);
  }

  if (secondary.source === "webfont") {
    // Vollkorn → Times New Roman (old-style serif → transitional serif)
    rules.push(`@font-face {
  font-family: '${secondary.webfont.family} Fallback';
  src: local('Times New Roman');
  ascent-override: 107%;
  descent-override: 110%;
  line-gap-override: 5%;
  size-adjust: 97%;
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
