"use client";

import { forwardRef } from "react";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { GraphicLinkWrapper } from "./Shared/GraphicLinkWrapper";
import type { ElementVectorProps, VectorLayoutProps } from "./ElementVector/element-vector-types";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import type { VectorShape } from "@pb/contracts/types";
import { resolvePaint } from "./ElementVector/element-vector-paint";
import { toVectorTransitionDuration } from "./ElementVector/element-vector-paint";
import {
  makeResolveFill,
  makeResolveStroke,
  makeResolveHoverFill,
} from "./ElementVector/element-vector-link-resolvers";
import {
  renderVectorDefs,
  renderVectorStrokeGroupLayers,
  renderVectorFillOnlyLayers,
} from "./ElementVector/element-vector-layers";
import type { SvgRenderContext } from "./ElementVector/element-vector-types";
import type { LinkState } from "./Shared/GraphicLinkWrapper";

/** Page-builder vector element: structured shapes (rect, circle, path, etc.); colors/strokes and gradients are data-driven and editable. Optional link (ref + internal/external) makes it buttonable. */
export const ElementVector = forwardRef<HTMLAnchorElement | HTMLDivElement, ElementVectorProps>(
  (
    {
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
      interactions,
    },
    ref
  ) => {
    const themeMode = usePeblorThemeMode();
    const layout = {
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
    };
    const transform = { rotate, flipHorizontal, flipVertical };

    const allGradients = Array.isArray(gradients) ? gradients : [];
    const resolve = (ref: Parameters<typeof resolvePaint>[0]) =>
      resolvePaint(ref, colors, allGradients, themeMode);

    const vectorTransitionDuration = toVectorTransitionDuration(link?.vectorTransition);
    const fillStrokeTransitionStyle = vectorTransitionDuration
      ? {
          transition: `fill ${vectorTransitionDuration}, stroke ${vectorTransitionDuration}`,
        }
      : undefined;

    const viewBoxValid = viewBox != null && String(viewBox).trim() !== "";
    const shapesValid = Array.isArray(shapes) && shapes.length > 0;
    const hasDefs =
      Array.isArray(gradients) && gradients.length > 0 && gradients.some((g) => g?.stops?.length);
    const pathShapes = (Array.isArray(shapes) ? shapes : []).filter(
      (s): s is VectorShape & { type: "path"; d: string } =>
        s != null && s.type === "path" && s.d != null && String(s.d).trim() !== ""
    );

    if (!viewBoxValid) {
      return (
        <ElementLayoutWrapper
          layout={layout as VectorLayoutProps}
          transform={transform}
          interactions={interactions}
        >
          <GraphicLinkWrapper ref={ref} className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm" role="status">
              Invalid vector: viewBox is required.
            </span>
          </GraphicLinkWrapper>
        </ElementLayoutWrapper>
      );
    }

    if (!shapesValid) {
      return (
        <ElementLayoutWrapper
          layout={layout as VectorLayoutProps}
          transform={transform}
          interactions={interactions}
        >
          <GraphicLinkWrapper ref={ref} className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm" role="status">
              No shapes.
            </span>
          </GraphicLinkWrapper>
        </ElementLayoutWrapper>
      );
    }

    const renderSvg = (state: LinkState) => {
      const resolveFill = makeResolveFill(state, link, resolve);
      const resolveStroke = makeResolveStroke(state, link, resolve);
      const resolveHoverFill = makeResolveHoverFill(link, resolve);
      const resolvedStroke = resolveStroke(strokeGroup?.stroke);
      const strokeTransitionStyle = fillStrokeTransitionStyle
        ? { transition: `stroke ${vectorTransitionDuration}` }
        : undefined;
      const hasHoverFill = link?.hoverFill != null;
      const needsOpacityTransition = Boolean(fillStrokeTransitionStyle && hasHoverFill);
      const opacityTransitionStyle = needsOpacityTransition
        ? { transition: `opacity ${vectorTransitionDuration}` }
        : undefined;

      const ctx: SvgRenderContext = {
        state,
        shapes,
        pathShapes,
        strokeGroup: strokeGroup ?? null,
        resolve,
        resolveFill,
        resolveStroke,
        resolveHoverFill,
        resolvedStroke,
        strokeTransitionStyle,
        needsOpacityTransition,
        opacityTransitionStyle,
      };

      return (
        <svg
          data-graphic-content
          viewBox={viewBox}
          preserveAspectRatio={preserveAspectRatio}
          style={{ width: "100%", height: "100%", display: "block" }}
          role="img"
          aria-label={ariaLabel?.trim() || "Vector graphic"}
        >
          {renderVectorDefs(hasDefs, allGradients, themeMode)}
          {strokeGroup ? renderVectorStrokeGroupLayers(ctx) : renderVectorFillOnlyLayers(ctx)}
        </svg>
      );
    };

    const defaultState: LinkState = {
      hover: false,
      active: false,
      disabled: false,
    };
    const needsState =
      link?.ref != null ||
      link?.hoverFill != null ||
      link?.activeFill != null ||
      link?.disabledFill != null ||
      link?.hoverStroke != null ||
      link?.activeStroke != null ||
      link?.disabledStroke != null;

    return (
      <ElementLayoutWrapper
        layout={layout as VectorLayoutProps}
        transform={transform}
        interactions={interactions}
      >
        <GraphicLinkWrapper
          ref={ref}
          link={link}
          gradients={allGradients}
          className="w-full h-full flex items-center justify-center"
        >
          {needsState ? renderSvg : renderSvg(defaultState)}
        </GraphicLinkWrapper>
      </ElementLayoutWrapper>
    );
  }
);
ElementVector.displayName = "ElementVector";
