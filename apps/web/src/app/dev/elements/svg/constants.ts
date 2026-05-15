import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { SvgVariantDefaults, SvgVariantKey } from "./types";

const NEUTRAL_ANIMATION = cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);

export const STORAGE_KEY = "pb-element-svg-dev-v1";

export const VARIANT_ORDER: SvgVariantKey[] = ["default", "inline", "badge"];

export const VARIANT_LABELS: Record<SvgVariantKey, string> = {
  default: "Default",
  inline: "Inline",
  badge: "Badge",
};

export const DEFAULT_MARKUP =
  '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.7)" stroke-width="2"/><path d="M20 32h24M32 20v24" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/></svg>';

const INLINE_MARKUP =
  '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

const BADGE_MARKUP =
  '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="28" height="28" rx="6" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/><circle cx="16" cy="16" r="6" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/></svg>';

export const BASE_DEFAULTS: {
  defaultVariant: SvgVariantKey;
  variants: Record<SvgVariantKey, SvgVariantDefaults>;
} = {
  defaultVariant: "default",
  variants: {
    default: {
      markup: DEFAULT_MARKUP,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    inline: {
      markup: INLINE_MARKUP,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
    badge: {
      markup: BADGE_MARKUP,
      animation: JSON.parse(JSON.stringify(NEUTRAL_ANIMATION)) as typeof NEUTRAL_ANIMATION,
    },
  },
};
