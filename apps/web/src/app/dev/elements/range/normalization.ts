import {
  normalizeTypographyVariants,
  pickFiniteNumber,
  pickString,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { RangeVariantDefaults, RangeVariantKey, PersistedRangeDefaults } from "./types";

function normalizeRangeStyle(
  seed: RangeVariantDefaults["style"],
  incoming: unknown
): RangeVariantDefaults["style"] {
  if (!incoming || typeof incoming !== "object") {
    return seed;
  }
  const inc = incoming as Record<string, unknown>;
  const next = { ...(seed ?? {}) } as Record<string, string | number>;
  const apply = (key: string) => {
    const fallback = typeof next[key] === "string" ? (next[key] as string) : undefined;
    const value = pickString(inc[key] as string | undefined, fallback);
    if (value === undefined || value.trim().length === 0) {
      delete next[key];
    } else {
      next[key] = value;
    }
  };

  apply("trackColor");
  apply("fillColor");
  apply("accentColor");
  apply("trackHeight");
  apply("thumbSize");
  apply("borderRadius");

  return Object.keys(next).length > 0 ? (next as RangeVariantDefaults["style"]) : undefined;
}

export function normalizeRangeVariant(
  seed: RangeVariantDefaults,
  incoming?: Partial<RangeVariantDefaults>
): RangeVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    min: pickFiniteNumber(incoming.min, seed.min),
    max: pickFiniteNumber(incoming.max, seed.max),
    step: pickFiniteNumber(incoming.step, seed.step),
    defaultValue: pickFiniteNumber(incoming.defaultValue, seed.defaultValue),
    action: pickString(incoming.action, seed.action),
    actionPayload: incoming.actionPayload ?? seed.actionPayload,
    ariaLabel: pickString(incoming.ariaLabel, seed.ariaLabel),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    style: normalizeRangeStyle(seed.style, incoming.style),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedRange(): PersistedRangeDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const d = readElementPersistedPayload("range", STORAGE_KEY) as Record<string, unknown> | null;
    if (!d || !d.defaultVariant || !d.variants) return null;
    return {
      v: 1,
      defaultVariant: resolveTypographyDefaultVariant(
        VARIANT_ORDER,
        d.defaultVariant as string,
        BASE_DEFAULTS.defaultVariant
      ) as RangeVariantKey,
      variants: normalizeTypographyVariants(
        VARIANT_ORDER,
        BASE_DEFAULTS.variants,
        d.variants as Record<string, unknown>,
        normalizeRangeVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toRangeExportJson(data: PersistedRangeDefaults): string {
  return JSON.stringify(
    { range: { defaultVariant: data.defaultVariant, variants: data.variants } },
    null,
    2
  );
}
