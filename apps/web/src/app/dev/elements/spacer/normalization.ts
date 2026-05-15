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
import type { PersistedSpacerDefaults, SpacerVariantDefaults, SpacerVariantKey } from "./types";

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

export function normalizeSpacerVariant(
  seed: SpacerVariantDefaults,
  incoming?: Partial<SpacerVariantDefaults>
): SpacerVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    height: pickResponsiveString(incoming.height, seed.height),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedSpacer(): PersistedSpacerDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const data = readElementPersistedPayload("spacer", STORAGE_KEY);
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
        normalizeSpacerVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toSpacerExportJson(data: PersistedSpacerDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ spacer: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}

export function toSpacerPersisted(
  defaultVariant: SpacerVariantKey,
  variants: Record<SpacerVariantKey, SpacerVariantDefaults>
): PersistedSpacerDefaults {
  return { v: 1, defaultVariant, variants };
}
