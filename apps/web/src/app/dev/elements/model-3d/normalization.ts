import {
  normalizeTypographyVariants,
  pickFiniteNumber,
  pickOverflowValue,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { Model3dVariantDefaults, Model3dVariantKey, PersistedModel3dDefaults } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readModel3dPersistedPayload(): {
  defaultVariant: string;
  variants: Record<string, unknown>;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = readElementPersistedPayload("model3d", STORAGE_KEY);
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

export function normalizeModel3dVariant(
  seed: Model3dVariantDefaults,
  incoming?: Partial<Model3dVariantDefaults>
): Model3dVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    aspectRatio: typeof incoming.aspectRatio === "string" ? incoming.aspectRatio : seed.aspectRatio,
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(
      seed.animation,
      incoming.animation as Partial<Model3dVariantDefaults["animation"]> | undefined
    ),
  };
}

export function readPersistedModel3d(): PersistedModel3dDefaults | null {
  try {
    const data = readModel3dPersistedPayload();
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
        normalizeModel3dVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toModel3dExportJson(data: PersistedModel3dDefaults): string {
  return JSON.stringify(
    { model3d: { defaultVariant: data.defaultVariant, variants: data.variants } },
    null,
    2
  );
}

export function buildModel3dElementSnippet(
  _variantKey: Model3dVariantKey,
  variant: Model3dVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementModel3D",
    ...variant,
  });
}
