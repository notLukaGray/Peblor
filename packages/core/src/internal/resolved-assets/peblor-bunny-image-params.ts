import { getCoreGlobals } from "../../lib/globals";

export function normalizeAspectRatioForBunny(ratio: string | undefined): string | undefined {
  if (ratio == null || typeof ratio !== "string") return undefined;
  const trimmed = ratio.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\//g, ":");
}

function parseWidthToPx(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const s = String(value).trim().toLowerCase();
  const match = s.match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Math.round(Number(match[1])) : null;
}

function parseHeightToPx(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const s = String(value).trim().toLowerCase();
  const match = s.match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Math.round(Number(match[1])) : null;
}

export type BunnyImageParams = {
  width: number;
  quality: number;
  format: string;
  aspect_ratio?: string;
  height?: number;
  class?: string;
  widths?: number[];
};

function normalizeResponsiveWidth(width: number): number {
  return Math.max(1, Math.round(width));
}

function buildResponsiveWidthLadder(targetWidth: number, maxWidth: number): number[] {
  if (!Number.isFinite(targetWidth) || targetWidth <= 0) return [];
  const boundedMax = normalizeResponsiveWidth(Math.max(targetWidth, maxWidth));
  const candidates = [targetWidth / 2, targetWidth, targetWidth * 1.5, targetWidth * 2]
    .map(normalizeResponsiveWidth)
    .map((width) => Math.min(width, boundedMax));
  return Array.from(new Set(candidates)).sort((a, b) => a - b);
}

function collectWidthsHeightsFromBlock(obj: Record<string, unknown>): {
  widths: number[];
  heights: number[];
} {
  const widthRaw = obj.width as string | [string, string] | number | undefined;
  const heightRaw = obj.height as string | [string, string] | number | undefined;
  const constraintsRaw = obj.constraints as
    | { maxWidth?: string; minHeight?: string; maxHeight?: string }
    | [
        { maxWidth?: string; minHeight?: string; maxHeight?: string },
        { maxWidth?: string; minHeight?: string; maxHeight?: string },
      ]
    | undefined;
  const widths: number[] = [];
  const heights: number[] = [];
  if (widthRaw !== undefined) {
    const arr = Array.isArray(widthRaw) ? widthRaw : [widthRaw];
    for (const w of arr) {
      const px = parseWidthToPx(w);
      if (px != null) widths.push(px);
    }
  }
  if (heightRaw !== undefined) {
    const arr = Array.isArray(heightRaw) ? heightRaw : [heightRaw];
    for (const h of arr) {
      const px = parseHeightToPx(h);
      if (px != null) heights.push(px);
    }
  }
  if (constraintsRaw !== undefined && constraintsRaw !== null) {
    const arr = Array.isArray(constraintsRaw) ? constraintsRaw : [constraintsRaw];
    for (const c of arr) {
      if (c && typeof c === "object") {
        if (c.maxWidth) {
          const px = parseWidthToPx(c.maxWidth as string);
          if (px != null) widths.push(px);
        }
        if (c.minHeight) {
          const px = parseHeightToPx(c.minHeight as string);
          if (px != null) heights.push(px);
        }
        if (c.maxHeight) {
          const px = parseHeightToPx(c.maxHeight as string);
          if (px != null) heights.push(px);
        }
      }
    }
  }
  return { widths, heights };
}

