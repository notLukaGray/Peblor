/**
 * CSS value formatter utilities.
 */

/** Appends "px" to a number. `24 → "24px"` */
export function toPx(value: number): string {
  return `${value}px`;
}

/** Converts pixels to rem. `24 → "1.5rem"` (base 16 by default) */
export function toRem(value: number, base = 16): string {
  return `${(value / base).toFixed(4).replace(/\.?0+$/, "")}rem`;
}

/**
 * Reads cornerRadius (or per-corner values when mixed) from a Figma node
 * and returns a CSS border-radius shorthand string.
 *
 * Figma per-corner order: topLeft, topRight, bottomRight, bottomLeft.
 * CSS shorthand order:    topLeft, topRight, bottomRight, bottomLeft.
 */
export function figmaRadiusToCSS(
  node: RectangleNode | FrameNode | ComponentNode | InstanceNode
): string {
  const radius = node.cornerRadius;

  if (radius === figma.mixed) {
    // Per-corner values — cast to access individual properties
    const tl = (node as FrameNode).topLeftRadius ?? 0;
    const tr = (node as FrameNode).topRightRadius ?? 0;
    const br = (node as FrameNode).bottomRightRadius ?? 0;
    const bl = (node as FrameNode).bottomLeftRadius ?? 0;

    // If all equal, collapse to single value
    if (tl === tr && tr === br && br === bl) {
      return toPx(tl);
    }

    return `${toPx(tl)} ${toPx(tr)} ${toPx(br)} ${toPx(bl)}`;
  }

  return toPx(radius);
}
