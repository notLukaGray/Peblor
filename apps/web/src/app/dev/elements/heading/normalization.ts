import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
import {
  normalizeTypographyVariants,
  pickBoolean,
  pickFiniteNumber,
  pickOverflowValue,
  pickString,
  pickUnitOpacity,
  readTypographyPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { HeadingVariantDefaults, PersistedHeadingDefaults } from "./types";

function pickHeadingLevel(
  incoming: unknown,
  fallback: HeadingVariantDefaults["level"] | HeadingVariantDefaults["semanticLevel"]
): HeadingVariantDefaults["level"] | HeadingVariantDefaults["semanticLevel"] {
  if (typeof incoming !== "number") return fallback;
  if (incoming < 1 || incoming > 6) return fallback;
  return incoming as HeadingVariantDefaults["level"];
}

export function normalizeHeadingVariant(
  seed: HeadingVariantDefaults,
  incoming?: Partial<HeadingVariantDefaults>
): HeadingVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  const level = pickHeadingLevel(incoming.level, seed.level) as HeadingVariantDefaults["level"];
  const semanticLevel = pickHeadingLevel(
    incoming.semanticLevel,
    seed.semanticLevel
  ) as HeadingVariantDefaults["semanticLevel"];
  const color =
    incoming.color === undefined ? seed.color : pickString(incoming.color, seed.color) || undefined;
  const fontFamily =
    incoming.fontFamily === undefined
      ? seed.fontFamily
      : pickString(incoming.fontFamily, seed.fontFamily) || undefined;
  return {
    ...seed,
    ...incoming,
    level,
    text: pickString(incoming.text, seed.text),
    color,
    fontFamily,
    semanticLevel,
    wordWrap: pickBoolean(incoming.wordWrap, seed.wordWrap),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedHeading(): PersistedHeadingDefaults | null {
  const data = readTypographyPersistedPayload("heading", STORAGE_KEY);
  if (!data) return null;
  return {
    v: 1,
    defaultVariant: resolveTypographyDefaultVariant(
      VARIANT_ORDER,
      data.defaultVariant,
      BASE_DEFAULTS.defaultVariant
    ),
    variants: normalizeTypographyVariants(
      VARIANT_ORDER,
      BASE_DEFAULTS.variants,
      data.variants,
      normalizeHeadingVariant
    ),
  };
}

export function toHeadingExportJson(data: PersistedHeadingDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ heading: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}
