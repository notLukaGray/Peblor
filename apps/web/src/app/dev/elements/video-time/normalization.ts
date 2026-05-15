import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
import {
  normalizeTypographyVariants,
  pickFiniteNumber,
  pickOverflowValue,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type {
  PersistedVideoTimeDefaults,
  VideoTimeVariantDefaults,
  VideoTimeVariantKey,
} from "./types";

export function normalizeVideoTimeVariant(
  seed: VideoTimeVariantDefaults,
  incoming?: Partial<VideoTimeVariantDefaults>
): VideoTimeVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedVideoTime(): PersistedVideoTimeDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const data = readElementPersistedPayload("videoTime", STORAGE_KEY);
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
        normalizeVideoTimeVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toVideoTimeExportJson(data: PersistedVideoTimeDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ videoTime: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}

export function toVideoTimePersisted(
  defaultVariant: VideoTimeVariantKey,
  variants: Record<VideoTimeVariantKey, VideoTimeVariantDefaults>
): PersistedVideoTimeDefaults {
  return { v: 1, defaultVariant, variants };
}
