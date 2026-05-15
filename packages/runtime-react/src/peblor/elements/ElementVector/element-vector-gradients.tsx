import type { ReactNode } from "react";
import { convertRotateToMatrix } from "@pb/runtime-react/core/lib/svg-transform-utils";
import type { VectorGradient, VectorGradientStop } from "@pb/contracts/peblor/core/peblor-schemas";
import { type PeblorThemeMode, resolveThemeString } from "@/peblor/theme/theme-string";

export function renderGradientStop(
  stop: VectorGradientStop,
  index: number,
  themeMode: PeblorThemeMode
): ReactNode {
  return (
    <stop
      key={index}
      offset={stop.offset}
      stopColor={resolveThemeString(stop.color, themeMode)}
      stopOpacity={stop.opacity}
    />
  );
}

function renderLinearGradient(
  def: VectorGradient & { type: "linearGradient" },
  stops: ReactNode[]
): ReactNode {
  const gradientTransform = convertRotateToMatrix(def.gradientTransform);
  return (
    <linearGradient
      key={def.id}
      id={def.id}
      {...(def.x1 != null ? { x1: String(def.x1) } : {})}
      {...(def.y1 != null ? { y1: String(def.y1) } : {})}
      {...(def.x2 != null ? { x2: String(def.x2) } : {})}
      {...(def.y2 != null ? { y2: String(def.y2) } : {})}
      {...(def.gradientUnits ? { gradientUnits: def.gradientUnits } : {})}
      {...(gradientTransform ? { gradientTransform } : {})}
    >
      {stops}
    </linearGradient>
  );
}

function renderRadialGradient(
  def: VectorGradient & { type: "radialGradient" },
  stops: ReactNode[]
): ReactNode {
  return (
    <radialGradient
      key={def.id}
      id={def.id}
      cx={def.cx}
      cy={def.cy}
      r={def.r}
      fx={def.fx}
      fy={def.fy}
      gradientUnits={def.gradientUnits}
    >
      {stops}
    </radialGradient>
  );
}

const GRADIENT_RENDERERS: Record<string, (g: VectorGradient, stops: ReactNode[]) => ReactNode> = {
  linearGradient: (g, stops) =>
    renderLinearGradient(g as VectorGradient & { type: "linearGradient" }, stops),
  radialGradient: (g, stops) =>
    renderRadialGradient(g as VectorGradient & { type: "radialGradient" }, stops),
};

export function renderGradient(gradient: VectorGradient, themeMode: PeblorThemeMode): ReactNode {
  const rawStops = gradient.stops?.filter((s): s is NonNullable<typeof s> => s != null) ?? [];
  const stops = rawStops.map((s, i) => renderGradientStop(s, i, themeMode));
  if (!stops.length) return null;
  const renderer = GRADIENT_RENDERERS[gradient.type];
  return renderer ? renderer(gradient, stops) : null;
}
