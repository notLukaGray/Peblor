import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import {
  getElementLayoutStyle,
  getElementTransformStyle,
  type ElementLayoutTransformOptions,
} from "@pb/core/layout";
import { resolveElementImageLink } from "./element-image-link";

type ElementImageProps = Extract<ElementBlock, { type: "elementImage" }>;

function buildImageFilterCss(
  imageFilters: ElementImageProps["imageFilters"] | undefined
): string | undefined {
  if (!imageFilters) return undefined;
  const parts: string[] = [];
  const { brightness, contrast, saturate, blur, grayscale, sepia, hueRotate, invert } =
    imageFilters;

  if (brightness !== undefined && brightness !== 1) {
    parts.push(`brightness(${brightness * 100}%)`);
  }
  if (contrast !== undefined && contrast !== 1) {
    parts.push(`contrast(${contrast * 100}%)`);
  }
  if (saturate !== undefined && saturate !== 1) {
    parts.push(`saturate(${saturate * 100}%)`);
  }
  if (blur !== undefined && blur !== 0) {
    parts.push(`blur(${blur}px)`);
  }
  if (grayscale !== undefined && grayscale !== 0) {
    parts.push(`grayscale(${grayscale * 100}%)`);
  }
  if (sepia !== undefined && sepia !== 0) {
    parts.push(`sepia(${sepia * 100}%)`);
  }
  if (hueRotate !== undefined && hueRotate !== 0) {
    parts.push(`hue-rotate(${hueRotate}deg)`);
  }
  if (invert !== undefined && invert !== 0) {
    parts.push(`invert(${invert * 100}%)`);
  }

  return parts.length > 0 ? parts.join(" ") : undefined;
}

function composeTransform(
  existingTransform: CSSProperties["transform"] | undefined,
  transformToAppend: string
): string {
  if (typeof existingTransform !== "string" || existingTransform.trim() === "") {
    return transformToAppend;
  }
  return `${existingTransform} ${transformToAppend}`;
}

function applyImageCropToImageStyles(
  target: CSSProperties,
  imageCrop: NonNullable<ElementImageProps["imageCrop"]> | undefined,
  objectFit: ElementImageProps["objectFit"] | undefined
): void {
  const fit = objectFit ?? "cover";
  if (fit === "crop") {
    const c = imageCrop ?? { x: 0, y: 0, scale: 1 };
    const x = Number(c.x ?? 0);
    const y = Number(c.y ?? 0);
    const scaleRaw = Number(c.scale ?? 1);
    const scale = Number.isFinite(scaleRaw) ? Math.min(4, Math.max(1, scaleRaw)) : 1;
    target.objectPosition = "50% 50%";
    target.transform = `translate(${x}%, ${y}%) scale(${scale})`;
    target.transformOrigin = "center center";
    return;
  }
  if (!imageCrop || typeof imageCrop !== "object") return;
  if (fit !== "cover" && fit !== "contain") return;
  const x = Number(imageCrop.x ?? 0);
  const y = Number(imageCrop.y ?? 0);
  const scaleRaw = Number(imageCrop.scale ?? 1);
  const scale = Number.isFinite(scaleRaw) ? Math.min(4, Math.max(1, scaleRaw)) : 1;
  target.objectPosition = "50% 50%";
  target.transform = `translate(${x}%, ${y}%) scale(${scale})`;
  target.transformOrigin = "center center";
}

type ComputedElementImagePresentation = {
  fillHeight: boolean;
  hasSource: boolean;
  useIntrinsicSizing: boolean;
  effectiveMinHeight: string | undefined;
  imgStyle: CSSProperties;
  fillImgStyle: CSSProperties;
  nextImageFillStyle: CSSProperties;
  figureStyle: CSSProperties;
  contentWrapperStyle: CSSProperties;
  figureClassName: string;
  resolvedHref: string | null;
  isInternal: boolean;
  imageFrameStyle: CSSProperties;
};

