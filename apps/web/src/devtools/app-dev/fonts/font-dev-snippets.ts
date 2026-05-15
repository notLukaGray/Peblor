/* eslint-disable max-lines */
import type { TypeScaleConfig } from "@/app/fonts/type-scale";
import { TYPE_SCALE_VAR_PREFIXES } from "@/app/fonts/type-scale";
import type { BunnyFontMeta } from "@/app/dev/fonts/page";
import type { SlotName, SlotState } from "./font-dev-persistence";

const SCALE_KEYS = Object.keys(TYPE_SCALE_VAR_PREFIXES) as (keyof TypeScaleConfig)[];

function slugify(family: string): string {
  return family.toLowerCase().replace(/\s+/g, "-");
}

function variableWeightRangeSnippet(meta: BunnyFontMeta): string {
  if (meta.weights.length === 0) return "100 900";
  return `${Math.min(...meta.weights)} ${Math.max(...meta.weights)}`;
}

function generateFontSnippet(
  slot: SlotName,
  state: SlotState,
  bunnyMeta: BunnyFontMeta | undefined,
  browserLocalPreview?: boolean
): string {
  const head = browserLocalPreview
    ? "// Preview: files below are only in this browser. For the live site, add the same files under public/font/ and list them in local.files here.\n//\n"
    : "";

  const weights = Object.entries(state.weights)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `    ${key}: ${value}`)
    .join(",\n");

  const localBlock = bunnyMeta?.variable
    ? `  local: {
    variable: true,
    path: "../../../public/font/YourFont[wght].woff2",
    weightRange: "${bunnyMeta ? variableWeightRangeSnippet(bunnyMeta) : "100 900"}",
  },`
    : `  local: {
    variable: false,
    files: [
      // { path: "../../../public/font/YourFont-Regular.woff2", weight: 400, style: "normal" },
    ],
  },`;

  return `${head}export const ${slot}FontConfig: FontSlotConfig = {
  source: "${state.source}",

  webfont: { family: "${state.family}" },

${localBlock}

  weights: {
${weights},
  },
  italic: ${state.italic},
};`;
}

const CONFIG_FILE_HEADER = `export type FontWeightMap = {
  thin?: number;
  light?: number;
  book?: number;
  regular?: number;
  bold?: number;
  black?: number;
};

export const FONT_WEIGHT_ROLES = ["thin", "light", "regular", "book", "bold", "black"] as const;
export type FontWeightRole = (typeof FONT_WEIGHT_ROLES)[number];

export type LocalStaticFile = {
  path: string;
  weight: number;
  style: "normal" | "italic";
};

export type LocalFontConfig =
  | { variable: true; path: string; weightRange: string }
  | { variable: false; files: LocalStaticFile[] };

export type FontSlotConfig = {
  source: "local" | "webfont";
  webfont: { family: string };
  local: LocalFontConfig;
  weights: FontWeightMap;
  italic: boolean;
};

// ─── Slot definitions ─────────────────────────────────────────────────────────
//
// To switch a slot from local files to a webfont (or back):
//   change \`source\` — that's the only line you need to touch.
//
// To change the webfont family:
//   update \`webfont.family\` to any name from fonts.bunny.net.
//
// To update local files:
//   1. Drop your font files into public/font/
//   2. Update the \`local\` config here to reflect them
//   3. Update the matching literal src array in create-fonts.ts
//
// To change weight mappings for a new typeface:
//   update \`weights\` — the CSS vars and typography classes update automatically.`;

export function generateAllFontsSnippet(
  configs: Record<SlotName, SlotState>,
  fontList: Record<string, BunnyFontMeta>,
  slotHasLocalPreview: (slot: SlotName) => boolean
): string {
  const slotSnippets = (["primary", "secondary", "mono"] as SlotName[])
    .map((slot) =>
      generateFontSnippet(
        slot,
        configs[slot],
        fontList[slugify(configs[slot].family)],
        slotHasLocalPreview(slot)
      )
    )
    .join("\n\n");

  return `${CONFIG_FILE_HEADER}\n\n${slotSnippets}`;
}

const TYPE_SCALE_FILE_HEADER = `/**
 * Type scale configuration.
 *
 * Six **heading** steps and six **body** steps from **extra small** through **double
 * extra large** (XS → 2XL). Size, line-height, letter-spacing, and **weight role** are
 * independent per step — tokens are a ladder only, not a fixed HTML outline slot.
 *
 * Values drive CSS custom properties injected in the layout; globals.css references
 * vars only. To change the scale: edit the numbers here. To preview: /dev/fonts.
 */

import type { FontWeightRole } from "./config";

export type TypeScaleEntry = {
  /** Desktop font size in px (applied at ≥768px). */
  sizeDesktop: number;
  /** Mobile font size in px (applied below 768px). */
  sizeMobile: number;
  /** Desktop line height in px. */
  lineHeightDesktop: number;
  /** Mobile line height in px. */
  lineHeightMobile: number;
  /** Letter spacing as a CSS value (e.g. "0", "0.02em", "-0.01em"). */
  letterSpacing: string;
  /**
   * Which named weight from \`primaryFontConfig.weights\` this style uses.
   * Injected as \`--type-{...}-fw: var(--font-weight-{name})\` so it tracks the font config.
   */
  fontWeightRole: FontWeightRole;
};

export type TypeScaleConfig = {
  // ── Headings (XS → 2XL, smallest → largest) ───────────────────────────────
  headingXs: TypeScaleEntry;
  headingSm: TypeScaleEntry;
  headingMd: TypeScaleEntry;
  headingLg: TypeScaleEntry;
  headingXl: TypeScaleEntry;
  heading2xl: TypeScaleEntry;

  // ── Body (XS → 2XL, smallest → largest) ───────────────────────────────────
  bodyXs: TypeScaleEntry;
  bodySm: TypeScaleEntry;
  bodyMd: TypeScaleEntry;
  bodyLg: TypeScaleEntry;
  bodyXl: TypeScaleEntry;
  body2xl: TypeScaleEntry;
};`;

