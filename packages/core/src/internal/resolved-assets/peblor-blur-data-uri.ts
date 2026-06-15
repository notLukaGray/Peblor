/**
 * Build-time LQIP (Low Quality Image Placeholder) generator.
 *
 * Generates an SVG-based blur placeholder data URI that references a tiny
 * thumbnail URL (via the CDN proxy). The browser renders the tiny image
 * with a Gaussian blur filter, producing a smooth blur-up transition while
 * the full-resolution image loads.
 *
 * No build-time image processing required -- uses the same proxy/CDN
 * infrastructure already in place, with minimal dimensions requested so
 * the placeholder loads in a single round trip (~200 bytes).
 */

import { buildProxyUrl } from "../../lib/proxy-url";
import { normalizeImageTransformParams } from "../../lib/cdn-image-params";
import type { ImageTransformParams } from "../../lib/cdn-image-params";

const BLUR_PLACEHOLDER_QUALITY = 30;
const BLUR_PLACEHOLDER_MAX_DIM = 16;

function computeBlurDimensions(
  originalWidth: number | undefined,
  originalHeight: number | undefined
): { svgW: number; svgH: number; thumbW: number; thumbH: number } {
  if (
    originalWidth == null ||
    originalHeight == null ||
    !Number.isFinite(originalWidth) ||
    !Number.isFinite(originalHeight) ||
    originalWidth <= 0 ||
    originalHeight <= 0
  ) {
    // If exactly one dimension is known, use it as a square (1:1) so the
    // blur placeholder at least matches the known axis rather than using
    // an arbitrary 16:9 fallback from both being undefined.
    if (originalWidth != null && Number.isFinite(originalWidth) && originalWidth > 0) {
      return {
        svgW: originalWidth,
        svgH: originalWidth,
        thumbW: BLUR_PLACEHOLDER_MAX_DIM,
        thumbH: BLUR_PLACEHOLDER_MAX_DIM,
      };
    }
    if (originalHeight != null && Number.isFinite(originalHeight) && originalHeight > 0) {
      return {
        svgW: originalHeight,
        svgH: originalHeight,
        thumbW: BLUR_PLACEHOLDER_MAX_DIM,
        thumbH: BLUR_PLACEHOLDER_MAX_DIM,
      };
    }
    return { svgW: 16, svgH: 9, thumbW: 16, thumbH: 9 };
  }

  const aspect = originalWidth / originalHeight;
  let thumbW: number;
  let thumbH: number;
  if (aspect >= 1) {
    thumbW = BLUR_PLACEHOLDER_MAX_DIM;
    thumbH = Math.max(1, Math.round(BLUR_PLACEHOLDER_MAX_DIM / aspect));
  } else {
    thumbH = BLUR_PLACEHOLDER_MAX_DIM;
    thumbW = Math.max(1, Math.round(BLUR_PLACEHOLDER_MAX_DIM * aspect));
  }

  return { svgW: originalWidth, svgH: originalHeight, thumbW, thumbH };
}

/**
 * Extract all parseable pixel dimensions from a raw block value, preserving
 * breakpoint index order for responsive tuples.
 *
 * Examples of supported inputs:
 *   - `1200` (number) → `[1200]`
 *   - `"1200px"` → `[1200]`
 *   - `["375px", "768px", "1200px"]` → `[375, 768, 1200]`
 *   - `undefined` or `"100%"` → `[]`
 *
 * Callers pair width and height arrays by index so responsive breakpoint
 * indices stay aligned — max is NOT picked independently.
 */
function extractDimensions(value: unknown): number[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    const out: number[] = [];
    for (const v of value) {
      const px = parseSingleDimension(v);
      out.push(px ?? 0);
    }
    return out;
  }

  const px = parseSingleDimension(value);
  return px != null ? [px] : [];
}

/**
 * Pair width and height arrays by index and return the pair at the largest-width
 * breakpoint (typically desktop). Falls back to the first valid pair if no
 * width is parseable.
 */
function pickBestDimensionPair(
  widths: number[],
  heights: number[]
): { width: number | undefined; height: number | undefined } {
  const len = Math.min(widths.length, heights.length);
  if (len === 0) {
    // If only one dimension is available, return it so the caller can use
    // the known value rather than falling through to a hardcoded fallback.
    if (widths.length > 0) {
      return { width: widths[widths.length - 1], height: undefined };
    }
    if (heights.length > 0) {
      return { width: undefined, height: heights[heights.length - 1] };
    }
    return { width: undefined, height: undefined };
  }

  let bestIdx = 0;
  for (let i = 1; i < len; i++) {
    if (widths[i]! > widths[bestIdx]!) bestIdx = i;
  }

  const w = widths[bestIdx];
  const h = heights[bestIdx];
  return {
    width: w && w > 0 ? w : undefined,
    height: h && h > 0 ? h : undefined,
  };
}

