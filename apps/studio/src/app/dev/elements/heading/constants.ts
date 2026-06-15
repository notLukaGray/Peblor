import { DEV_NEUTRAL_HEADING_DEFAULTS } from "@/app/dev/elements/element-dev-baseline";
import type { HeadingVariantDefaults, HeadingVariantKey } from "./types";

export const STORAGE_KEY = "pb-element-heading-dev-v1";

export const VARIANT_ORDER: HeadingVariantKey[] = ["display", "section", "label"];

export const VARIANT_LABELS: Record<HeadingVariantKey, string> = {
  display: "Display",
  section: "Section",
  label: "Label",
};

/** Neutral starting presets for heading variants in dev foundation authoring. */
export const BASE_DEFAULTS: {
  defaultVariant: HeadingVariantKey;
  variants: Record<HeadingVariantKey, HeadingVariantDefaults>;
} = {
  defaultVariant: DEV_NEUTRAL_HEADING_DEFAULTS.defaultVariant,
  variants: DEV_NEUTRAL_HEADING_DEFAULTS.variants as Record<
    HeadingVariantKey,
    HeadingVariantDefaults
  >,
};
