/**
 * Pure column layout logic for sectionColumn. No React, no DOM.
 * Used by useColumnLayout; unit-testable.
 */

import {
  type ColumnAssignmentsInput,
  type ColumnCountInput,
  type ColumnGapsInput,
  type ColumnSpanInput,
  type ColumnSpanValueInput,
  type ColumnStyleInput,
  type ColumnStylesInput,
  type ColumnWidthsInput,
  type ColumnWidthsValueInput,
  type ElementOrderInput,
  type ElementWithId,
  type GridModeInput,
  type GridModeValue,
  type ItemLayoutInput,
  type ItemLayoutValueInput,
  type ItemStylesInput,
  type ItemStylesValueInput,
  type ResolvedColumnWidthsInput,
  type ResolvedColumnSpanInput,
  type ResolvedItemLayoutInput,
  type ResolvedItemStylesInput,
} from "@pb/contracts/peblor/core/section-column-layout-types";

export {
  DEFAULT_COLUMN_WIDTHS,
  type ColumnAssignmentsInput,
  type ColumnCountInput,
  type ColumnGapsInput,
  type ColumnSpanInput,
  type ColumnSpanValueInput,
  type ColumnStyleInput,
  type ColumnStylesInput,
  type ColumnWidthsInput,
  type ColumnWidthsValueInput,
  type ElementOrderInput,
  type ElementWithId,
  type GridModeInput,
  type GridModeValue,
  type ItemLayoutEntryInput,
  type ItemLayoutInput,
  type ItemLayoutValueInput,
  type ItemStyleInput,
  type ItemStylesInput,
  type ResolvedColumnSpanInput,
  type ResolvedColumnWidthsInput,
  type ResolvedItemLayoutInput,
  type ResolvedItemStylesInput,
} from "@pb/contracts/peblor/core/section-column-layout-types";

export {
  buildColumnLayoutSegments,
  buildElementMap,
  buildGridLayoutItems,
  getColumnFlexStyles,
  getGapStyle,
  groupElementsByColumn,
  normalizeColumnSpanValue,
  orderElementsByOrder,
  type ColumnFlexStyle,
  type ColumnLayoutSegment,
  type GapStyle,
  type GridLayoutItem,
} from "./section-column-layout-builders";

/** Pick value for breakpoint from responsive shape { mobile?, desktop? }; primitives/arrays pass through. */
function pickResponsive<T>(
  value: T | { mobile?: T; desktop?: T } | undefined,
  isDesktop: boolean
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const r = value as { mobile?: T; desktop?: T };
  return isDesktop ? (r.desktop ?? r.mobile) : (r.mobile ?? r.desktop);
}

export function resolveColumnCount(
  columns: ColumnCountInput | undefined,
  isDesktop: boolean
): number {
  if (columns === undefined) return 1;
  if (typeof columns === "number") return columns;
  return (pickResponsive(columns, isDesktop) as number | undefined) ?? 1;
}

export function resolveElementOrder(
  elementOrder: ElementOrderInput,
  elements: ElementWithId[],
  isDesktop: boolean
): string[] {
  if (!elementOrder) return elements.map((el) => el.id).filter((id): id is string => !!id);
  if (Array.isArray(elementOrder)) return elementOrder;
  return (pickResponsive(elementOrder, isDesktop) as string[] | undefined) ?? [];
}

export function resolveColumnAssignments(
  columnAssignments: ColumnAssignmentsInput | undefined,
  isDesktop: boolean
): Record<string, number> {
  if (columnAssignments === undefined || Array.isArray(columnAssignments)) return {};
  const r = columnAssignments as {
    mobile?: Record<string, number>;
    desktop?: Record<string, number>;
  };
  const hasResponsive = "mobile" in columnAssignments || "desktop" in columnAssignments;
  if (!hasResponsive) return columnAssignments as Record<string, number>;
  const picked = pickResponsive(r, isDesktop);
  return (picked as Record<string, number> | undefined) ?? {};
}

export function resolveColumnGaps(
  columnGaps: ColumnGapsInput,
  isDesktop: boolean
): string | string[] | undefined {
  if (!columnGaps) return undefined;
  if (typeof columnGaps === "string") return columnGaps;
  if (Array.isArray(columnGaps)) return columnGaps;
  return pickResponsive(
    columnGaps as { mobile?: string | string[]; desktop?: string | string[] },
    isDesktop
  );
}

export function resolveColumnWidths(
  columnWidths: ColumnWidthsInput | undefined,
  isDesktop: boolean
): ResolvedColumnWidthsInput {
  if (!columnWidths) return undefined;
  if (typeof columnWidths === "string" || Array.isArray(columnWidths)) return columnWidths;
  return pickResponsive(
    columnWidths as { mobile?: ColumnWidthsValueInput; desktop?: ColumnWidthsValueInput },
    isDesktop
  );
}

export function resolveColumnStyles(
  columnStyles: ColumnStylesInput,
  isDesktop: boolean
): ColumnStyleInput[] | undefined {
  if (!columnStyles) return undefined;
  if (Array.isArray(columnStyles)) return columnStyles;
  return pickResponsive(
    columnStyles as {
      mobile?: ColumnStyleInput[];
      desktop?: ColumnStyleInput[];
    },
    isDesktop
  );
}

export function resolveColumnSpan(
  columnSpan: ColumnSpanInput,
  isDesktop: boolean
): ResolvedColumnSpanInput {
  if (!columnSpan) return undefined;
  const hasResponsive =
    typeof columnSpan === "object" &&
    !Array.isArray(columnSpan) &&
    ("mobile" in columnSpan || "desktop" in columnSpan);
  if (!hasResponsive) return columnSpan as ColumnSpanValueInput;
  return pickResponsive(
    columnSpan as { mobile?: ColumnSpanValueInput; desktop?: ColumnSpanValueInput },
    isDesktop
  );
}

export function resolveItemStyles(
  itemStyles: ItemStylesInput,
  isDesktop: boolean
): ResolvedItemStylesInput {
  if (!itemStyles) return undefined;
  const hasResponsive =
    typeof itemStyles === "object" &&
    !Array.isArray(itemStyles) &&
    ("mobile" in itemStyles || "desktop" in itemStyles);
  if (!hasResponsive) return itemStyles as ItemStylesValueInput;
  return pickResponsive(
    itemStyles as { mobile?: ItemStylesValueInput; desktop?: ItemStylesValueInput },
    isDesktop
  );
}

export function resolveGridMode(gridMode: GridModeInput, isDesktop: boolean): GridModeValue {
  if (!gridMode) return "columns";
  if (typeof gridMode === "string") return gridMode;
  return pickResponsive(gridMode, isDesktop) ?? "columns";
}

export function resolveItemLayout(
  itemLayout: ItemLayoutInput,
  isDesktop: boolean
): ResolvedItemLayoutInput {
  if (!itemLayout) return undefined;
  const hasResponsive =
    typeof itemLayout === "object" &&
    !Array.isArray(itemLayout) &&
    ("mobile" in itemLayout || "desktop" in itemLayout);
  if (!hasResponsive) return itemLayout as ItemLayoutValueInput;
  return pickResponsive(
    itemLayout as { mobile?: ItemLayoutValueInput; desktop?: ItemLayoutValueInput },
    isDesktop
  );
}
