import { DEV_NEUTRAL_BODY_DEFAULTS } from "@/app/dev/elements/element-dev-baseline";
import type { BodyVariantDefaults, BodyVariantKey } from "./types";

export const STORAGE_KEY = "pb-element-body-dev-v1";

export const VARIANT_ORDER: BodyVariantKey[] = ["lead", "standard", "fine"];

export const VARIANT_LABELS: Record<BodyVariantKey, string> = {
  lead: "Lead",
  standard: "Standard",
  fine: "Fine",
};

/** Neutral starting presets for body variants in dev foundation authoring. */
export const BASE_DEFAULTS: {
  defaultVariant: BodyVariantKey;
  variants: Record<BodyVariantKey, BodyVariantDefaults>;
} = {
  defaultVariant: DEV_NEUTRAL_BODY_DEFAULTS.defaultVariant,
  variants: DEV_NEUTRAL_BODY_DEFAULTS.variants as Record<BodyVariantKey, BodyVariantDefaults>,
};
