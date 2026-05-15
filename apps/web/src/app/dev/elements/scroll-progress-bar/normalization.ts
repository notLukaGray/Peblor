import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
import {
  normalizeTypographyVariants,
  pickFiniteNumber,
  pickOverflowValue,
  pickString,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type {
  PersistedScrollProgressBarDefaults,
  ScrollProgressBarVariantDefaults,
  ScrollProgressBarVariantKey,
} from "./types";

function pickResponsiveString(
  incoming: unknown,
  fallback: string | [string, string] | undefined
): string | [string, string] | undefined {
  if (typeof incoming === "string") return incoming;
  if (
    Array.isArray(incoming) &&
    incoming.length === 2 &&
    typeof incoming[0] === "string" &&
    typeof incoming[1] === "string"
  ) {
    return [incoming[0], incoming[1]];
  }
  return fallback;
}

function pickOffset(
  incoming: unknown,
  fallback: ScrollProgressBarVariantDefaults["offset"]
): ScrollProgressBarVariantDefaults["offset"] {
  if (
    Array.isArray(incoming) &&
    incoming.length === 2 &&
    typeof incoming[0] === "string" &&
    typeof incoming[1] === "string"
  ) {
    return [incoming[0], incoming[1]];
  }
  return fallback;
}

export function normalizeScrollProgressBarVariant(
  seed: ScrollProgressBarVariantDefaults,
  incoming?: Partial<ScrollProgressBarVariantDefaults>
): ScrollProgressBarVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    height: pickResponsiveString(incoming.height, seed.height),
    fill: pickString(incoming.fill, seed.fill),
    trackBackground: pickString(incoming.trackBackground, seed.trackBackground),
    offset: pickOffset(incoming.offset, seed.offset),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedScrollProgressBar(): PersistedScrollProgressBarDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const data = readElementPersistedPayload("scrollProgressBar", STORAGE_KEY);
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    if (!d.defaultVariant || !d.variants) return null;
    return {
      v: 1,
      defaultVariant: resolveTypographyDefaultVariant(
        VARIANT_ORDER,
        d.defaultVariant as string,
        BASE_DEFAULTS.defaultVariant
      ),
      variants: normalizeTypographyVariants(
        VARIANT_ORDER,
        BASE_DEFAULTS.variants,
        d.variants as Record<string, unknown>,
        normalizeScrollProgressBarVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toScrollProgressBarExportJson(data: PersistedScrollProgressBarDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify(
    { scrollProgressBar: { defaultVariant: data.defaultVariant, variants } },
    null,
    2
  );
}

export function toScrollProgressBarPersisted(
  defaultVariant: ScrollProgressBarVariantKey,
  variants: Record<ScrollProgressBarVariantKey, ScrollProgressBarVariantDefaults>
): PersistedScrollProgressBarDefaults {
  return { v: 1, defaultVariant, variants };
}
