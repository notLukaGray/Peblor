import Image from "next/image";
import type { ElementBlock } from "@pb/contracts/types";
import { computeElementImagePresentation } from "../../elements/ElementImage/element-image-presentation";

type Props = Extract<ElementBlock, { type: "elementImage" }>;

export function ServerElementImage({
  src,
  alt,
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
  backdropFilter,
  overflow,
  hidden,
  priority,
  loading,
  decoding,
  srcSet,
  sizes,
  aria,
  tabIndex,
  role,
}: Props) {
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
    align,
    alignY,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
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
    backdropFilter,
    overflow,
    hidden,
  });
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
              sizes={sizes}
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
              sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"}
              style={fillHeight ? fillImgStyle : nextImageFillStyle}
              loading={loading ?? (priority ? "eager" : "lazy")}
              decoding={decoding}
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
      className={figureClassName}
      tabIndex={tabIndex}
      role={role}
      {...(ariaProps ? ariaProps : {})}
      style={figureStyle}
    >
      {linkedContent}
    </figure>
  );
}
