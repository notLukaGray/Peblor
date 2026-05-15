/**
 * Vector/Boolean node → elementSVG converter.
 * Exports the node as an SVG string via the Figma API.
 */

import type { ElementSVG } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { extractLayoutProps } from "./layout";
import { extractNodeVisualEffects } from "./node-visual-effects";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { inferGlassClipPathFromSvgMarkup } from "./glass-clip-path";

/**
 * Converts a VECTOR or BOOLEAN_OPERATION node to an `elementSVG` block.
 *
 * Uses `exportAsync({ format: "SVG_STRING" })` to get inline SVG markup
 * that can be embedded directly in the peblor JSON.
 *
 * The SVG is NOT written to assets — it is inlined as markup.
 * Returns `null` if export fails.
 */
export async function convertVectorNode(
  node: SceneNode,
  ctx: ConversionContext
): Promise<ElementSVG | null> {
  const id = ensureUniqueId(slugify(node.name || "vector"), ctx.usedIds);
  const layout = extractLayoutProps(node);
  // SVG export includes node transforms in markup, so avoid double-applying rotation.
  delete layout.rotate;
  const { boxShadow, filter, backdropFilter, glassEffect } = await extractNodeVisualEffects(node);
  if (boxShadow) layout.boxShadow = boxShadow;
  if (filter) layout.filter = filter;
  if (backdropFilter) {
    layout.backdropFilter = backdropFilter;
    layout.WebkitBackdropFilter = backdropFilter;
  }
  if (glassEffect) layout.effects = [glassEffect];

  let markup: string;

  try {
    const svgBytes = await node.exportAsync({ format: "SVG_STRING" });
    // exportAsync with SVG_STRING returns a string, not Uint8Array
    markup = svgBytes as unknown as string;
  } catch (err) {
    ctx.warnings.push(`[vector] SVG export failed for "${node.name}": ${String(err)}`);
    return null;
  }

  if (!markup || typeof markup !== "string") {
    ctx.warnings.push(`[vector] Empty SVG result for "${node.name}"`);
    return null;
  }

  if (glassEffect && typeof glassEffect.clipPath !== "string") {
    const clipPathFromMarkup = inferGlassClipPathFromSvgMarkup(markup);
    if (clipPathFromMarkup) {
      layout.effects = [{ ...glassEffect, ...clipPathFromMarkup }];
    }
  }

  const result: ElementSVG = {
    type: "elementSVG",
    id,
    markup,
    ariaLabel: node.name,
    ...layout,
  };

  return result;
}
