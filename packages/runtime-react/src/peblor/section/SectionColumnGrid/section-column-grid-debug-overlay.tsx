"use client";

import type { ElementBlock } from "@pb/contracts/types";
import type { GridLayoutItem } from "@pb/core/layout";

export function buildGridItemStyle(item: GridLayoutItem<ElementBlock>): React.CSSProperties {
  const style: React.CSSProperties = { minWidth: 0 };
  // Named area takes precedence over numeric column/row placement
  if (item.gridArea) {
    style.gridArea = item.gridArea;
  } else {
    // gridColumn shorthand overrides the computed columnStart/span
    if (item.gridColumn) {
      style.gridColumn = item.gridColumn;
    } else if (item.columnStart != null) {
      style.gridColumn = `${item.columnStart} / span ${item.columnSpan ?? 1}`;
    } else if (item.columnSpan && item.columnSpan > 1) {
      style.gridColumn = `auto / span ${item.columnSpan}`;
    }
    // gridRow shorthand overrides the computed rowStart/span
    if (item.gridRow) {
      style.gridRow = item.gridRow;
    } else if (item.rowStart != null) {
      style.gridRow = `${item.rowStart} / span ${item.rowSpan ?? 1}`;
    } else if (item.rowSpan && item.rowSpan > 1) {
      style.gridRow = `auto / span ${item.rowSpan}`;
    }
  }
  if (item.justifySelf) style.justifySelf = item.justifySelf;
  if (item.alignSelf) style.alignSelf = item.alignSelf;
  if (item.zIndex != null) style.zIndex = item.zIndex;
  return style;
}

export function GridDebugOverlay({ items }: { items: GridLayoutItem<ElementBlock>[] }) {
  return (
    <>
      {items.map((item, idx) => (
        <div
          key={`debug-${item.element.id ?? idx}`}
          style={{
            ...buildGridItemStyle(item),
            outline: "1px dashed var(--border)",
            background: "transparent",
            minHeight: "2rem",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              fontSize: "10px",
              lineHeight: 1.1,
              padding: "2px 4px",
              color: "var(--muted-foreground)",
              background: "var(--card)",
              borderBottomRightRadius: "4px",
              border: "1px solid var(--border)",
            }}
          >
            {item.element.id ?? `item-${idx}`}
          </div>
        </div>
      ))}
    </>
  );
}