export function computeElementImagePresentation(
  props: Partial<ElementImageProps> & Pick<ElementImageProps, "type" | "src" | "alt">
): ComputedElementImagePresentation {
  const {
    src,
    width,
    height,
    borderRadius,
    constraints,
    align,
    alignY,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    overflow,
    hidden,
    objectFit = "cover",
    objectPosition,
    rotate,
    flipHorizontal = false,
    flipVertical = false,
    link,
    aspectRatio,
    figmaConstraints,
    imageCrop,
    imageFilters,
    fillOpacity,
    imageRotation,
  } = props;

  const fillHeight = height === "100%";
  const layoutStyle: CSSProperties = getElementLayoutStyle({
    width,
    height: fillHeight ? undefined : height,
    borderRadius,
    constraints,
    align,
    alignY,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
    figmaConstraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    overflow,
    hidden,
  });

  const innerStyle: CSSProperties = {
    ...getElementTransformStyle({
      width,
      height,
      align,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      rotate,
      flipHorizontal,
      flipVertical,
    } as ElementLayoutTransformOptions),
  };

  if (fillHeight) innerStyle.height = "100%";

  const isFillWidth = objectFit === "fillWidth";
  const isFillHeight = objectFit === "fillHeight";
  const isCropFit = objectFit === "crop";
  if (isFillWidth) {
    innerStyle.height = "auto";
    innerStyle.alignItems = "stretch";
  }
  if (isFillHeight) innerStyle.width = "100%";

  const resolvedObjectPosition =
    objectPosition ??
    (align === "left" ? "left center" : align === "right" ? "right center" : "50% 50%");

  const imgStyle: CSSProperties = {
    display: "block",
    maxWidth: "100%",
    maxHeight: "100%",
  };
  if (objectFit === "cover" || objectFit === "contain" || isCropFit) {
    imgStyle.width = "100%";
    imgStyle.height = "100%";
    imgStyle.objectFit = isCropFit ? "cover" : objectFit;
    imgStyle.objectPosition = isCropFit ? "50% 50%" : resolvedObjectPosition;
  } else if (isFillWidth) {
    imgStyle.width = "100%";
    imgStyle.height = "auto";
  } else if (isFillHeight) {
    imgStyle.height = "100%";
    imgStyle.width = "auto";
  } else {
    imgStyle.width = "100%";
    imgStyle.height = "100%";
    imgStyle.objectFit = "cover";
    imgStyle.objectPosition = resolvedObjectPosition;
  }

  applyImageCropToImageStyles(imgStyle, imageCrop, objectFit);

  const nextImageFillStyle: CSSProperties = {
    display: "block",
    objectFit:
      objectFit === "cover" || objectFit === "contain"
        ? objectFit
        : objectFit === "crop"
          ? "cover"
          : "cover",
    objectPosition: isCropFit ? "50% 50%" : resolvedObjectPosition,
  };

  applyImageCropToImageStyles(nextImageFillStyle, imageCrop, objectFit);

  const hasSource = src != null && String(src).trim() !== "";
  const useIntrinsicSizing = height === "hug" || fillHeight;
  const fillImgStyle: CSSProperties =
    fillHeight && useIntrinsicSizing
      ? {
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: objectFit === "contain" ? "contain" : objectFit === "crop" ? "cover" : "cover",
          objectPosition: isCropFit ? "50% 50%" : resolvedObjectPosition,
        }
      : imgStyle;

  if (fillHeight && useIntrinsicSizing) {
    applyImageCropToImageStyles(fillImgStyle, imageCrop, objectFit);
  }

  const imageFilterCss = buildImageFilterCss(imageFilters);
  const shouldApplyFillOpacity = fillOpacity !== undefined && fillOpacity !== 1;
  const shouldApplyImageRotation = imageRotation !== undefined && imageRotation !== 0;
  const imageStyleTargets = [imgStyle, fillImgStyle, nextImageFillStyle].filter(
    (style, index, all) => all.indexOf(style) === index
  );

  for (const targetStyle of imageStyleTargets) {
    if (imageFilterCss !== undefined) {
      targetStyle.filter = imageFilterCss;
    }
    if (shouldApplyFillOpacity) {
      targetStyle.opacity = fillOpacity;
    }
    if (shouldApplyImageRotation) {
      targetStyle.transform = composeTransform(
        targetStyle.transform,
        `rotate(${imageRotation}deg)`
      );
    }
    // iOS WebKit drops images that mount inside an opacity/transform-animating
    // ancestor during a client navigation — onError never fires, the layer just
    // paints blank. Promoting the img to its own compositing layer avoids it.
    targetStyle.transform = composeTransform(targetStyle.transform, "translateZ(0)");
  }

  const effectiveMinHeight =
    constraints && !Array.isArray(constraints) ? constraints.minHeight : undefined;

  const cssAspectRatio: CSSProperties["aspectRatio"] =
    aspectRatio == null
      ? undefined
      : Array.isArray(aspectRatio)
        ? `${aspectRatio[0]}/${aspectRatio[1]}`
        : aspectRatio;

  /** Only suppress aspect for full-bleed fill (`width` + `height` both `100%`). `fillHeight` already implies `height === "100%"`. */
  const suppressAspectForFullBleedFill =
    fillHeight && typeof width === "string" && width.trim() === "100%";

  /**
   * Aspect-ratio sizing needs a definite inline size. In a flex row, `width: auto` + `min-width: 0`
   * can shrink the figure to 0 so `next/image` `fill` has no layout box (dev preview + real layouts).
   */
  const aspectDrivenFigure =
    cssAspectRatio != null && !suppressAspectForFullBleedFill && !fillHeight;

  const aspectFigureWidth =
    layoutStyle.width != null &&
    String(layoutStyle.width).trim() !== "" &&
    layoutStyle.width !== "auto"
      ? layoutStyle.width
      : "100%";

  const figureStyle: CSSProperties = {
    ...layoutStyle,
    ...(cssAspectRatio != null && !suppressAspectForFullBleedFill
      ? { aspectRatio: cssAspectRatio }
      : {}),
    ...(aspectDrivenFigure
      ? {
          width: aspectFigureWidth,
          maxWidth: layoutStyle.maxWidth ?? "100%",
          minWidth: layoutStyle.minWidth ?? 0,
        }
      : {}),
    ...(fillHeight
      ? {
          height: "100%",
          ...(effectiveMinHeight != null ? { minHeight: effectiveMinHeight } : { minHeight: 0 }),
          alignSelf: "stretch",
        }
      : effectiveMinHeight != null
        ? { minHeight: effectiveMinHeight }
        : {}),
  };

  const { resolvedHref, isInternal } = resolveElementImageLink(link);

  const contentWrapperStyle: CSSProperties = {
    ...innerStyle,
    width: innerStyle.width ?? "100%",
    ...(useIntrinsicSizing && !fillHeight ? {} : { height: innerStyle.height ?? "100%" }),
  };

  const imageFrameStyle: CSSProperties = {
    position: useIntrinsicSizing && !fillHeight ? "static" : "relative",
    display: "block",
    width: "100%",
    height: useIntrinsicSizing && !fillHeight ? "auto" : "100%",
    overflow: "hidden",
    ...(fillHeight
      ? effectiveMinHeight != null
        ? { minHeight: effectiveMinHeight }
        : {}
      : effectiveMinHeight != null && !useIntrinsicSizing
        ? { minHeight: effectiveMinHeight }
        : {}),
  };

  const figureClassName =
    fillHeight && effectiveMinHeight != null
      ? "m-0 min-h-0 min-w-0 overflow-hidden"
      : fillHeight
        ? "m-0 min-h-0 min-w-0 overflow-hidden"
        : "m-0 shrink-0 overflow-hidden";

  return {
    fillHeight,
    hasSource,
    useIntrinsicSizing,
    effectiveMinHeight,
    imgStyle,
    fillImgStyle,
    nextImageFillStyle,
    figureStyle,
    contentWrapperStyle,
    figureClassName,
    resolvedHref,
    isInternal,
    imageFrameStyle,
  };
}
