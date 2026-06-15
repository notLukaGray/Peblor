"use client";

import { useMemo } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { peblorFlexGapToCss } from "@pb/core/layout";
import { generateElementKey } from "@pb/core/keys";
import type { ColumnFlexStyle, ColumnStyleInput } from "@pb/core/layout";
import { ElementRenderer } from "../../elements/Shared/ElementRenderer";
import { getBoxStyle, getOverlapGap } from "./section-column-grid-utils";

export {
  getBoxStyle,
  gridTemplateFromFlexStyles,
  getPrimaryGap,
  getOverlapGap,
} from "./section-column-grid-utils";

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
}: {
  segmentColumns: ElementBlock[][];
  segmentKey: string;
  columnFlexStyles: ColumnFlexStyle[];
  resolvedColumnCount: number;
  resolvedColumnGaps: string | string[] | undefined;
  columnStyles?: ColumnStyleInput[];
  itemStyles?: Record<string, ColumnStyleInput>;
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
        const flexStyle = columnFlexStyles[columnIndex] ?? { flex: "0 0 auto" };
        const isHug = flexStyle.flex === "0 0 auto";
        const needsMinWidth = !isHug || resolvedColumnCount === 1;
        return (
          <ColumnSlot
            key={`${segmentKey}:${columnIndex}`}
            segmentKey={segmentKey}
            columnIndex={columnIndex}
            columnStyle={columnStyle}
            colStyle={colStyle}
            flexStyle={flexStyle}
            needsMinWidth={needsMinWidth}
            overlapGap={overlapGap}
            elementBlocks={columnElements}
            itemStyles={itemStyles}
          />
        );
      })}
    </div>
  );
}

export function ItemCell({ block, style }: { block: ElementBlock; style?: ColumnStyleInput }) {
  const cellStyle = useMemo(() => getBoxStyle(style), [style]);
  if (!cellStyle) return <ElementRenderer block={block} />;
  return (
    <div className="min-w-0" style={cellStyle}>
      <ElementRenderer block={block} />
    </div>
  );
}

function ColumnSlot({
  segmentKey,
  columnIndex,
  columnStyle,
  colStyle,
  flexStyle,
  needsMinWidth,
  overlapGap,
  elementBlocks,
  itemStyles,
}: {
  segmentKey: string;
  columnIndex: number;
  columnStyle?: ColumnStyleInput;
  colStyle: React.CSSProperties;
  flexStyle: ColumnFlexStyle;
  needsMinWidth: boolean;
  overlapGap: string | undefined;
  elementBlocks: ElementBlock[];
  itemStyles?: Record<string, ColumnStyleInput>;
}) {
  const boxStyle = useMemo(() => getBoxStyle(columnStyle), [columnStyle]);
  const style = { ...colStyle, ...(boxStyle ?? {}) };
  return (
    <div
      className={`flex flex-col ${needsMinWidth ? "min-w-0" : ""}`}
      style={{
        ...style,
        ...(overlapGap && columnIndex > 0 ? { marginLeft: overlapGap } : {}),
        ...flexStyle,
      }}
    >
      {elementBlocks.map((block, i) => (
        <ItemCell
          key={
            block.id
              ? `${segmentKey}:${columnIndex}:${block.id}`
              : `${segmentKey}:${columnIndex}:${generateElementKey(block, i)}:${i}`
          }
          block={block}
          style={block.id ? itemStyles?.[block.id] : undefined}
        />
      ))}
    </div>
  );
}
