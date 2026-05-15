import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { proposePbContentGuidelines, type StyleToolSeeds } from "@/app/theme/pb-style-suggest";
import { deriveSpacingScale } from "@/app/theme/pb-spacing-tokens";

const BASE_SPACING_REM = 0.75;
const BASE_SPACING_SCALE = deriveSpacingScale(BASE_SPACING_REM);

export const DEV_NEUTRAL_STYLE_SEEDS: StyleToolSeeds = {
  alignment: "start",
  spacingBaseRem: BASE_SPACING_REM,
  spacingScale: {
    xs: BASE_SPACING_SCALE.xs,
    sm: BASE_SPACING_SCALE.sm,
    md: BASE_SPACING_SCALE.md,
    lg: BASE_SPACING_SCALE.lg,
    xl: BASE_SPACING_SCALE.xl,
    "2xl": BASE_SPACING_SCALE["2xl"],
    "3xl": BASE_SPACING_SCALE["3xl"],
    "4xl": BASE_SPACING_SCALE["4xl"],
  },
  spacingScaleLocks: {},
  radiusBaseRem: 0.5,
  useDefaultFrameGap: true,
};

export function createNeutralStyleGuidelines(): PbContentGuidelines {
  return proposePbContentGuidelines(DEV_NEUTRAL_STYLE_SEEDS);
}
