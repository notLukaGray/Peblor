import type { CSSProperties } from "react";
import type { dividerLayer } from "@pb/contracts/types";

/** Apply fill to style when no layers; used by section components. Fill is applied after baseStyle so it is not overwritten. */
export function applySectionFillStyle(
  fill: string | undefined,
  layers: dividerLayer[] | undefined,
  baseStyle: CSSProperties
): CSSProperties {
  if (fill && !layers?.length) {
    return { ...baseStyle, background: fill };
  }
  return baseStyle;
}
