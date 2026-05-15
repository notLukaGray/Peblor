/**
 * Gradient fill extraction — converts Figma gradient paints to CSS gradient strings.
 */

import { figmaRgbToHex } from "../utils/color";
import { resolveVariableAlias } from "./fills-solid";
import {
  extractLinearGradientParamsFromTransform,
  extractRadialOrDiamondGradientParams,
} from "@figma-plugin/helpers";

type BoundVariables = Record<string, { type: "VARIABLE_ALIAS"; id: string }>;
type GradientBoxSize = { width: number; height: number };

/**
 * Converts a Figma GradientStop color (RGBA floats) to a CSS rgba() string.
 */
function gradientStopToCSS(stop: ColorStop): string {
  const color = stop.color;
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a;

  let fallback: string;
  if (a < 1) {
    fallback = `rgba(${r}, ${g}, ${b}, ${a.toFixed(3).replace(/\.?0+$/, "")})`;
  } else {
    fallback = figmaRgbToHex(color.r, color.g, color.b);
  }

  const stopBound = (stop as ColorStop & { boundVariables?: BoundVariables }).boundVariables;
  if (stopBound?.["color"]?.type === "VARIABLE_ALIAS") {
    const varStr = resolveVariableAlias(stopBound["color"], fallback);
    if (varStr) return varStr;
  }

  return fallback;
}

/**
 * CSS linear-gradient angle: 0deg = up, 90deg = right (layer y-down).
 * Direction of color flow matches vector (dx, dy) from start → end handle.
 */
