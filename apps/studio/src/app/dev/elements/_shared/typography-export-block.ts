import { buildImageMotionTimingFromAnimationDefaults } from "@/app/theme/pb-builder-defaults";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

/**
 * Dev typography variants carry `animation` (image lab model). Theme / clipboard exports should use
 * `motionTiming` derived from it instead of the dev-only `animation` field.
 */
export function typographyVariantForThemeExport(
  variant: Record<string, unknown>
): Record<string, unknown> {
  const { animation, ...rest } = variant as {
    animation?: PbImageAnimationDefaults;
  } & Record<string, unknown>;
  if (animation == null) return rest;
  return {
    ...rest,
    motionTiming: buildImageMotionTimingFromAnimationDefaults(animation),
  };
}
