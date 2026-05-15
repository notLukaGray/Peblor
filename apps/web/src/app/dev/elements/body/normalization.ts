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
import type { BodyVariantDefaults, PersistedBodyDefaults } from "./types";

export function normalizeBodyVariant(
  seed: BodyVariantDefaults,
  incoming?: Partial<BodyVariantDefaults>
): BodyVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  const color =
    incoming.color === undefined ? seed.color : pickString(incoming.color, seed.color) || undefined;
  const fontFamily =
    incoming.fontFamily === undefined
      ? seed.fontFamily
      : pickString(incoming.fontFamily, seed.fontFamily) || undefined;
  return {
    ...seed,
    ...incoming,
    text: pickString(incoming.text, seed.text),
    color,
    fontFamily,
    wordWrap: pickBoolean(incoming.wordWrap, seed.wordWrap),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedBody(): PersistedBodyDefaults | null {
  const data = readTypographyPersistedPayload("body", STORAGE_KEY);
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
      normalizeBodyVariant
    ),
  };
}

export function toBodyExportJson(data: PersistedBodyDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ body: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}
