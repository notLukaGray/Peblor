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
import type { PbResponsiveValue } from "@/app/theme/pb-builder-defaults";

function pickResponsiveValue<T extends string>(
  incoming: unknown,
  fallback: PbResponsiveValue<T> | undefined
): PbResponsiveValue<T> | undefined {
  if (typeof incoming === "string") return incoming as T;
  if (
    Array.isArray(incoming) &&
    incoming.length === 2 &&
    typeof incoming[0] === "string" &&
    typeof incoming[1] === "string"
  ) {
    return { base: incoming[0] as T, md: incoming[1] as T };
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
    aspectRatio:
      typeof incoming.aspectRatio === "string" ||
      typeof incoming.aspectRatio === "number" ||
      (Array.isArray(incoming.aspectRatio) &&
        incoming.aspectRatio.length === 2 &&
        typeof incoming.aspectRatio[0] === "string" &&
        typeof incoming.aspectRatio[1] === "string")
        ? (incoming.aspectRatio as VideoVariantDefaults["aspectRatio"])
        : seed.aspectRatio,
    module: pickString(incoming.module, seed.module),
    link: pickSimpleLink(incoming.link, seed.link),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    layer: pickFiniteNumber(incoming.layer, seed.layer),
    scroll: pickOverflowValue(incoming.scroll, seed.scroll),
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
  } catch (err) {
    console.warn("[web] Failed to normalize video element defaults", err);
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
