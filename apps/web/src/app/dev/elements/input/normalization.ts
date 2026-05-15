import {
  normalizeTypographyVariants,
  pickBoolean,
  pickString,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { InputVariantDefaults, InputVariantKey, PersistedInputDefaults } from "./types";

export function normalizeInputVariant(
  seed: InputVariantDefaults,
  incoming?: Partial<InputVariantDefaults>
): InputVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    placeholder: pickString(incoming.placeholder, seed.placeholder),
    showIcon: pickBoolean(incoming.showIcon, seed.showIcon),
    color: pickString(incoming.color, seed.color),
    ariaLabel: pickString(incoming.ariaLabel, seed.ariaLabel),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
  };
}

export function readPersistedInput(): PersistedInputDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const d = readElementPersistedPayload("input", STORAGE_KEY) as Record<string, unknown> | null;
    if (!d || !d.defaultVariant || !d.variants) return null;
    return {
      v: 1,
      defaultVariant: resolveTypographyDefaultVariant(
        VARIANT_ORDER,
        d.defaultVariant as string,
        BASE_DEFAULTS.defaultVariant
      ) as InputVariantKey,
      variants: normalizeTypographyVariants(
        VARIANT_ORDER,
        BASE_DEFAULTS.variants,
        d.variants as Record<string, unknown>,
        normalizeInputVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toInputExportJson(data: PersistedInputDefaults): string {
  return JSON.stringify(
    { input: { defaultVariant: data.defaultVariant, variants: data.variants } },
    null,
    2
  );
}