function parseSingleDimension(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return undefined;
    // Skip relative units -- they can't give us a pixel aspect ratio
    if (
      trimmed.endsWith("%") ||
      trimmed.endsWith("vw") ||
      trimmed.endsWith("vh") ||
      trimmed.endsWith("rem") ||
      trimmed.endsWith("em") ||
      trimmed.endsWith("cqw") ||
      trimmed.endsWith("cqi")
    ) {
      return undefined;
    }
    const numeric = parseFloat(trimmed);
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : undefined;
  }
  return undefined;
}

/** XML-escape a string for safe embedding in an SVG attribute. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a blur placeholder data URI for an image asset.
 *
 * @param assetKey - Validated CDN asset key (e.g. "path/to/image.jpg")
 * @param elementObj - The element block object (used to read width/height for aspect ratio)
 * @returns A base64-encoded SVG data URI, or undefined if the asset key is empty
 */
export function buildBlurDataUri(
  assetKey: string,
  elementObj: Record<string, unknown>
): string | undefined {
  if (!assetKey) return undefined;

  // Pair width and height by responsive breakpoint index so we don't
  // cross-contaminate (e.g. desktop width + mobile height).
  const widths = extractDimensions(elementObj.width);
  const heights = extractDimensions(elementObj.height);
  const paired = pickBestDimensionPair(widths, heights);

  // Fall back to constraints if width/height are not parseable.
  let constraintsWidth: number | undefined;
  let constraintsHeight: number | undefined;
  const constraints = elementObj.constraints as
    | { maxWidth?: string; minHeight?: string; maxHeight?: string }
    | [
        { maxWidth?: string; minHeight?: string; maxHeight?: string },
        { maxWidth?: string; minHeight?: string; maxHeight?: string },
      ]
    | undefined;
  if (constraints) {
    const arr = Array.isArray(constraints) ? constraints : [constraints];
    for (const c of arr) {
      if (c && typeof c === "object") {
        if (c.maxWidth) {
          const px = parseSingleDimension(c.maxWidth);
          if (px != null && (constraintsWidth == null || px > constraintsWidth))
            constraintsWidth = px;
        }
        if (c.maxHeight) {
          const px = parseSingleDimension(c.maxHeight);
          if (px != null && (constraintsHeight == null || px > constraintsHeight))
            constraintsHeight = px;
        }
        if (c.minHeight) {
          const px = parseSingleDimension(c.minHeight);
          if (px != null && (constraintsHeight == null || px > constraintsHeight))
            constraintsHeight = px;
        }
      }
    }
  }

  const effectiveWidth = paired.width ?? constraintsWidth;
  const effectiveHeight = paired.height ?? constraintsHeight;

  const { svgW, svgH, thumbW, thumbH } = computeBlurDimensions(effectiveWidth, effectiveHeight);

  // Build a tiny thumbnail URL via the same proxy mechanism.
  const blurParams: ImageTransformParams = {
    width: String(thumbW),
    height: String(thumbH),
    quality: String(BLUR_PLACEHOLDER_QUALITY),
  };
  const normalizedParams = normalizeImageTransformParams(blurParams);
  const tinyUrl = buildProxyUrl(assetKey, normalizedParams);

  // Build an inline SVG that renders the tiny CDN image with a blur filter.
  // The browser resolves the proxy URL relative to the page origin, which works
  // correctly when the SVG is used as an `src` or `background-image` data URI.
  //
  // stdDeviation is scaled proportionally to the larger viewBox dimension so the
  // blur intensity is visually consistent regardless of original image size
  // (a fixed deviation of 20 would be invisible on an 8000px-wide image yet
  // overwhelm a 16px-wide one).
  const blurStdDev = Math.max(2, Math.round(Math.max(svgW, svgH) * 0.03));
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}">`,
    `<filter id="b"><feGaussianBlur stdDeviation="${blurStdDev}"/></filter>`,
    `<image preserveAspectRatio="xMidYMid slice" width="100%" height="100%"`,
    ` href="${xmlEscape(tinyUrl)}" filter="url(#b)"/>`,
    `</svg>`,
  ].join("");

  const base64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
