/**
 * Helpers that apply derived text style and content properties to
 * already-constructed element objects in-place.
 */

import type { ElementHeading, ElementBody, ElementLink } from "../types/peblor";
import { extractGradientFill } from "./fills";
import { figmaRgbToHex } from "../utils/color";
import { parseAnnotations } from "./annotations";

/**
 * Reads textTruncation, maxLines, and textAutoResize from the Figma
 * TextNode and applies them to the element in-place.
 */
export function applyTextTruncation(node: TextNode, element: Record<string, unknown>): void {
  if (typeof node.maxLines === "number" && node.maxLines > 0) {
    element.maxLines = node.maxLines;
  }

  if (node.textTruncation === "ENDING") {
    element.textOverflow = "ellipsis";
    if (!element.maxLines) {
      element.maxLines = 1;
    }
  }

  const tar = node.textAutoResize;
  if (tar === "HEIGHT" || tar === "WIDTH_AND_HEIGHT") {
    if (tar === "WIDTH_AND_HEIGHT") delete element.width;
    delete element.height;
  }
}

/**
 * Extracts the text fill color from a TextNode and writes it to
 * `element.wrapperStyle.color`. Skips pure black and pure white.
 * For gradient fills, applies the CSS background-clip text trick.
 */
export function applyTextFillColor(
  node: TextNode,
  element: ElementHeading | ElementBody | ElementLink
): void {
  const textFills = node.fills;
  if (!Array.isArray(textFills) || textFills.length === 0) return;

  const solidFill = textFills.find((f: Paint) => f.type === "SOLID" && f.visible !== false) as
    | SolidPaint
    | undefined;

  if (solidFill) {
    const { r, g, b } = solidFill.color;
    const alpha = solidFill.opacity !== undefined ? solidFill.opacity : 1;
    const colorHex = figmaRgbToHex(r, g, b, alpha < 0.99 ? alpha : undefined);
    if (!element.wrapperStyle) element.wrapperStyle = {};
    element.wrapperStyle["color"] = colorHex;
    return;
  }

  const gradientCss = extractGradientFill(textFills as readonly Paint[], {
    width: node.width,
    height: node.height,
  });
  if (gradientCss) {
    if (!element.wrapperStyle) element.wrapperStyle = {};
    element.wrapperStyle["background"] = gradientCss;
    element.wrapperStyle["-webkit-background-clip"] = "text";
    element.wrapperStyle["-webkit-text-fill-color"] = "transparent";
    element.wrapperStyle["color"] = "transparent";
  }
}

/**
 * Reads `[pb: contentKey=... variableKey=...]` annotations from the node name
 * and applies them to the element.
 */
export function applyTextAnnotations(
  node: TextNode,
  element: ElementHeading | ElementBody | ElementLink
): void {
  const annotations = parseAnnotations(node.name ?? "");

  if (annotations["variablekey"]) {
    (element as unknown as Record<string, unknown>)["variableKey"] = annotations["variablekey"];
  }

  if (annotations["contentkey"]) {
    if (!element.wrapperStyle) element.wrapperStyle = {};
    element.wrapperStyle["data-content-key"] = annotations["contentkey"];
  }
}
