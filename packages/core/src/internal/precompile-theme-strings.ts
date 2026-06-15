/**
 * Pipeline stage: pre-compile ThemeString objects to CSS `light-dark()` strings.
 *
 * This stage runs AFTER element defaults, entrance motions, and rich-text
 * precompilation — and BEFORE asset resolution. It walks every section and
 * element in the expanded page tree, identifies ThemeString-shaped values
 * ({ light?, dark?, value? }), and replaces them with inline CSS strings
 * (e.g. `light-dark(#fff, #000)`).
 *
 * After this stage, the render-time `lowerThemeStringToCss()` calls receive
 * plain CSS strings and become pass-through no-ops. The browser handles
 * theme-mode switching via the native `light-dark()` CSS function and the
 * element's `color-scheme` property.
 *
 * This eliminates client-side JS theme resolution for all color/fill values.
 */
import type { SectionBlock, ElementBlock } from "@pb/contracts/types";

import { lowerThemeValueDeep } from "./theme-utils";

// ---------------------------------------------------------------------------
// Section-level properties known to carry ThemeString values
// ---------------------------------------------------------------------------

const SECTION_THEME_PROPS: readonly string[] = [
  "fill",
  "border",
  "effects",
  "wrapperStyle",
  "bgFill",
  "revealFill",
];

/**
 * Walk section-level properties and convert every ThemeString found to a
 * CSS `light-dark()` string via deep recursion.
 *
 * @public Section-level transform: precompile theme strings on a single section record.
 */
export function precompileThemeStringsOnSection(section: SectionBlock): SectionBlock {
  const rec = section as Record<string, unknown>;
  let changed = false;
  const out: Record<string, unknown> = { ...rec };

  for (const key of SECTION_THEME_PROPS) {
    const v = rec[key];
    if (v === undefined || v === null) continue;
    const resolved = lowerThemeValueDeep(v);
    if (resolved !== v) {
      out[key] = resolved;
      changed = true;
    }
  }

  return changed ? (out as SectionBlock) : section;
}

// ---------------------------------------------------------------------------
// Element-level properties known to carry ThemeString values
// ---------------------------------------------------------------------------

const ELEMENT_THEME_PROPS: readonly string[] = [
  "color",
  "textFill",
  "fill",
  "wrapperStyle",
  "border",
  "effects",
  "linkDefault",
  "linkHover",
  "linkActive",
  "linkDisabled",
  "bgFill",
  "trackColor",
  "fillColor",
  "accentColor",
  "handleColor",
  "dividerColor",
  "accent",
  "iconColor",
];

/**
 * Walk element-level properties and convert every ThemeString found to a
 * CSS `light-dark()` string via deep recursion.
 *
 * @public Per-element transform: precompile theme strings on a single element.
 */
export function precompileThemeStringsOnElement(el: ElementBlock): ElementBlock {
  const rec = el as Record<string, unknown>;
  let changed = false;
  const out: Record<string, unknown> = { ...rec };

  for (const key of ELEMENT_THEME_PROPS) {
    const v = rec[key];
    if (v === undefined || v === null) continue;
    const resolved = lowerThemeValueDeep(v);
    if (resolved !== v) {
      out[key] = resolved;
      changed = true;
    }
  }

  return changed ? (out as ElementBlock) : el;
}
