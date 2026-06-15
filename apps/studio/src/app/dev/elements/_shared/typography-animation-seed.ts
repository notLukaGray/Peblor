import {
  cloneTypographyAnimationFromImageDefaults,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

/** Deep clone of the neutral image defaults — shared animation-lab starting point for typography dev. */
export function cloneDefaultTypographyAnimation(): PbImageAnimationDefaults {
  return cloneTypographyAnimationFromImageDefaults(DEV_NEUTRAL_IMAGE_DEFAULTS);
}

export function addTypographyAnimationToVariants<
  K extends string,
  T extends Record<string, unknown>,
>(variants: Record<K, T>): Record<K, T & { animation: PbImageAnimationDefaults }> {
  const out = {} as Record<K, T & { animation: PbImageAnimationDefaults }>;
  for (const key of Object.keys(variants) as K[]) {
    out[key] = {
      ...variants[key],
      animation: cloneDefaultTypographyAnimation(),
    };
  }
  return out;
}
