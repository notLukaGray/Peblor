import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
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
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { PersistedVideoDefaults, VideoVariantDefaults, VideoVariantKey } from "./types";

function pickResponsiveValue<T extends string>(
  incoming: unknown,
  fallback: T | [T, T] | undefined
): T | [T, T] | undefined {
  if (typeof incoming === "string") return incoming as T;
  if (
    Array.isArray(incoming) &&
    incoming.length === 2 &&
    typeof incoming[0] === "string" &&
    typeof incoming[1] === "string"
  ) {
    return [incoming[0] as T, incoming[1] as T];
  }
  return fallback;
}

function pickSimpleLink(
  incoming: unknown,
  fallback: VideoVariantDefaults["link"]
): VideoVariantDefaults["link"] {
  if (!incoming || typeof incoming !== "object") return fallback;
  const raw = incoming as { ref?: unknown; external?: unknown };
  if (typeof raw.ref !== "string" || raw.ref.trim() === "") return fallback;
  return {
    ref: raw.ref,
    external: raw.external === true,
  };
}

export function normalizeVideoVariant(
  seed: VideoVariantDefaults,
  incoming?: Partial<VideoVariantDefaults>
): VideoVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    src: pickString(incoming.src, seed.src),
    poster: pickString(incoming.poster, seed.poster),
    ariaLabel: pickString(incoming.ariaLabel, seed.ariaLabel),
    objectFit: pickResponsiveValue(
      incoming.objectFit,
      seed.objectFit as VideoVariantDefaults["objectFit"]
    ) as VideoVariantDefaults["objectFit"],
    objectPosition: pickString(incoming.objectPosition, seed.objectPosition),
    aspectRatio: pickResponsiveValue(incoming.aspectRatio, seed.aspectRatio),
    module: pickString(incoming.module, seed.module),
    link: pickSimpleLink(incoming.link, seed.link),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    autoplay: pickBoolean(incoming.autoplay, seed.autoplay),
    loop: pickBoolean(incoming.loop, seed.loop),
    muted: pickBoolean(incoming.muted, seed.muted),
    showPlayButton: pickBoolean(incoming.showPlayButton, seed.showPlayButton),
    flipHorizontal: pickBoolean(incoming.flipHorizontal, seed.flipHorizontal),
    flipVertical: pickBoolean(incoming.flipVertical, seed.flipVertical),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedVideo(): PersistedVideoDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const data = readElementPersistedPayload("video", STORAGE_KEY);
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
        normalizeVideoVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toVideoExportJson(data: PersistedVideoDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ video: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}

export function toVideoPersisted(
  defaultVariant: VideoVariantKey,
  variants: Record<VideoVariantKey, VideoVariantDefaults>
): PersistedVideoDefaults {
  return { v: 1, defaultVariant, variants };
}