export function getBunnyImageParams(
  obj: Record<string, unknown>,
  assetKey: string,
  options?: { isMobile?: boolean; containerWidthPx?: number }
): BunnyImageParams {
  const {
    imageDefaultWidth,
    imageDefaultPosterWidth,
    imagePosterWidth,
    imagePosterQuality,
    imageMobileMaxWidth,
    imageMobileMaxWidth2x,
    imageDefaultQuality,
    imageDefaultFormat,
    imageDefaultAspectRatio,
    imagePosterAspectRatio,
    imageClass,
    imagePosterClass,
  } = getCoreGlobals();

  const blockType = obj.type as string | undefined;
  const isPosterOrBackground =
    blockType === "backgroundVideo" ||
    blockType === "backgroundImage" ||
    (assetKey === "poster" &&
      (blockType === "backgroundVideo" || blockType === "backgroundTransition")) ||
    assetKey === "image";
  const isElementVideoPoster = blockType === "elementVideo" && assetKey === "poster";

  const useClass = isPosterOrBackground ? imagePosterClass : imageClass;
  if (useClass != null && useClass !== "") {
    return {
      width: isPosterOrBackground ? imagePosterWidth : imageDefaultWidth,
      quality: isPosterOrBackground ? imagePosterQuality : imageDefaultQuality,
      format: imageDefaultFormat,
      class: useClass,
    };
  }

  const quality = imageDefaultQuality;
  const format = imageDefaultFormat;
  const isMobile = options?.isMobile === true;

  let aspect_ratio: string | undefined;
  if (isPosterOrBackground) {
    aspect_ratio = normalizeAspectRatioForBunny(imagePosterAspectRatio ?? undefined) ?? undefined;
  } else {
    const blockAspect = obj.aspectRatio as string | undefined;
    aspect_ratio =
      normalizeAspectRatioForBunny(blockAspect) ??
      normalizeAspectRatioForBunny(imageDefaultAspectRatio ?? undefined) ??
      undefined;
  }

  if (isPosterOrBackground && !isElementVideoPoster) {
    return {
      width: imagePosterWidth,
      quality: imagePosterQuality,
      format,
      ...(aspect_ratio ? { aspect_ratio } : {}),
    };
  }

  const { widths, heights } = collectWidthsHeightsFromBlock(obj);
  const containerPx = options?.containerWidthPx;
  let width: number;
  if (widths.length > 0) {
    const objectFit = obj.objectFit as string | undefined;
    const aggWidth = objectFit === "fillHeight" ? Math.min(...widths) : Math.max(...widths);
    width = Math.min(aggWidth, imageDefaultPosterWidth);
  } else {
    // When container width is unknown (e.g. missing element context), use mobile max so we never request oversized
    const baseWidth =
      containerPx != null && Number.isFinite(containerPx)
        ? Math.round(containerPx)
        : isElementVideoPoster || blockType === "elementImage"
          ? imageMobileMaxWidth
          : isMobile
            ? imageMobileMaxWidth
            : imageDefaultWidth;
    width = baseWidth;
    if (isElementVideoPoster) {
      width = Math.min(width, imageDefaultPosterWidth);
      // Cap at 2x display size so we never request 2220px for 679px display
      if (containerPx != null && Number.isFinite(containerPx)) {
        width = Math.min(width, Math.min(containerPx * 2, imageDefaultPosterWidth));
      }
      // Hard cap for in-section posters: never exceed 2x mobile viewport
      width = Math.min(width, imageMobileMaxWidth2x);
    }
  }
  // Apply mobile cap in both branches so mobile never requests desktop-oversized images
  width = isMobile ? Math.min(width, imageMobileMaxWidth) : width;
  // Element images (in-section): hard cap so we never serve 2220px for ~679px display
  const isElementImage = blockType === "elementImage";
  if (isElementVideoPoster || isElementImage) {
    width = Math.min(width, imageMobileMaxWidth2x);
  }
  const height = heights.length > 0 ? Math.round(Math.max(...heights)) : undefined;
  const responsiveWidths =
    isElementImage && width > 0
      ? buildResponsiveWidthLadder(width, imageMobileMaxWidth2x)
      : undefined;

  return {
    width: Math.round(width),
    quality,
    format,
    ...(aspect_ratio ? { aspect_ratio } : {}),
    ...(height != null ? { height } : {}),
    ...(responsiveWidths && responsiveWidths.length > 1 ? { widths: responsiveWidths } : {}),
  };
}
