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
import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import { BASE_DEFAULTS, RIVE_FIT_OPTIONS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { PersistedRiveDefaults, RiveVariantDefaults, RiveVariantKey } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRivePersistedPayload(): {
  defaultVariant: string;
  variants: Record<string, unknown>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = readElementPersistedPayload("rive", STORAGE_KEY);
    if (
      !isRecord(parsed) ||
      typeof parsed.defaultVariant !== "string" ||
      !isRecord(parsed.variants)
    ) {
      return null;
    }
    return { defaultVariant: parsed.defaultVariant, variants: parsed.variants };
  } catch {
    return null;
  }
}

function pickRiveFit(
  incoming: unknown,
  fallback: RiveVariantDefaults["fit"]
): RiveVariantDefaults["fit"] {
  if (typeof incoming !== "string") return fallback;
  return (RIVE_FIT_OPTIONS as readonly string[]).includes(incoming)
    ? (incoming as RiveVariantDefaults["fit"])
    : fallback;
}

export function normalizeRiveVariant(
  seed: RiveVariantDefaults,
  incoming?: Partial<RiveVariantDefaults>
): RiveVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    src: pickString(incoming.src, seed.src),
    artboard:
      typeof incoming.artboard === "string" || incoming.artboard === undefined
        ? incoming.artboard
        : seed.artboard,
    stateMachine:
      typeof incoming.stateMachine === "string" || incoming.stateMachine === undefined
        ? incoming.stateMachine
        : seed.stateMachine,
    autoplay: pickBoolean(incoming.autoplay, seed.autoplay),
    aspectRatio: typeof incoming.aspectRatio === "string" ? incoming.aspectRatio : seed.aspectRatio,
    fit: pickRiveFit(incoming.fit, seed.fit),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(
      seed.animation,
      incoming.animation as Partial<RiveVariantDefaults["animation"]> | undefined
    ),
  };
}

export function readPersistedRive(): PersistedRiveDefaults | null {
  try {
    const data = readRivePersistedPayload();
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
        normalizeRiveVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toRiveExportJson(data: PersistedRiveDefaults): string {
  return JSON.stringify(
    { rive: { defaultVariant: data.defaultVariant, variants: data.variants } },
    null,
    2
  );
}

export function buildRiveElementSnippet(
  _variantKey: RiveVariantKey,
  variant: RiveVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementRive",
    ...variant,
  });
}
