export {
  primaryFontConfig,
  secondaryFontConfig,
  monoFontConfig,
  FONT_WEIGHT_ROLES,
  type FontSlotConfig,
  type FontWeightMap,
  type FontWeightRole,
  type LocalFontConfig,
  type LocalStaticFile,
} from "./config";

export {
  typeScaleConfig,
  TYPE_SCALE_VAR_PREFIXES,
  TYPE_SCALE_LABELS,
  TYPE_SCALE_SHORT_TAG,
  TYPE_SCALE_UTILITY_CLASS,
  TYPE_SCALE_LEGACY_KEYS,
  TYPE_SCALE_PREVIOUS_TSHIRT_SLOT_MAP,
  type TypeScaleConfig,
  type TypeScaleEntry,
} from "./type-scale";

export { primaryFontLocal, secondaryFontLocal, monoFontLocal } from "./create-fonts";
export { buildBunnyFontUrl, getActiveWebfontUrls } from "./webfont";
export { generateFontCssVars } from "./css-vars";

import { primaryFontConfig, secondaryFontConfig, monoFontConfig } from "./config";

/** Active delivery source per slot — useful for conditional logic in layout. */
export const fontSource = {
  primary: primaryFontConfig.source,
  secondary: secondaryFontConfig.source,
  mono: monoFontConfig.source,
} as const;

/** Human-readable display name per slot — used in the style guide and dev tools. */
export const fontDisplayNames = {
  primary:
    primaryFontConfig.source === "webfont" ? primaryFontConfig.webfont.family : "Local (primary)",
  secondary:
    secondaryFontConfig.source === "webfont"
      ? secondaryFontConfig.webfont.family
      : "Local (secondary)",
  mono: monoFontConfig.source === "webfont" ? monoFontConfig.webfont.family : "Local (mono)",
} as const;
