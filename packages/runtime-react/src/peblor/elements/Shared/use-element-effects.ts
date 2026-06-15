"use client";

import { useMemo } from "react";
import { lowerThemeValueDeep } from "@/peblor/theme/theme-string";
import { coerceSectionEffects } from "@/peblor/elements/ElementModule/element-module-style-utils";
import type { SectionEffect } from "@pb/contracts/peblor/core/peblor-schemas";

/**
 * Resolves theme values and coerces section effects into their runtime representation.
 * Returns the coerced effects array along with boolean flags for glass effects.
 */
export function useElementEffects(effects?: SectionEffect[]) {
  const resolvedEffects = useMemo(() => lowerThemeValueDeep(effects) as typeof effects, [effects]);
  const coercedEffects = useMemo(() => coerceSectionEffects(resolvedEffects), [resolvedEffects]);
  const hasGlassEffect =
    coercedEffects?.some((effect: SectionEffect) => effect.type === "glass") ?? false;
  return { resolvedEffects: coercedEffects, hasGlassEffect } as const;
}

/**
 * Checks whether an interactions object has any registered interaction handlers.
 */
export function hasElementInteractions(interactions?: {
  onClick?: unknown;
  onHoverEnter?: unknown;
  onHoverLeave?: unknown;
  onPointerDown?: unknown;
  onPointerUp?: unknown;
  onDoubleClick?: unknown;
}): boolean {
  return !!(
    interactions?.onClick ||
    interactions?.onHoverEnter ||
    interactions?.onHoverLeave ||
    interactions?.onPointerDown ||
    interactions?.onPointerUp ||
    interactions?.onDoubleClick
  );
}