const TYPE_SCALE_FILE_FOOTER = `
/** Maps each config key to its CSS var prefix. */
export const TYPE_SCALE_VAR_PREFIXES: Record<keyof TypeScaleConfig, string> = {
  headingXs: "--type-heading-xs",
  headingSm: "--type-heading-sm",
  headingMd: "--type-heading-md",
  headingLg: "--type-heading-lg",
  headingXl: "--type-heading-xl",
  heading2xl: "--type-heading-2xl",
  bodyXs: "--type-body-xs",
  bodySm: "--type-body-sm",
  bodyMd: "--type-body-md",
  bodyLg: "--type-body-lg",
  bodyXl: "--type-body-xl",
  body2xl: "--type-body-2xl",
};

/** Display labels for the dev tool and UI (full written names). */
export const TYPE_SCALE_LABELS: Record<keyof TypeScaleConfig, string> = {
  headingXs: "Heading Extra Small",
  headingSm: "Heading Small",
  headingMd: "Heading Medium",
  headingLg: "Heading Large",
  headingXl: "Heading Extra Large",
  heading2xl: "Heading Double Extra Large",
  bodyXs: "Body Extra Small",
  bodySm: "Body Small",
  bodyMd: "Body Medium",
  bodyLg: "Body Large",
  bodyXl: "Body Extra Large",
  body2xl: "Body Double Extra Large",
};

/** Compact tier token (specs, dropdowns). */
export const TYPE_SCALE_SHORT_TAG: Record<keyof TypeScaleConfig, string> = {
  headingXs: "XS",
  headingSm: "SM",
  headingMd: "MD",
  headingLg: "LG",
  headingXl: "XL",
  heading2xl: "2XL",
  bodyXs: "XS",
  bodySm: "SM",
  bodyMd: "MD",
  bodyLg: "LG",
  bodyXl: "XL",
  body2xl: "2XL",
};

/** CSS utility class per scale entry (see \`globals.css\`). */
export const TYPE_SCALE_UTILITY_CLASS: Record<keyof TypeScaleConfig, string> = {
  headingXs: "typography-heading-xs",
  headingSm: "typography-heading-sm",
  headingMd: "typography-heading-md",
  headingLg: "typography-heading-lg",
  headingXl: "typography-heading-xl",
  heading2xl: "typography-heading-2xl",
  bodyXs: "typography-body-xs",
  bodySm: "typography-body-sm",
  bodyMd: "typography-body-md",
  bodyLg: "typography-body-lg",
  bodyXl: "typography-body-xl",
  body2xl: "typography-body-2xl",
};

/**
 * Oldest persisted keys (primary / legal / …) → current \`TypeScaleConfig\` keys
 * (XS–2XL semantics).
 */
export const TYPE_SCALE_LEGACY_KEYS: Record<string, keyof TypeScaleConfig> = {
  headingPrimary: "heading2xl",
  headingSecondary: "headingXl",
  headingTertiaryBold: "headingLg",
  headingTertiaryLight: "headingMd",
  headingCardBold: "headingSm",
  headingCardLight: "headingXs",
  bodyLargeRegular: "body2xl",
  bodyLargeThin: "bodyXl",
  bodyMediumRegular: "bodyLg",
  bodyMediumThin: "bodyMd",
  bodyLegalBook: "bodySm",
  bodyLegalLight: "bodyXs",
};

/**
 * Next-most-recent save used the same string names as today but with **XL = largest**
 * and **2XS = smallest**. If JSON still has \`heading2xs\` / \`body2xs\`, move each blob
 * to the matching XS–2XL key before merging.
 */
export const TYPE_SCALE_PREVIOUS_TSHIRT_SLOT_MAP: Record<string, keyof TypeScaleConfig> = {
  headingXl: "heading2xl",
  headingLg: "headingXl",
  headingMd: "headingLg",
  headingSm: "headingMd",
  headingXs: "headingSm",
  heading2xs: "headingXs",
  bodyXl: "body2xl",
  bodyLg: "bodyXl",
  bodyMd: "bodyLg",
  bodySm: "bodyMd",
  bodyXs: "bodySm",
  body2xs: "bodyXs",
};`;

export function generateScaleSnippet(scale: TypeScaleConfig): string {
  const entries = SCALE_KEYS.map((key) => {
    const entry = scale[key];
    return `  ${key}: {
    sizeDesktop: ${entry.sizeDesktop},
    sizeMobile: ${entry.sizeMobile},
    lineHeightDesktop: ${entry.lineHeightDesktop},
    lineHeightMobile: ${entry.lineHeightMobile},
    letterSpacing: "${entry.letterSpacing}",
    fontWeightRole: "${entry.fontWeightRole}",
  }`;
  }).join(",\n");

  const config = `export const typeScaleConfig: TypeScaleConfig = {\n${entries},\n};`;
  return `${TYPE_SCALE_FILE_HEADER}\n\n${config}\n${TYPE_SCALE_FILE_FOOTER}`;
}
