/**
 * Image fill extraction and asset export utilities.
 */

import type { ConversionContext } from "../types/figma-plugin";
import { buildAssetKey } from "../utils/asset-key";
import { extractSolidFill } from "./fills-solid";
import { extractGradientFill } from "./fills-gradient";

type SectionLayer = {
  fill?: string;
  blendMode?: string;
  opacity?: number;
};

/**
 * Returns the hash, scale mode, and image transform of the first visible IMAGE fill,
 * or `undefined` if no image fill is present.
 */
export function extractImageFill(fills: readonly Paint[]):
  | {
      hash: string;
      scaleMode: string;
      imageTransform: [[number, number, number], [number, number, number]] | undefined;
    }
  | undefined {
  for (const fill of fills) {
    if (fill.type === "IMAGE" && fill.visible !== false) {
      const hash = fill.imageHash;
      if (!hash) continue;
      const imageTransform = fill.imageTransform as
        | [[number, number, number], [number, number, number]]
        | undefined;
      return { hash, scaleMode: fill.scaleMode ?? "FILL", imageTransform };
    }
  }
  return undefined;
}

/**
 * Returns a CSS fill string for the first visible fill of any type.
 * Tries solid first, then gradient. Returns `undefined` if no fill found.
 */
export function extractFill(
  fills: readonly Paint[],
  size?: { width: number; height: number }
): string | undefined {
  return extractSolidFill(fills) ?? extractGradientFill(fills, size);
}

function paintToCssFill(
  paint: Paint,
  size?: { width: number; height: number }
): string | undefined {
  if (paint.type === "SOLID") return extractSolidFill([paint]);
  if (
    paint.type === "GRADIENT_LINEAR" ||
    paint.type === "GRADIENT_RADIAL" ||
    paint.type === "GRADIENT_ANGULAR" ||
    paint.type === "GRADIENT_DIAMOND"
  ) {
    return extractGradientFill([paint], size);
  }
  return undefined;
}

function readPaintOpacity(paint: Paint): number | undefined {
  const opaque = paint as Paint & { opacity?: number };
  if (typeof opaque.opacity !== "number" || !Number.isFinite(opaque.opacity)) return undefined;
  const o = Math.min(1, Math.max(0, opaque.opacity));
  if (Math.abs(o - 1) < 1e-6) return undefined;
  return o;
}

function figmaBlendModeToCss(mode?: BlendMode): string | undefined {
  if (!mode || mode === "NORMAL" || mode === "PASS_THROUGH") return undefined;
  const map: Partial<Record<BlendMode, string>> = {
    MULTIPLY: "multiply",
    SCREEN: "screen",
    OVERLAY: "overlay",
    DARKEN: "darken",
    LIGHTEN: "lighten",
    COLOR_DODGE: "color-dodge",
    COLOR_BURN: "color-burn",
    HARD_LIGHT: "hard-light",
    SOFT_LIGHT: "soft-light",
    DIFFERENCE: "difference",
    EXCLUSION: "exclusion",
    HUE: "hue",
    SATURATION: "saturation",
    COLOR: "color",
    LUMINOSITY: "luminosity",
  };
  return map[mode] ?? "normal";
}

/**
 * Extracts section-ready fill payload:
 * - single paint => `{ fill }`
 * - stacked paints or blend modes => `{ layers }`
 *
 * Layer order follows Figma paint order (bottom to top), which matches DOM
 * stacking in LayerStack where later nodes render on top.
 */
export function extractSectionFillPayload(
  fills: readonly Paint[],
  size?: { width: number; height: number }
): { fill?: string; layers?: SectionLayer[] } | undefined {
  const visible = fills.filter((fill) => fill.visible !== false);
  if (visible.length === 0) return undefined;

  const layers: SectionLayer[] = [];
  for (const paint of visible) {
    const cssFill = paintToCssFill(paint, size);
    if (!cssFill) continue;
    const blendMode = figmaBlendModeToCss((paint as Paint & { blendMode?: BlendMode }).blendMode);
    const opacity = readPaintOpacity(paint);
    layers.push({
      fill: cssFill,
      ...(blendMode ? { blendMode } : {}),
      ...(opacity !== undefined ? { opacity } : {}),
    });
  }

  if (layers.length === 0) return undefined;
  const hasLayerFeatures =
    layers.length > 1 ||
    layers.some((layer) => !!layer.blendMode) ||
    layers.some((layer) => layer.opacity !== undefined);
  if (!hasLayerFeatures) {
    return { fill: layers[0].fill };
  }
  return { layers };
}

/**
 * Extracts ALL visible fills and composes them into a CSS `background` shorthand.
 * Figma fills are ordered bottom-to-top; CSS background layers are top-to-bottom.
 */
export function extractMultipleFills(
  fills: readonly Paint[],
  size?: { width: number; height: number }
): { fill: string; hasMultiple: boolean; hasImageFill: boolean } | undefined {
  const visible = fills.filter((f) => f.visible !== false);
  if (visible.length === 0) return undefined;
  if (visible.length === 1) {
    const single = extractFill(visible, size);
    return single
      ? { fill: single, hasMultiple: false, hasImageFill: visible[0].type === "IMAGE" }
      : undefined;
  }

  const reversed = [...visible].reverse();
  const layers: string[] = [];
  let hasImageFill = false;

  for (const paint of reversed) {
    if (paint.type === "SOLID") {
      const css = extractFill([paint], size);
      if (css) layers.push(css);
    } else if (
      paint.type === "GRADIENT_LINEAR" ||
      paint.type === "GRADIENT_RADIAL" ||
      paint.type === "GRADIENT_ANGULAR" ||
      paint.type === "GRADIENT_DIAMOND"
    ) {
      const css = extractGradientFill([paint], size);
      if (css) layers.push(css);
    } else if (paint.type === "IMAGE") {
      hasImageFill = true;
    }
  }

  if (layers.length === 0) return undefined;

  return { fill: layers.join(", "), hasMultiple: true, hasImageFill };
}

/**
 * Maps a Figma image scale mode to the closest CSS object-fit value.
 */
export function figmaScaleModeToObjectFit(scaleMode: string): string {
  switch (scaleMode) {
    case "FILL":
      return "cover";
    case "FIT":
      return "contain";
    case "CROP":
      return "cover";
    case "TILE":
      return "cover";
    default:
      return "cover";
  }
}

/**
 * Exports the first visible IMAGE fill of a node as a binary asset.
 * Returns the CDN key or `undefined` when no IMAGE fill is found.
 */
export async function exportImageFillAsset(
  node: SceneNode,
  ctx: ConversionContext
): Promise<string | undefined> {
  const fills = "fills" in node ? (node.fills as Paint[]) : [];
  const imageFill = extractImageFill(fills);
  if (!imageFill) return undefined;

  const img = figma.getImageByHash(imageFill.hash);
  if (!img) {
    ctx.warnings.push(`[fills] Could not retrieve image fill by hash for node "${node.name}"`);
    return undefined;
  }

  try {
    const bytes = await img.getBytesAsync();
    const rawName = `${node.name || "section"}/bg`;
    const assetKey = buildAssetKey(rawName, ctx);
    ctx.assets.push({ filename: assetKey.filename, data: new Uint8Array(bytes) });
    return assetKey.cdnKey;
  } catch (err) {
    ctx.warnings.push(`[fills] Failed to export image fill for "${node.name}": ${String(err)}`);
    return undefined;
  }
}
