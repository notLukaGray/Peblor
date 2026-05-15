/**
 * Image node → elementImage converter.
 * Exports the node as PNG and stores it in ConversionContext.assets.
 */

import type { ElementImage, LayoutProps } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import type { GroupNodeParentCtx } from "./node-element-helpers";
import { extractLayoutProps } from "./layout";
import { extractNodeVisualEffects } from "./node-visual-effects";
import { figmaScaleModeToObjectFit, extractImageFill } from "./fills";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { buildAssetKey } from "../utils/asset-key";
import { extractComponentProps } from "./component-props";
import { parseAnnotations } from "./annotations";
import { extractImageCropParams } from "@figma-plugin/helpers";

// ---------------------------------------------------------------------------
// Aspect ratio helpers
// ---------------------------------------------------------------------------

/** Returns the greatest common divisor of two positive integers. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ---------------------------------------------------------------------------
// Object position helpers
// ---------------------------------------------------------------------------

/**
 * Extracts an approximate CSS `object-position` value from a Figma image
 * transform matrix.
 *
 * Figma's `imageTransform` is a 2×3 affine matrix:
 *   [[scaleX, skewX, tx], [skewY, scaleY, ty]]
 * where tx/ty are offsets in UV space (0–1, percentage of the container).
 *
 * Returns undefined when the position is close to the CSS default (50% 50%),
 * which avoids emitting noisy no-op values.
 */
function figmaTransformToObjectPosition(
  transform: [[number, number, number], [number, number, number]] | undefined
): string | undefined {
  if (!transform) return undefined;
  const tx = transform[0][2]; // x offset (0–1)
  const ty = transform[1][2]; // y offset (0–1)
  const xPct = Math.round(tx * 100);
  const yPct = Math.round(ty * 100);
  // Only emit if meaningfully different from center (50% 50%)
  if (Math.abs(xPct - 50) < 5 && Math.abs(yPct - 50) < 5) return undefined;
  return `${xPct}% ${yPct}%`;
}

function figmaCropTransformToObjectPosition(
  transform: [[number, number, number], [number, number, number]] | undefined,
  shapeWidth: number,
  shapeHeight: number
): string | undefined {
  if (!transform || shapeWidth <= 0 || shapeHeight <= 0) return undefined;
  try {
    const params = extractImageCropParams(
      shapeWidth,
      shapeHeight,
      transform as unknown as Transform
    );
    const cropWidth = params.size[0];
    const cropHeight = params.size[1];
    const cropX = params.position[0];
    const cropY = params.position[1];

    const denomX = shapeWidth - cropWidth;
    const denomY = shapeHeight - cropHeight;
    if (Math.abs(denomX) < 1e-6 || Math.abs(denomY) < 1e-6) return undefined;

    const xPct = (cropX / denomX) * 100;
    const yPct = (cropY / denomY) * 100;
    if (!Number.isFinite(xPct) || !Number.isFinite(yPct)) return undefined;

    const xf = parseFloat(xPct.toFixed(2));
    const yf = parseFloat(yPct.toFixed(2));
    return `${xf}% ${yf}%`;
  } catch {
    return undefined;
  }
}

/**
 * Computes a simplified CSS aspect-ratio string from node dimensions.
 * Only emits a ratio when both numbers simplify to ≤ 50 (avoids ugly fractions).
 * Returns `undefined` when the ratio is too complex or height is zero.
 *
 * Examples:
 *   1280 × 720  → "16/9"
 *   800  × 600  → "4/3"
 *   317  × 218  → undefined (stays ugly after simplification)
 */
function computeAspectRatio(width: number, height: number): string | undefined {
  if (height === 0) return undefined;
  const g = gcd(Math.round(width), Math.round(height));
  const rw = Math.round(width) / g;
  const rh = Math.round(height) / g;
  if (rw <= 50 && rh <= 50) {
    return `${rw}/${rh}`;
  }
  return undefined;
}

