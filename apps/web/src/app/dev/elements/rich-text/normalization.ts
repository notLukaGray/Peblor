import {
  normalizeTypographyVariants,
  pickBoolean,
  pickFiniteNumber,
  pickOverflowValue,
  pickString,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type {
  PersistedRichTextDefaults,
  RichTextVariantDefaults,
  RichTextVariantKey,
} from "./types";

function pickLevel(
  incoming: unknown,
  fallback: RichTextVariantDefaults["level"]
): RichTextVariantDefaults["level"] {
  if (isValidLevel(incoming)) {
    return incoming as RichTextVariantDefaults["level"];
  }
  if (Array.isArray(incoming)) {
    const desktop = incoming[0];
    const mobile = incoming[1];
    if (isValidLevel(desktop) && isValidLevel(mobile)) {
      return [desktop, mobile] as RichTextVariantDefaults["level"];
    }
  }
  return fallback;
}

function isValidLevel(value: unknown): value is 1 | 2 | 3 | 4 | 5 | 6 {
  return typeof value === "number" && value >= 1 && value <= 6;
}

export function normalizeRichTextVariant(
  seed: RichTextVariantDefaults,
  incoming?: Partial<RichTextVariantDefaults>
): RichTextVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    content: pickString(incoming.content, seed.content),
    markup: pickString(incoming.markup, seed.markup),
    level: pickLevel(incoming.level, seed.level),
    wordWrap: pickBoolean(incoming.wordWrap, seed.wordWrap),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedRichText(): PersistedRichTextDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const d = readElementPersistedPayload("richText", STORAGE_KEY) as Record<
      string,
      unknown
    > | null;
    if (!d || !d.defaultVariant || !d.variants) return null;
    return {
      v: 1,
      defaultVariant: resolveTypographyDefaultVariant(
        VARIANT_ORDER,
        d.defaultVariant as string,
        BASE_DEFAULTS.defaultVariant
      ) as RichTextVariantKey,
      variants: normalizeTypographyVariants(
        VARIANT_ORDER,
        BASE_DEFAULTS.variants,
        d.variants as Record<string, unknown>,
        normalizeRichTextVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toRichTextExportJson(data: PersistedRichTextDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ richText: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}

export function toRichTextPersisted(
  defaultVariant: RichTextVariantKey,
  variants: Record<RichTextVariantKey, RichTextVariantDefaults>
): PersistedRichTextDefaults {
  return { v: 1, defaultVariant, variants };
}
