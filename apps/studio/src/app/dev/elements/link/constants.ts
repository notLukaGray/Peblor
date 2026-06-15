import { DEV_NEUTRAL_LINK_DEFAULTS } from "@/app/dev/elements/element-dev-baseline";
import type { LinkVariantDefaults, LinkVariantKey } from "./types";

export const STORAGE_KEY = "pb-element-link-dev-v1";

export const VARIANT_ORDER: LinkVariantKey[] = ["inline", "emphasis", "nav"];

export const VARIANT_LABELS: Record<LinkVariantKey, string> = {
  inline: "Inline",
  emphasis: "Emphasis",
  nav: "Nav",
};

/** Neutral starting presets for link variants in dev foundation authoring. */
export const BASE_DEFAULTS: {
  defaultVariant: LinkVariantKey;
  variants: Record<LinkVariantKey, LinkVariantDefaults>;
} = {
  defaultVariant: DEV_NEUTRAL_LINK_DEFAULTS.defaultVariant,
  variants: DEV_NEUTRAL_LINK_DEFAULTS.variants as Record<LinkVariantKey, LinkVariantDefaults>,
};
