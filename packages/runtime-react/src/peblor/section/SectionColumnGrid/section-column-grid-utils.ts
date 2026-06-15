import type { ColumnFlexStyle, ColumnStyleInput } from "@pb/core/layout";
import { peblorFlexGapToCss } from "@pb/core/layout";
import { borderToCss } from "@pb/core/layout";
import { lowerThemeStringOrGradientToCss, lowerThemeValueDeep } from "@/peblor/theme/theme-string";

function mapColumnAlignX(
  value: ColumnStyleInput["alignX"]
): React.CSSProperties["alignItems"] | undefined {
  if (!value) return undefined;
  if (value === "left") return "flex-start";
  if (value === "right") return "flex-end";
  return value;
}

function mapColumnAlignY(
  value: ColumnStyleInput["alignY"]
): React.CSSProperties["justifyContent"] | undefined {
  if (!value) return undefined;
  if (value === "top") return "flex-start";
  if (value === "bottom") return "flex-end";
  return value;
}

export function getBoxStyle(style: ColumnStyleInput | undefined): React.CSSProperties | undefined {
  if (!style) return undefined;
  const resolvedBorder = lowerThemeValueDeep(style.border) as typeof style.border;
  const justifyContent = style.distribute ?? mapColumnAlignY(style.alignY);
  const alignItems = style.align ?? mapColumnAlignX(style.alignX);
  return {
    borderRadius: style.borderRadius,
    border: borderToCss(resolvedBorder as { width?: string; style?: string; color?: string }),
    borderTop: style.borderTop,
    borderRight: style.borderRight,
    borderBottom: style.borderBottom,
    borderLeft: style.borderLeft,
    background: lowerThemeStringOrGradientToCss(style.fill),
    padding: style.padding,
    gap: peblorFlexGapToCss(style.gap),
    justifyContent,
    alignItems,
    minHeight: style.minHeight,
    maxHeight: style.maxHeight,
    minWidth: style.minWidth,
    maxWidth: style.maxWidth,
    width: style.width,
    height: style.height,
    overflow: style.scroll,
    overflowX: style.scrollX,
    overflowY: style.scrollY,
    ...(justifyContent || alignItems || style.gap
      ? { display: "flex", flexDirection: "column" }
      : {}),
  };
}

export function gridTemplateFromFlexStyles(
  columnFlexStyles: ColumnFlexStyle[],
  options?: { forCssGrid?: boolean }
): string {
  return columnFlexStyles
    .map((style) => {
      if ("width" in style && style.width) return style.width;
      // Flex "hug" columns map to `max-content` for intrinsic flex-row sizing. For a real CSS Grid
      // container, `max-content` tracks + `fr` children do not establish a stable multi-column grid
      // (everything reads like a single column). Grid mode needs `fr` tracks instead.
      if (style.flex === "0 0 auto") return options?.forCssGrid ? "minmax(0, 1fr)" : "max-content";
      if (style.flex === "1 1 0%") return "minmax(0, 1fr)";
      const m = /^([0-9.]+)\s+/.exec(style.flex);
      if (m) return `minmax(0, ${m[1]}fr)`;
      return "minmax(0, 1fr)";
    })
    .join(" ");
}

export function getPrimaryGap(
  resolvedColumnGaps: string | string[] | undefined
): string | undefined {
  if (!resolvedColumnGaps) return undefined;
  return typeof resolvedColumnGaps === "string" ? resolvedColumnGaps : resolvedColumnGaps[0];
}

export function getOverlapGap(
  resolvedColumnGaps: string | string[] | undefined
): string | undefined {
  const gap = getPrimaryGap(resolvedColumnGaps)?.trim();
  if (!gap) return undefined;
  // CSS `gap` does not support negatives; treat negative values as overlap offsets.
  return /^-\d*\.?\d+(px|rem|em|vw|vh|%)$/i.test(gap) ? gap : undefined;
}
