import type { ReactNode } from "react";
import type { VectorGradient } from "@pb/contracts/types";
import { renderGradient } from "./element-vector-gradients";
import { renderVectorShape } from "./element-vector-shapes";
import type { SvgRenderContext } from "./element-vector-types";

export function renderVectorDefs(hasDefs: boolean, gradients: VectorGradient[]): ReactNode {
  if (!hasDefs) return null;
  return <defs>{gradients.map((g) => renderGradient(g))}</defs>;
}

const fillOnlyOpts = { fillOnly: true as const };

export function renderVectorStrokeGroupLayers(ctx: SvgRenderContext): ReactNode {
  const sg = ctx.strokeGroup;
  if (!sg) return null;
  const { state, shapes, pathShapes, resolve, resolveFill, resolveHoverFill, resolvedStroke } = ctx;

  return (
    <>
      <g
        style={
          ctx.needsOpacityTransition
            ? { ...ctx.opacityTransitionStyle, opacity: state.hover ? 0 : 1 }
            : undefined
        }
      >
        {shapes.map((shape, i) =>
          renderVectorShape(shape, i, {
            ...fillOnlyOpts,
            fillOverride: resolve(shape.fill),
          })
        )}
      </g>
      {ctx.needsOpacityTransition && (
        <g style={{ ...ctx.opacityTransitionStyle, opacity: state.hover ? 1 : 0 }}>
          {shapes.map((shape, i) =>
            renderVectorShape(shape, i, {
              ...fillOnlyOpts,
              fillOverride: resolveHoverFill(shape.fill),
            })
          )}
        </g>
      )}
      {!ctx.needsOpacityTransition && (
        <g>
          {shapes.map((shape, i) =>
            renderVectorShape(shape, i, {
              ...fillOnlyOpts,
              fillOverride: resolveFill(shape.fill),
            })
          )}
        </g>
      )}
      <g
        fill="none"
        stroke={resolvedStroke ?? resolve(sg.stroke)}
        strokeWidth={sg.strokeWidth}
        strokeLinejoin={sg.strokeLinejoin}
        strokeMiterlimit={sg.strokeMiterlimit}
        style={{
          mixBlendMode: sg.blendMode as "overlay" | undefined,
          opacity: sg.opacity,
          ...ctx.strokeTransitionStyle,
        }}
      >
        {pathShapes.map((shape, i) => (
          <path key={i} d={shape.d} style={ctx.strokeTransitionStyle} />
        ))}
      </g>
    </>
  );
}

export function renderVectorFillOnlyLayers(ctx: SvgRenderContext): ReactNode {
  const { state, shapes, resolve, resolveFill, resolveStroke, resolveHoverFill } = ctx;
  if (ctx.needsOpacityTransition) {
    return (
      <>
        <g style={{ ...ctx.opacityTransitionStyle, opacity: state.hover ? 0 : 1 }}>
          {shapes.map((shape, i) =>
            renderVectorShape(shape, i, {
              fillOverride: resolve(shape.fill),
              strokeOverride: resolve(shape.stroke),
            })
          )}
        </g>
        <g style={{ ...ctx.opacityTransitionStyle, opacity: state.hover ? 1 : 0 }}>
          {shapes.map((shape, i) =>
            renderVectorShape(shape, i, {
              fillOverride: resolveHoverFill(shape.fill),
              strokeOverride: resolveStroke(shape.stroke),
            })
          )}
        </g>
      </>
    );
  }
  return (
    <>
      {shapes.map((shape, i) =>
        renderVectorShape(shape, i, {
          fillOverride: resolveFill(shape.fill),
          strokeOverride: resolveStroke(shape.stroke),
        })
      )}
    </>
  );
}
