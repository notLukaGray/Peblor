import type { CSSProperties } from "react";
import type { ElementBlock, VectorShape } from "@pb/contracts/types";
import { getElementLayoutStyle, getElementTransformStyle } from "@pb/core/layout";
import {
  renderVectorDefs,
  renderVectorFillOnlyLayers,
  renderVectorStrokeGroupLayers,
} from "../../elements/ElementVector/element-vector-layers";
import { resolvePaint } from "../../elements/ElementVector/element-vector-paint";
import type { SvgRenderContext } from "../../elements/ElementVector/element-vector-types";
import { resolveGraphicLinkHref } from "@pb/runtime-react/core/lib/url-policy";

type Props = Extract<ElementBlock, { type: "elementVector" }>;

export function ServerElementVector({
  viewBox,
  ariaLabel,
  preserveAspectRatio = "xMidYMid meet",
  shapes = [],
  colors,
  gradients = [],
  strokeGroup,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  overflow,
  hidden,
  rotate,
  flipHorizontal = false,
  flipVertical = false,
  link,
}: Props) {
  const layoutStyle = getElementLayoutStyle({
    width,
    height,
    align,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex,
    constraints,
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
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...(layoutStyle.borderRadius != null ? { borderRadius: layoutStyle.borderRadius } : {}),
    ...getElementTransformStyle({ rotate, flipHorizontal, flipVertical }),
  };
  const allGradients = Array.isArray(gradients) ? gradients : [];
  const resolve = (ref: Parameters<typeof resolvePaint>[0]) =>
    resolvePaint(ref, colors, allGradients, "light");
  const pathShapes = (Array.isArray(shapes) ? shapes : []).filter(
    (shape): shape is VectorShape & { type: "path"; d: string } =>
      shape != null && shape.type === "path" && shape.d != null && String(shape.d).trim() !== ""
  );
  const hasDefs =
    allGradients.length > 0 && allGradients.some((gradient) => gradient?.stops?.length);
  const state = { hover: false, active: false, disabled: false };
  const ctx: SvgRenderContext = {
    state,
    shapes,
    pathShapes,
    strokeGroup: strokeGroup ?? null,
    resolve,
    resolveFill: (ref) => resolve(ref),
    resolveStroke: (ref) => resolve(ref),
    resolveHoverFill: (ref) => resolve(ref),
    resolvedStroke: resolve(strokeGroup?.stroke),
    strokeTransitionStyle: undefined,
    needsOpacityTransition: false,
    opacityTransitionStyle: undefined,
  };
  const svg = viewBox ? (
    <svg
      data-graphic-content
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      style={{ width: "100%", height: "100%", display: "block" }}
      role="img"
      aria-label={ariaLabel?.trim() || "Vector graphic"}
    >
      {renderVectorDefs(hasDefs, allGradients, "light")}
      {strokeGroup ? renderVectorStrokeGroupLayers(ctx) : renderVectorFillOnlyLayers(ctx)}
    </svg>
  ) : (
    <span className="text-muted-foreground text-sm" role="status">
      Invalid vector: viewBox is required.
    </span>
  );
  const resolvedHref = link ? resolveGraphicLinkHref(link.ref, link.external ?? false) : null;
  const isExternal = link?.external === true;
  const target = link?.target ?? (isExternal ? "_blank" : undefined);
  const rel = link?.rel ?? (isExternal || target === "_blank" ? "noopener noreferrer" : undefined);

  const content = resolvedHref ? (
    <a
      href={resolvedHref}
      target={target}
      rel={rel}
      className="w-full h-full flex items-center justify-center"
    >
      {svg}
    </a>
  ) : (
    svg
  );

  return (
    <figure className="shrink-0 m-0" style={layoutStyle}>
      <div style={innerStyle}>{content}</div>
    </figure>
  );
}
