"use client";

import Image from "next/image";
import { TransitionLink } from "./Shared/TransitionLink";
import { useState, useCallback, useMemo, useRef } from "react";
import type { ElementBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { useBrowserData } from "@pb/runtime-react/core/hooks/use-browser-data";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { computeElementImagePresentation } from "./ElementImage/element-image-presentation";
import { firePeblorAction } from "@/peblor/triggers";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";
import { useElementEffects } from "@/peblor/elements/Shared/use-element-effects";
import type { CSSProperties } from "react";
import { globals } from "@pb/runtime-react/core/lib/globals";
import {
  isApprovedAssetUrl,
  THIRD_PARTY_ASSET_MESSAGE,
} from "@pb/runtime-react/core/lib/asset-host";

const ELEMENT_IMAGE_INTERACTION_HANDLERS_NONE: Record<string, never> = {};

type Props = Extract<ElementBlock, { type: "elementImage" }>;

export function ElementImage({
  src,
  alt,
  width,
  height,
  borderRadius,
  constraints,
  selfAlign,
  alignY,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  objectFit = "cover",
  objectPosition,
  imageCrop,
  imageFilters,
  fillOpacity,
  imageRotation,
  rotate,
  flipHorizontal = false,
  flipVertical = false,
  link,
  aspectRatio,
  figmaConstraints,
  effects,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  scroll,
  hidden,
  priority,
  loading,
  decoding,
  srcSet,
  sizes,
  blurDataURL,
  aria,
  tabIndex,
  role,
  interactions,
}: Props) {
  const [hasError, setHasError] = useState(false);
  const [fallbackToNativeImg, setFallbackToNativeImg] = useState(false);
  const figureRef = useRef<HTMLElement | null>(null);
  const { resolvedEffects: imageEffects, hasGlassEffect } = useElementEffects(effects);
  const resolvedWrapperStyle = lowerThemeStyleObject(
    wrapperStyle as Record<string, unknown> | undefined
  ) as typeof wrapperStyle;
  const { isMobile } = useDeviceType();
  const browserData = useBrowserData();
  const resolvedAspectRatio = resolveResponsiveValue(aspectRatio, isMobile);
  const resolvedObjectFit = resolveResponsiveValue(objectFit, isMobile) ?? "cover";
  const measuredViewportSizes =
    browserData && browserData.viewportWidthPx > 0
      ? `${Math.round(browserData.viewportWidthPx)}px`
      : undefined;
  const resolvedSizes =
    sizes ??
    measuredViewportSizes ??
    `(max-width: ${globals.uiBreakpointDesktopPx}px) 100vw, (max-width: 1200px) 80vw, 1200px`;

  const handleNativeImgError = useCallback(() => {
    setHasError(true);
  }, []);
  const handleNextImageError = useCallback(() => {
    setFallbackToNativeImg(true);
  }, []);
  const handleImgLoad = useCallback(() => {
    setHasError(false);
    setFallbackToNativeImg(false);
  }, []);
  const {
    fillHeight,
    hasSource,
    useIntrinsicSizing,
    imgStyle,
    fillImgStyle,
    nextImageFillStyle,
    figureStyle,
    contentWrapperStyle,
    figureClassName,
    resolvedHref,
    isInternal,
    imageFrameStyle,
  } = computeElementImagePresentation({
    type: "elementImage",
    src,
    alt,
    width,
    height,
    borderRadius,
    constraints,
    selfAlign,
    alignY,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    layer,
    objectFit: resolvedObjectFit,
    objectPosition,
    imageCrop,
    imageFilters,
    fillOpacity,
    imageRotation,
    rotate,
    flipHorizontal,
    flipVertical,
    link,
    aspectRatio: resolvedAspectRatio,
    figmaConstraints,
    effects: imageEffects,
    wrapperStyle: resolvedWrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    bgBlur,
    scroll,
    hidden,
  });
  const showError = hasError && hasSource;
  const showImage = !showError && hasSource;
  const isBlobSrc = typeof src === "string" && src.startsWith("blob:");
  const usePlainImg = fallbackToNativeImg || useIntrinsicSizing;
  const resolvedTarget = link?.target ?? (!isInternal && resolvedHref ? "_blank" : undefined);
  const resolvedRel =
    link?.rel ??
    (!isInternal && resolvedHref
      ? "noopener noreferrer"
      : resolvedTarget === "_blank"
        ? "noopener noreferrer"
        : undefined);

  const interactionHandlers = useMemo(() => {
    const has = !!(
      interactions?.onClick ||
      interactions?.onHoverEnter ||
      interactions?.onHoverLeave ||
      interactions?.onPointerDown ||
      interactions?.onPointerUp ||
      interactions?.onDoubleClick
    );
    if (!has) return ELEMENT_IMAGE_INTERACTION_HANDLERS_NONE;
    return {
      onClick: interactions?.onClick
        ? () => firePeblorAction(interactions.onClick!, "trigger")
        : undefined,
      onPointerEnter: interactions?.onHoverEnter
        ? () => firePeblorAction(interactions.onHoverEnter!, "trigger")
        : undefined,
      onPointerLeave: interactions?.onHoverLeave
        ? () => firePeblorAction(interactions.onHoverLeave!, "trigger")
        : undefined,
      onPointerDown: interactions?.onPointerDown
        ? () => firePeblorAction(interactions.onPointerDown!, "trigger")
        : undefined,
      onPointerUp: interactions?.onPointerUp
        ? () => firePeblorAction(interactions.onPointerUp!, "trigger")
        : undefined,
      onDoubleClick: interactions?.onDoubleClick
        ? () => firePeblorAction(interactions.onDoubleClick!, "trigger")
        : undefined,
      style: {
        cursor: interactions?.cursor ?? (interactions?.onClick ? "pointer" : undefined),
      } satisfies CSSProperties,
    };
  }, [interactions]);

  const hasInteractions = interactionHandlers !== ELEMENT_IMAGE_INTERACTION_HANDLERS_NONE;

  const content = (
    <div style={contentWrapperStyle}>
      {!hasSource && (
        <span className="text-muted-foreground text-sm" role="status">
          No image source.
        </span>
      )}
      {hasSource && showError && (
        <span className="text-muted-foreground text-sm" role="status">
          {isApprovedAssetUrl(src) ? "Image failed to load." : THIRD_PARTY_ASSET_MESSAGE}
        </span>
      )}
      {showImage && src && (
        <span style={imageFrameStyle}>
          {usePlainImg ? (
            <img
              src={src}
              alt={alt ?? ""}
              style={fillHeight ? fillImgStyle : imgStyle}
              loading={loading ?? (priority ? "eager" : "lazy")}
              decoding={decoding}
              srcSet={srcSet}
              sizes={resolvedSizes}
              fetchPriority={priority ? "high" : undefined}
              onError={handleNativeImgError}
              onLoad={handleImgLoad}
            />
          ) : (
            <Image
              src={src}
              alt={alt ?? ""}
              fill
              unoptimized={isBlobSrc}
              priority={!!priority}
              fetchPriority={priority ? "high" : "auto"}
              sizes={resolvedSizes}
              style={fillHeight ? fillImgStyle : nextImageFillStyle}
              loading={loading ?? (priority ? "eager" : "lazy")}
              decoding={decoding}
              onError={handleNextImageError}
              onLoad={handleImgLoad}
              placeholder={blurDataURL ? "blur" : "empty"}
              blurDataURL={blurDataURL}
            />
          )}
        </span>
      )}
    </div>
  );

  const ariaProps = aria as Record<string, string | boolean> | undefined;

  const figure = (
    <figure
      ref={figureRef}
      className={figureClassName}
      tabIndex={tabIndex}
      role={role}
      {...(ariaProps ? ariaProps : {})}
      style={
        hasInteractions
          ? {
              ...figureStyle,
              ...(hasGlassEffect && figureStyle.position == null ? { position: "relative" } : {}),
              ...(hasInteractions ? interactionHandlers.style : {}),
            }
          : {
              ...figureStyle,
              ...(hasGlassEffect && figureStyle.position == null ? { position: "relative" } : {}),
            }
      }
      aria-live={showError ? "polite" : undefined}
      {...(hasInteractions
        ? {
            onClick: interactionHandlers.onClick,
            onPointerEnter: interactionHandlers.onPointerEnter,
            onPointerLeave: interactionHandlers.onPointerLeave,
            onPointerDown: interactionHandlers.onPointerDown,
            onPointerUp: interactionHandlers.onPointerUp,
            onDoubleClick: interactionHandlers.onDoubleClick,
          }
        : {})}
    >
      <SectionGlassEffect effects={imageEffects} sectionRef={figureRef} variant="auto" />
      {resolvedHref ? (
        isInternal ? (
          <TransitionLink
            href={resolvedHref}
            className="block w-full h-full"
            target={resolvedTarget}
            rel={resolvedRel}
          >
            {content}
          </TransitionLink>
        ) : (
          <a
            href={resolvedHref}
            target={resolvedTarget ?? "_blank"}
            rel={resolvedRel ?? "noopener noreferrer"}
            className="block w-full h-full"
          >
            {content}
          </a>
        )
      ) : (
        content
      )}
    </figure>
  );

  return figure;
}
