/**
 * Border and stroke extraction from Figma nodes.
 */

import { figmaRgbToHex } from "../utils/color";
import { toPx } from "../utils/css";

/** Output of extractBorderProps — all fields optional. */
export interface BorderProps {
  /** Uniform CSS border shorthand (e.g. "2px solid #ff0000"). */
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  /**
   * CSS outline — used when strokeAlign is OUTSIDE to approximate the visual.
   * Outline does not affect layout box size, which mirrors Figma's OUTSIDE behaviour.
   */
  outline?: string;
}

/**
 * Extracts stroke/border CSS props from a Figma node.
 * Maps Figma stroke properties to CSS border (uniform or per-side) or outline.
 * Returns an empty object when no visible solid strokes are present.
 *
 * Stroke alignment mapping:
 *  - INSIDE  → `border` (default CSS border is inset for block elements)
 *  - CENTER  → `border` (approximate — CSS has no centre-stroke concept)
 *  - OUTSIDE → `outline` (CSS outline draws outside the layout box, matching Figma)
 */
export function extractBorderProps(node: SceneNode & { strokes?: readonly Paint[] }): BorderProps {
  const strokes = (node as { strokes?: readonly Paint[] }).strokes;
  if (!strokes || strokes.length === 0) return {};

  // Find first visible SOLID stroke
  const solidStroke = strokes.find(
    (s): s is SolidPaint => s.type === "SOLID" && s.visible !== false
  );
  if (!solidStroke) return {};

  const { r, g, b } = solidStroke.color;
  const alpha = solidStroke.opacity !== undefined ? solidStroke.opacity : 1;
  const color = figmaRgbToHex(r, g, b, alpha < 0.99 ? alpha : undefined);

  // Dash style
  const dashes = (node as { strokeDashes?: number[] }).strokeDashes;
  const style = dashes && dashes.length > 0 ? "dashed" : "solid";

  // Stroke alignment
  const align: string = (node as { strokeAlign?: string }).strokeAlign ?? "INSIDE";

  // Check for individual per-side weights (FrameNode when sides differ)
  const topW = (node as { strokeTopWeight?: number }).strokeTopWeight;
  const rightW = (node as { strokeRightWeight?: number }).strokeRightWeight;
  const bottomW = (node as { strokeBottomWeight?: number }).strokeBottomWeight;
  const leftW = (node as { strokeLeftWeight?: number }).strokeLeftWeight;

  const hasIndividual =
    topW !== undefined || rightW !== undefined || bottomW !== undefined || leftW !== undefined;

  if (hasIndividual) {
    const result: BorderProps = {};
    if ((topW ?? 0) > 0) result.borderTop = `${toPx(topW!)} ${style} ${color}`;
    if ((rightW ?? 0) > 0) result.borderRight = `${toPx(rightW!)} ${style} ${color}`;
    if ((bottomW ?? 0) > 0) result.borderBottom = `${toPx(bottomW!)} ${style} ${color}`;
    if ((leftW ?? 0) > 0) result.borderLeft = `${toPx(leftW!)} ${style} ${color}`;
    return result;
  }

  // Uniform weight
  const weight = (node as { strokeWeight?: number }).strokeWeight ?? 1;
  if (weight <= 0) return {};

  const borderValue = `${toPx(weight)} ${style} ${color}`;

  if (align === "OUTSIDE") {
    return { outline: borderValue };
  }

  return { border: borderValue };
}
