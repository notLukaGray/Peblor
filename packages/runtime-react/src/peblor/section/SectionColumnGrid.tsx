"use client";

import type { ElementBlock } from "@pb/contracts/types";
import type {
  ColumnFlexStyle,
  GridLayoutItem,
  ColumnLayoutSegment,
  ColumnStyleInput,
  ItemLayoutEntryInput,
} from "@pb/core/layout";
import {
  getOverlapGap,
  getPrimaryGap,
  gridTemplateFromFlexStyles,
  ItemCell,
  renderColumnStackSegment,
} from "./SectionColumnGrid/section-column-grid-rendering";
import {
  buildGridItemStyle,
  GridDebugOverlay,
} from "./SectionColumnGrid/section-column-grid-debug-overlay";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";

export type SectionColumnGridProps = {
  elementsByColumn: ElementBlock[][];
  columnFlexStyles: ColumnFlexStyle[];
  resolvedColumnCount: number;
  resolvedColumnGaps: string | string[] | undefined;
  columnStyles?: ColumnStyleInput[];
  itemStyles?: Record<string, ColumnStyleInput>;
  gridMode?: "columns" | "grid";
  gridDebug?: boolean;
  gridAutoRows?: string;
  gridLayoutItems?: GridLayoutItem<ElementBlock>[];
  itemLayout?: Record<string, ItemLayoutEntryInput>;
  layoutSegments?: ColumnLayoutSegment<ElementBlock>[];
  contentWrapperStyle: React.CSSProperties;
};

/** Presentational grid for sectionColumn: columns and elements. */
export function SectionColumnGrid({
  elementsByColumn,
  columnFlexStyles,
  resolvedColumnCount,
  resolvedColumnGaps,
  columnStyles,
  itemStyles,
  gridMode = "columns",
  gridDebug = false,
  gridAutoRows,
  gridLayoutItems,
  itemLayout: _itemLayout,
  layoutSegments,
  contentWrapperStyle,
}: SectionColumnGridProps) {
  const themeMode = usePeblorThemeMode();
  const effectiveSegments: ColumnLayoutSegment<ElementBlock>[] =
    layoutSegments && layoutSegments.length > 0
      ? layoutSegments
      : [{ type: "columns", elementsByColumn }];
  const flexStylesSlice = columnFlexStyles.slice(0, Math.max(1, resolvedColumnCount));
  const templateColumns =
    gridMode === "grid"
      ? gridTemplateFromFlexStyles(flexStylesSlice, { forCssGrid: true })
      : gridTemplateFromFlexStyles(flexStylesSlice);
  const primaryGap = getPrimaryGap(resolvedColumnGaps);
  const overlapGap = getOverlapGap(resolvedColumnGaps);
  const outerWrapperStyle: React.CSSProperties = {
    ...contentWrapperStyle,
    flexDirection: "column",
    alignItems: "stretch",
    flexWrap: "nowrap",
    columnGap: undefined,
    justifyContent: undefined,
    rowGap: undefined,
  };

  // In columns mode, span items split the flow into multiple row segments.
  // Add vertical spacing between those segments so spanned bands/images don't collapse together.
  const columnModeWrapperStyle: React.CSSProperties =
    layoutSegments && layoutSegments.length > 1 && primaryGap && !overlapGap
      ? { ...outerWrapperStyle, rowGap: primaryGap }
      : outerWrapperStyle;

  if (gridMode === "grid") {
    const gridItems = gridLayoutItems ?? [];
    const gridGap = getPrimaryGap(resolvedColumnGaps);
    // `contentWidth: hug` maps to `width: fit-content`, which shrink-wraps the grid. That makes
    // `fr` / percentage column tracks effectively collapse (used inline size is indefinite), so
    // the layout reads as a broken single column. Grid needs a definite width — the section flex
    // column already stretches children horizontally.
    const gridOuterBase: React.CSSProperties =
      contentWrapperStyle.width === "fit-content"
        ? {
            ...outerWrapperStyle,
            width: "100%",
            marginLeft: undefined,
            marginRight: undefined,
          }
        : outerWrapperStyle;
    const gridWrapperStyle: React.CSSProperties = {
      ...gridOuterBase,
      display: "grid",
      gridTemplateColumns: templateColumns,
      ...(gridGap && !overlapGap ? { columnGap: gridGap, rowGap: gridGap } : {}),
      gridAutoRows: gridAutoRows ?? "minmax(min-content, max-content)",
      position: "relative",
    };

    return (
      <div className="relative z-[var(--pb-z-raised)] min-w-0" style={gridWrapperStyle}>
        {gridItems.map((item, idx) => (
          <div key={item.element.id ?? `grid-${idx}`} style={buildGridItemStyle(item)}>
            <ItemCell
              block={item.element}
              style={item.element.id ? itemStyles?.[item.element.id] : undefined}
              themeMode={themeMode}
            />
          </div>
        ))}
        {gridDebug ? (
          <div
            className="pointer-events-none absolute inset-0 z-[var(--pb-z-max)]"
            style={{
              display: "grid",
              gridTemplateColumns: templateColumns,
              ...(gridGap && !overlapGap ? { columnGap: gridGap, rowGap: gridGap } : {}),
              gridAutoRows: gridAutoRows ?? "minmax(min-content, max-content)",
            }}
          >
            <GridDebugOverlay items={gridItems} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="relative z-[var(--pb-z-raised)] flex flex-col min-w-0"
      style={columnModeWrapperStyle}
    >
      {effectiveSegments.map((segment, segmentIndex) => {
        const segmentKey = `seg-${segmentIndex}`;
        const segmentSpacingStyle =
          segmentIndex > 0 && overlapGap ? ({ marginTop: overlapGap } as const) : undefined;
        if (segment.type === "columns") {
          const segmentContent = renderColumnStackSegment({
            segmentColumns: segment.elementsByColumn,
            segmentKey,
            columnFlexStyles,
            resolvedColumnCount,
            resolvedColumnGaps,
            columnStyles,
            itemStyles,
            themeMode,
          });
          return segmentSpacingStyle ? (
            <div key={`${segmentKey}:spacing`} style={segmentSpacingStyle}>
              {segmentContent}
            </div>
          ) : (
            segmentContent
          );
        }

        return (
          <div
            key={segmentKey}
            className="relative z-[var(--pb-z-raised)] min-w-0"
            style={{
              display: "grid",
              width: "100%",
              alignItems: "stretch",
              gridTemplateColumns: templateColumns,
              ...(primaryGap && !overlapGap ? { columnGap: primaryGap } : {}),
              ...(segmentSpacingStyle ?? {}),
            }}
          >
            <div
              className="min-w-0"
              style={{
                gridColumn: `${segment.columnStart + 1} / span ${segment.columnSpan}`,
                width: "100%",
                minHeight: 0,
                alignSelf: "stretch",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ItemCell
                block={segment.element}
                style={segment.element.id ? itemStyles?.[segment.element.id] : undefined}
                themeMode={themeMode}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