function firstResponsiveLength(value: LayoutProps["width"]): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parseCssPx(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Flex + overflow:hidden parents clip children to the content box; fixed px sizes
 * larger than the parent should fill the cell so the image can shrink like in Figma.
 */
function maybeExpandImageForClippedFlexParent(
  layout: Pick<LayoutProps, "width" | "height">,
  parentCtx?: GroupNodeParentCtx
): void {
  if (!parentCtx) return;
  if (parentCtx.layoutMode !== "HORIZONTAL" && parentCtx.layoutMode !== "VERTICAL") return;
  if (!parentCtx.parentClipsContent) return;
  const pw = parentCtx.parentWidth;
  const ph = parentCtx.parentHeight;
  if (
    pw == null ||
    ph == null ||
    !Number.isFinite(pw) ||
    !Number.isFinite(ph) ||
    pw <= 0 ||
    ph <= 0
  ) {
    return;
  }

  const w = parseCssPx(firstResponsiveLength(layout.width));
  const h = parseCssPx(firstResponsiveLength(layout.height));
  if (w == null || h == null) return;
  if (w <= pw && h <= ph) return;

  layout.width = "100%";
  layout.height = "100%";
}

// ---------------------------------------------------------------------------
// Converter
// ---------------------------------------------------------------------------

/**
 * Converts a Figma node that represents an image to an `elementImage` block.
 *
 * Handles two cases:
 * 1. Node has an IMAGE fill paint — exports the fill via `figma.getImageByHash`.
 * 2. Otherwise — exports the entire node as a PNG raster via `exportAsync`.
 *
 * Enhancements over the base export:
 * - `aspectRatio` computed from node dimensions (when the fraction simplifies cleanly).
 * - `objectPosition` derived from `imageTransform` when meaningfully off-center; falls back to "center" for CROP mode.
 * - Component props from INSTANCE nodes can override `alt` and `src`.
 *
 * Returns `null` if the node cannot be exported (e.g. no pixels to raster).
 */
export async function convertImageNode(
  node: SceneNode,
  ctx: ConversionContext,
  parentCtx?: GroupNodeParentCtx
): Promise<ElementImage | null> {
  const id = ensureUniqueId(slugify(node.name || "image"), ctx.usedIds);
  const layout = extractLayoutProps(node);
  const { boxShadow, filter, backdropFilter, glassEffect } = await extractNodeVisualEffects(node);
  if (boxShadow) layout.boxShadow = boxShadow;
  if (filter) layout.filter = filter;
  if (backdropFilter) {
    layout.backdropFilter = backdropFilter;
    layout.WebkitBackdropFilter = backdropFilter;
  }
  if (glassEffect) layout.effects = [glassEffect];

  // Attempt to use an IMAGE fill for higher-fidelity export
  const fills = "fills" in node ? (node.fills as Paint[]) : [];
  const imageFill = extractImageFill(fills);

  let filename: string;
  let cdnKey: string;
  let data: Uint8Array;
  let objectFit: string | undefined;
  let objectPosition: string | undefined;

  if (ctx.skipAssets) {
    // Copy-JSON mode: derive CDN key from node name without exporting binary data
    const assetKey = buildAssetKey(node.name || "image", ctx);
    filename = assetKey.filename;
    cdnKey = assetKey.cdnKey;
    data = new Uint8Array(0);
    if (imageFill) {
      objectFit = figmaScaleModeToObjectFit(imageFill.scaleMode);
      const transformDerived = figmaTransformToObjectPosition(imageFill.imageTransform);
      const cropDerived = figmaCropTransformToObjectPosition(
        imageFill.imageTransform,
        "width" in node ? node.width : 0,
        "height" in node ? node.height : 0
      );
      if (imageFill.scaleMode === "CROP") {
        objectPosition = cropDerived ?? transformDerived ?? "center";
      } else if (transformDerived) {
        objectPosition = transformDerived;
      }
    }
  } else if (imageFill) {
    const img = figma.getImageByHash(imageFill.hash);
    if (!img) {
      ctx.warnings.push(`[image] Could not retrieve image by hash for node "${node.name}"`);
      return null;
    }

    try {
      const bytes = await img.getBytesAsync();
      const assetKey = buildAssetKey(node.name || "image", ctx);
      filename = assetKey.filename;
      cdnKey = assetKey.cdnKey;
      data = new Uint8Array(bytes);
      objectFit = figmaScaleModeToObjectFit(imageFill.scaleMode);

      // Extract object-position from image transform (works for all scale modes)
      const transformDerived = figmaTransformToObjectPosition(imageFill.imageTransform);
      const cropDerived = figmaCropTransformToObjectPosition(
        imageFill.imageTransform,
        "width" in node ? node.width : 0,
        "height" in node ? node.height : 0
      );

      if (imageFill.scaleMode === "CROP") {
        // CSS cannot reproduce Figma's crop transform exactly — use the derived position
        // when it's meaningfully off-center, otherwise fall back to "center".
        objectPosition = cropDerived ?? transformDerived ?? "center";
        if (imageFill.imageTransform) {
          try {
            const cropParams = extractImageCropParams(
              "width" in node ? node.width : 0,
              "height" in node ? node.height : 0,
              imageFill.imageTransform as unknown as Transform
            );
            if (Math.abs(cropParams.rotation) > 0.5) {
              ctx.warnings.push(
                `[image] Node "${node.name}" uses rotated CROP transform (${cropParams.rotation.toFixed(2)}deg) — CSS export approximates position only.`
              );
            }
          } catch {
            // no-op
          }
        }
        ctx.warnings.push(
          `[image] Node "${node.name}" uses CROP scale mode — objectPosition approximated from imageTransform. Manual adjustment may be needed.`
        );
      } else if (transformDerived) {
        objectPosition = transformDerived;
      }
    } catch (err) {
      ctx.warnings.push(`[image] Failed to get image bytes for "${node.name}": ${String(err)}`);
      return null;
    }
  } else {
    // Rasterise the full node
    try {
      const bytes = await node.exportAsync({ format: "PNG" });
      const assetKey = buildAssetKey(node.name || "image", ctx);
      filename = assetKey.filename;
      cdnKey = assetKey.cdnKey;
      data = new Uint8Array(bytes);
      objectFit = undefined;
    } catch (err) {
      ctx.warnings.push(`[image] Export failed for "${node.name}": ${String(err)}`);
      return null;
    }
  }

  // Only push asset bytes when not in skipAssets mode
  if (!ctx.skipAssets) {
    ctx.assets.push({ filename, data });
  }

  // Aspect ratio — only emit when ratio simplifies cleanly (both parts ≤ 50)
  const nodeWidth = "width" in node ? (node as { width: number }).width : 0;
  const nodeHeight = "height" in node ? (node as { height: number }).height : 0;
  const aspectRatio = computeAspectRatio(nodeWidth, nodeHeight);

  const result: ElementImage = {
    type: "elementImage",
    id,
    src: cdnKey,
    alt: node.name,
    ...(objectFit ? { objectFit: objectFit as ElementImage["objectFit"] } : {}),
    ...(objectPosition ? { objectPosition } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
    ...layout,
  };

  maybeExpandImageForClippedFlexParent(result, parentCtx);

  // Annotation-based objectPosition override: [pb: objectPosition=top] or
  // [pb: objectPosition=center center]. Annotation wins over transform-derived value.
  const annotations = parseAnnotations(node.name || "");
  if (annotations.objectposition) {
    result.objectPosition = annotations.objectposition;
  }

  // Apply component props for INSTANCE nodes — these can override derived values
  if (node.type === "INSTANCE") {
    const compProps = extractComponentProps(node as InstanceNode);
    if (compProps.alt) result.alt = compProps.alt;
    if (compProps.src) result.src = compProps.src;
  }

  return result;
}
