"use client";

import type { ElementBlock } from "@pb/contracts/types";
import { peblorFlexGapToCss } from "@pb/core/layout";
import { borderToCss } from "@pb/core/layout";
import { generateElementKey } from "@pb/core/keys";
import type { ColumnFlexStyle, ColumnStyleInput } from "@pb/core/layout";
import { ElementRenderer } from "../../elements/Shared/ElementRenderer";
import {
  type PeblorThemeMode,
  resolveThemeString,
  resolveThemeValueDeep,
} from "@/peblor/theme/theme-string";

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

export function getBoxStyle(
  style: ColumnStyleInput | undefined,
  themeMode: PeblorThemeMode
): React.CSSProperties | undefined {
  if (!style) return undefined;
  const resolvedBorder = resolveThemeValueDeep(style.border, themeMode) as typeof style.border;
  const justifyContent = style.justifyContent ?? mapColumnAlignY(style.alignY);
  const alignItems = style.alignItems ?? mapColumnAlignX(style.alignX);
  return {
    borderRadius: style.borderRadius,
    border: borderToCss(resolvedBorder as { width?: string; style?: string; color?: string }),
    background: resolveThemeString(style.fill, themeMode),
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
    overflow: style.overflow,
    overflowX: style.overflowX,
    overflowY: style.overflowY,
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

function getSegmentRowStyle(
  resolvedColumnCount: number,
  resolvedColumnGaps: string | string[] | undefined
): React.CSSProperties {
  if (resolvedColumnCount <= 1 || !resolvedColumnGaps) return {};
  const isAuto =
    resolvedColumnGaps === "auto" ||
    (Array.isArray(resolvedColumnGaps) && resolvedColumnGaps[0] === "auto");
  const gap = typeof resolvedColumnGaps === "string" ? resolvedColumnGaps : resolvedColumnGaps[0];
  const overlapGap = getOverlapGap(resolvedColumnGaps);
  return isAuto ? { justifyContent: "space-between" } : { columnGap: overlapGap ? 0 : gap };
}

export function renderColumnStackSegment({
  segmentColumns,
  segmentKey,
  columnFlexStyles,
  resolvedColumnCount,
  resolvedColumnGaps,
  columnStyles,
  itemStyles,
  themeMode,
}: {
  segmentColumns: ElementBlock[][];
  segmentKey: string;
  columnFlexStyles: ColumnFlexStyle[];
  resolvedColumnCount: number;
  resolvedColumnGaps: string | string[] | undefined;
  columnStyles?: ColumnStyleInput[];
  itemStyles?: Record<string, ColumnStyleInput>;
  themeMode: PeblorThemeMode;
}) {
  const rowStyle = getSegmentRowStyle(resolvedColumnCount, resolvedColumnGaps);
  const overlapGap = getOverlapGap(resolvedColumnGaps);
  return (
    <div
      key={segmentKey}
      className="relative z-[var(--pb-z-raised)] flex min-w-0 w-full"
      style={rowStyle}
    >
      {segmentColumns.map((columnElements, columnIndex) => {
        const colStyle = (() => {
          if (resolvedColumnCount !== 1 || !resolvedColumnGaps) return {};
          const raw =
            typeof resolvedColumnGaps === "string" ? resolvedColumnGaps : resolvedColumnGaps[0];
          const g = peblorFlexGapToCss(raw);
          return g != null ? { gap: g } : {};
        })();
        const columnStyle = columnStyles?.[columnIndex];
        const style = { ...colStyle, ...(getBoxStyle(columnStyle, themeMode) ?? {}) };
        const flexStyle = columnFlexStyles[columnIndex] ?? { flex: "0 0 auto" };
        const isHug = flexStyle.flex === "0 0 auto";
        const needsMinWidth = !isHug || resolvedColumnCount === 1;
        return (
          <div
            key={`${segmentKey}:${columnIndex}`}
            className={`flex flex-col ${needsMinWidth ? "min-w-0" : ""}`}
            style={{
              ...style,
              ...(overlapGap && columnIndex > 0 ? { marginLeft: overlapGap } : {}),
              ...flexStyle,
            }}
          >
            {columnElements.map((block, i) => (
              <ItemCell
                key={
                  block.id
                    ? `${segmentKey}:${columnIndex}:${block.id}`
                    : `${segmentKey}:${columnIndex}:${generateElementKey(block, i)}:${i}`
                }
                block={block}
                style={block.id ? itemStyles?.[block.id] : undefined}
                themeMode={themeMode}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function ItemCell({
  block,
  style,
  themeMode,
}: {
  block: ElementBlock;
  style?: ColumnStyleInput;
  themeMode: PeblorThemeMode;
}) {
  const cellStyle = getBoxStyle(style, themeMode);
  if (!cellStyle) return <ElementRenderer block={block} />;
  return (
    <div className="min-w-0" style={cellStyle}>
      <ElementRenderer block={block} />
    </div>
  );
}
