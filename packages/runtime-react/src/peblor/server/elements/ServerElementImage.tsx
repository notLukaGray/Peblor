import Image from "next/image";
import type { ElementBlock } from "@pb/contracts/types";
import { computeElementImagePresentation } from "../../elements/ElementImage/element-image-presentation";
import { stripResponsiveLayoutKeys } from "@pb/core/layout";
import { globals } from "@pb/runtime-react/core/lib/globals";
import type { ServerElementComponentProps } from "../server-element-types";

type Props = Extract<ElementBlock, { type: "elementImage" }>;

export function ServerElementImage({
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
  stateStyleClass,
  responsiveStyleClass,
  responsiveLayoutKeys,
}: Props &
  Pick<
    ServerElementComponentProps,
    "stateStyleClass" | "responsiveStyleClass" | "responsiveLayoutKeys"
  >) {
  const resolvedSizes =
    sizes ??
    `(max-width: ${globals.uiBreakpointDesktopPx}px) 100vw, (max-width: 1200px) 80vw, 1200px`;
  const imagePresentationProps = stripResponsiveLayoutKeys(
    {
      type: "elementImage" as const,
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
      objectFit,
      objectPosition,
      imageCrop,
      imageFilters,
      fillOpacity,
      imageRotation,
      rotate,
      flipHorizontal,
      flipVertical,
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
    },
    responsiveStyleClass ? responsiveLayoutKeys : undefined
  );
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
  } = computeElementImagePresentation(
    imagePresentationProps as Parameters<typeof computeElementImagePresentation>[0]
  );
  const isBlobSrc = typeof src === "string" && src.startsWith("blob:");
  const usePlainImg = useIntrinsicSizing;
  const resolvedTarget = link?.target ?? (!isInternal && resolvedHref ? "_blank" : undefined);
  const resolvedRel =
    link?.rel ??
    (!isInternal && resolvedHref
      ? "noopener noreferrer"
      : resolvedTarget === "_blank"
        ? "noopener noreferrer"
        : undefined);
  const ariaProps = aria as Record<string, string | boolean> | undefined;

  const content = (
    <div style={contentWrapperStyle}>
      {!hasSource && (
        <span className="text-muted-foreground text-sm" role="status">
          No image source.
        </span>
      )}
      {hasSource && src && (
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
              placeholder={blurDataURL ? "blur" : "empty"}
              blurDataURL={blurDataURL}
            />
          )}
        </span>
      )}
    </div>
  );
  const linkedContent = resolvedHref ? (
    <a
      href={resolvedHref}
      target={resolvedTarget ?? (!isInternal ? "_blank" : undefined)}
      rel={resolvedRel ?? (!isInternal ? "noopener noreferrer" : undefined)}
      className="block w-full h-full"
    >
      {content}
    </a>
  ) : (
    content
  );

  return (
    <figure
      className={[figureClassName, stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      tabIndex={tabIndex}
      role={role}
      {...(ariaProps ? ariaProps : {})}
      style={figureStyle}
    >
      {linkedContent}
    </figure>
  );
}
