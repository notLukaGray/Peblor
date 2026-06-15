import type { CSSProperties } from "react";

export type BorderGradient = { stroke: string; width: string | number };

/**
 * Two-layer mask that punches the center out of a border-gradient ring, leaving only the
 * padding-width edge painted. Shared so the string isn't duplicated across overlay builders (C-22).
 */
const BORDER_GRADIENT_MASK = {
  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
} as const satisfies CSSProperties;

/**
 * Absolutely-positioned overlay that renders a gradient border ring on top of an element.
 * Used by ElementModule/ElementGroup/ElementInfiniteScroll containers and by the gesture
 * motion wrapper in ElementRenderer.
 */
export function buildBorderGradientOverlayStyle(
  borderGradient: BorderGradient,
  borderRadius: CSSProperties["borderRadius"] = "inherit"
): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    padding: borderGradient.width,
    borderRadius: borderRadius ?? "inherit",
    background: borderGradient.stroke,
    boxSizing: "border-box",
    pointerEvents: "none",
    ...BORDER_GRADIENT_MASK,
  };
}