function cssAngleDegFromDirection(dx: number, dy: number): number {
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

function normalizeAngleDeg(deg: number): number {
  const normalized = deg % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function cssGradientLineLength({ width, height }: GradientBoxSize, angleDeg: number): number {
  const angleRad = (angleDeg * Math.PI) / 180;
  return Math.abs(width * Math.sin(angleRad)) + Math.abs(height * Math.cos(angleRad));
}

function cssGradientEndpoints(
  { width, height }: GradientBoxSize,
  angleDeg: number
): { sx: number; sy: number; ex: number; ey: number } {
  const halfLen = cssGradientLineLength({ width, height }, angleDeg) / 2;
  const angleRad = (angleDeg * Math.PI) / 180;
  const ux = Math.sin(angleRad);
  const uy = -Math.cos(angleRad);
  const cx = width / 2;
  const cy = height / 2;
  return {
    sx: cx - ux * halfLen,
    sy: cy - uy * halfLen,
    ex: cx + ux * halfLen,
    ey: cy + uy * halfLen,
  };
}

function formatGradientStopPct(position: number): string {
  return (position * 100).toFixed(2).replace(/\.?0+$/, "");
}

function formatPercent(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function gradientStopsToCSS(
  stops: readonly ColorStop[],
  fillOpacity?: number,
  remap?: (position: number) => number
): string | undefined {
  if (stops.length === 0) return undefined;
  return stops
    .map((stop) => {
      const cssPct = formatGradientStopPct(remap ? remap(stop.position) : stop.position);
      const base = gradientStopToCSS(stop);
      if (fillOpacity !== undefined && fillOpacity < 1) {
        const { r, g, b, a } = stop.color;
        const opacity = fillOpacity * a;
        const color =
          opacity < 1
            ? `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${opacity.toFixed(3)})`
            : `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
        return `${color} ${cssPct}%`;
      }
      return `${base} ${cssPct}%`;
    })
    .join(", ");
}

/**
 * Linear gradient: the CSS line runs through the box center, so Figma stop positions must be
 * projected from the actual handle segment onto that centered CSS line.
 */
function buildLinearGradientCSS(
  transform: Transform,
  stops: readonly ColorStop[],
  size: GradientBoxSize,
  fillOpacity?: number
): string | undefined {
  const params = extractLinearGradientParamsFromTransform(size.width, size.height, transform);
  const figmaStartX = params.start[0];
  const figmaStartY = params.start[1];
  const figmaEndX = params.end[0];
  const figmaEndY = params.end[1];
  const dx = figmaEndX - figmaStartX;
  const dy = figmaEndY - figmaStartY;
  const figmaLen = Math.hypot(dx, dy);
  if (figmaLen < 1e-10) return undefined;

  const angleDeg = cssAngleDegFromDirection(dx, dy);
  const cssLine = cssGradientEndpoints(size, angleDeg);
  const cssDx = cssLine.ex - cssLine.sx;
  const cssDy = cssLine.ey - cssLine.sy;
  const cssLenSq = cssDx * cssDx + cssDy * cssDy;
  if (cssLenSq < 1e-10) return undefined;

  const remap = (position: number) => {
    const px = figmaStartX + dx * position;
    const py = figmaStartY + dy * position;
    return ((px - cssLine.sx) * cssDx + (py - cssLine.sy) * cssDy) / cssLenSq;
  };

  const stopStr = gradientStopsToCSS(stops, fillOpacity, remap);
  if (!stopStr) return undefined;
  return `linear-gradient(${normalizeAngleDeg(angleDeg).toFixed(1)}deg, ${stopStr})`;
}

/** Angle (deg) for conic / legacy — first column + 90° gist-style. */
function linearGradientAngleDegForConic(transform: Transform): number {
  const m00 = transform[0][0];
  const m10 = transform[1][0];
  let deg = (Math.atan2(m10, m00) * 180) / Math.PI + 90;
  if (deg <= 0) deg += 360;
  if (deg > 360) deg -= 360;
  return deg;
}

/**
 * Returns a CSS gradient string for the first visible gradient fill, or
 * `undefined` if no gradient fill is present.
 *
 * - GRADIENT_LINEAR  → `linear-gradient(Ndeg, ...stops)`
 * - GRADIENT_RADIAL  → `radial-gradient(RX% RY% at X% Y%, ...stops)`
 * - GRADIENT_ANGULAR → `conic-gradient(from Ndeg at X% Y%, ...stops)` (deg stops)
 * - GRADIENT_DIAMOND → approximated as `radial-gradient(RX% RY% at X% Y%, ...stops)`
 */
export function extractGradientFill(
  fills: readonly Paint[],
  size?: GradientBoxSize
): string | undefined {
  for (const fill of fills) {
    if (fill.visible === false) continue;
    const gradientSize = size ?? { width: 1, height: 1 };

    if (fill.type === "GRADIENT_LINEAR") {
      return buildLinearGradientCSS(
        fill.gradientTransform,
        fill.gradientStops,
        gradientSize,
        fill.opacity
      );
    }

    if (fill.type === "GRADIENT_RADIAL") {
      const params = extractRadialOrDiamondGradientParams(
        gradientSize.width,
        gradientSize.height,
        fill.gradientTransform as unknown as number[][]
      );
      const cx = formatPercent((params.center[0] / gradientSize.width) * 100);
      const cy = formatPercent((params.center[1] / gradientSize.height) * 100);
      const rxPct = formatPercent((params.radius[0] / gradientSize.width) * 100);
      const ryPct = formatPercent((params.radius[1] / gradientSize.height) * 100);
      const stops = gradientStopsToCSS(fill.gradientStops, fill.opacity);
      if (!stops) return undefined;
      return `radial-gradient(${rxPct}% ${ryPct}% at ${cx}% ${cy}%, ${stops})`;
    }

    if (fill.type === "GRADIENT_ANGULAR") {
      const params = extractRadialOrDiamondGradientParams(
        gradientSize.width,
        gradientSize.height,
        fill.gradientTransform as unknown as number[][]
      );
      const angle = linearGradientAngleDegForConic(fill.gradientTransform);
      const cx = formatPercent((params.center[0] / gradientSize.width) * 100);
      const cy = formatPercent((params.center[1] / gradientSize.height) * 100);
      const conicStops = fill.gradientStops
        .map((s) => {
          const { r, g, b, a } = s.color;
          const opacity = (fill.opacity ?? 1) * a;
          const color =
            opacity < 1
              ? `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${opacity.toFixed(3)})`
              : `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
          return `${color} ${(s.position * 360).toFixed(1)}deg`;
        })
        .join(", ");
      return `conic-gradient(from ${normalizeAngleDeg(angle).toFixed(1)}deg at ${cx}% ${cy}%, ${conicStops})`;
    }

    if (fill.type === "GRADIENT_DIAMOND") {
      const params = extractRadialOrDiamondGradientParams(
        gradientSize.width,
        gradientSize.height,
        fill.gradientTransform as unknown as number[][]
      );
      const cx = formatPercent((params.center[0] / gradientSize.width) * 100);
      const cy = formatPercent((params.center[1] / gradientSize.height) * 100);
      const rxPct = formatPercent((params.radius[0] / gradientSize.width) * 100);
      const ryPct = formatPercent((params.radius[1] / gradientSize.height) * 100);
      const stops = gradientStopsToCSS(fill.gradientStops, fill.opacity);
      if (!stops) return undefined;
      return `radial-gradient(${rxPct}% ${ryPct}% at ${cx}% ${cy}%, ${stops})`;
    }
  }
  return undefined;
}
