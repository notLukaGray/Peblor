import type { ReactNode } from "react";
import type { VectorShape } from "@pb/contracts/types";

export type VectorShapeCommonProps = Record<string, string | number | React.CSSProperties>;

export function buildShapeProps(
  shape: VectorShape,
  options?: {
    fillOnly?: boolean;
    fillOverride?: string;
    strokeOverride?: string;
    transitionStyle?: React.CSSProperties;
  }
): VectorShapeCommonProps {
  const fillOnly = options?.fillOnly ?? false;
  const fill = options?.fillOverride ?? shape.fill;
  const stroke = options?.strokeOverride ?? shape.stroke;
  const transitionStyle = options?.transitionStyle;
  const style =
    transitionStyle && (fill != null || (!fillOnly && stroke != null))
      ? {
          ...transitionStyle,
          ...(fill != null && { fill }),
          ...(!fillOnly && stroke != null && { stroke }),
        }
      : transitionStyle;
  const shapeProps = {
    ...(style == null && fill != null && { fill }),
    ...(style == null && !fillOnly && stroke != null && { stroke }),
    strokeWidth: fillOnly ? undefined : shape.strokeWidth,
    strokeLinecap: fillOnly ? undefined : shape.strokeLinecap,
    strokeLinejoin: fillOnly ? undefined : shape.strokeLinejoin,
    opacity: fillOnly ? undefined : shape.opacity,
    transform: shape.transform,
    ...(style && { style }),
  };
  return Object.fromEntries(
    Object.entries(shapeProps).filter(([, v]) => v != null)
  ) as VectorShapeCommonProps;
}

function renderRectShape(
  shape: VectorShape & { type: "rect" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  const { x, y, width, height, rx, ry } = shape;
  return (
    <rect key={index} x={x} y={y} width={width} height={height} rx={rx} ry={ry} {...commonProps} />
  );
}

function renderCircleShape(
  shape: VectorShape & { type: "circle" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} />;
}

function renderEllipseShape(
  shape: VectorShape & { type: "ellipse" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  return (
    <ellipse key={index} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...commonProps} />
  );
}

function renderLineShape(
  shape: VectorShape & { type: "line" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  return (
    <line key={index} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...commonProps} />
  );
}

function renderPolygonShape(
  shape: VectorShape & { type: "polygon" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  return <polygon key={index} points={shape.points} {...commonProps} />;
}

function renderPolylineShape(
  shape: VectorShape & { type: "polyline" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  return <polyline key={index} points={shape.points} {...commonProps} />;
}

function renderPathShape(
  shape: VectorShape & { type: "path" },
  index: number,
  commonProps: VectorShapeCommonProps
): ReactNode {
  if (shape.d == null || String(shape.d).trim() === "") return null;
  return <path key={index} d={shape.d} {...commonProps} />;
}

const SHAPE_RENDERERS: Record<
  string,
  (shape: VectorShape, index: number, commonProps: VectorShapeCommonProps) => ReactNode
> = {
  rect: (s, i, p) => renderRectShape(s as VectorShape & { type: "rect" }, i, p),
  circle: (s, i, p) => renderCircleShape(s as VectorShape & { type: "circle" }, i, p),
  ellipse: (s, i, p) => renderEllipseShape(s as VectorShape & { type: "ellipse" }, i, p),
  line: (s, i, p) => renderLineShape(s as VectorShape & { type: "line" }, i, p),
  polygon: (s, i, p) => renderPolygonShape(s as VectorShape & { type: "polygon" }, i, p),
  polyline: (s, i, p) => renderPolylineShape(s as VectorShape & { type: "polyline" }, i, p),
  path: (s, i, p) => renderPathShape(s as VectorShape & { type: "path" }, i, p),
};

export function renderVectorShape(
  shape: VectorShape,
  index: number,
  options?: {
    fillOnly?: boolean;
    fillOverride?: string;
    strokeOverride?: string;
    transitionStyle?: React.CSSProperties;
  }
): ReactNode {
  const commonProps = buildShapeProps(shape, options);
  const renderer = SHAPE_RENDERERS[shape.type];
  return renderer ? renderer(shape, index, commonProps) : null;
}
