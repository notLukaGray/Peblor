/**
 * Pure column layout logic for sectionColumn. No React, no DOM.
 * Used by useColumnLayout; unit-testable.
 */

import { resolveResponsiveValue } from "../lib/responsive-value";
import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";
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

/**
 * Pick value for a section-column responsive input at the given breakpoint.
 *
 * Handles:
 *   - scalar T → passthrough
 *   - `{ base?, sm?, md?, lg?, xl?, "2xl"? }` → tier map (mobile-first cascade via
 *     `resolveResponsiveValue`)
 *
 * NOTE: unlike the general `resolveResponsiveValue`, this helper takes `isDesktop`
 * (not `isMobile`) to match the existing section-column resolver convention.
 */
function pickResponsive<T>(
  value: T | { base?: T; sm?: T; md?: T; lg?: T; xl?: T; "2xl"?: T } | undefined,
  isDesktop: boolean
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value as T;

  // Tier map — delegate to the shared resolver (mobile-first cascade).
  return resolveResponsiveValue(value, !isDesktop);
}

/**
 * Returns true if `obj` is a responsive wrapper (a tier map
 * `{ base, sm, md, lg, xl, "2xl" }`), as opposed to a flat value record.
 */
function isSectionColumnResponsiveObject(obj: object): boolean {
  for (const tier of BREAKPOINT_TIER_NAMES) {
    if (tier in obj) return true;
  }
  return false;
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
  if (!isSectionColumnResponsiveObject(columnAssignments)) {
    return columnAssignments as Record<string, number>;
  }
  const picked = pickResponsive(
    columnAssignments as {
      base?: Record<string, number>;
      sm?: Record<string, number>;
      md?: Record<string, number>;
      lg?: Record<string, number>;
      xl?: Record<string, number>;
      "2xl"?: Record<string, number>;
    },
    isDesktop
  );
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
    columnGaps as {
      base?: string | string[];
      sm?: string | string[];
      md?: string | string[];
      lg?: string | string[];
      xl?: string | string[];
      "2xl"?: string | string[];
    },
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
    columnWidths as {
      base?: ColumnWidthsValueInput;
      sm?: ColumnWidthsValueInput;
      md?: ColumnWidthsValueInput;
      lg?: ColumnWidthsValueInput;
      xl?: ColumnWidthsValueInput;
      "2xl"?: ColumnWidthsValueInput;
    },
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
      base?: ColumnStyleInput[];
      sm?: ColumnStyleInput[];
      md?: ColumnStyleInput[];
      lg?: ColumnStyleInput[];
      xl?: ColumnStyleInput[];
      "2xl"?: ColumnStyleInput[];
    },
    isDesktop
  );
}

export function resolveColumnSpan(
  columnSpan: ColumnSpanInput,
  isDesktop: boolean
): ResolvedColumnSpanInput {
  if (!columnSpan) return undefined;
  const isResponsive =
    typeof columnSpan === "object" &&
    !Array.isArray(columnSpan) &&
    isSectionColumnResponsiveObject(columnSpan);
  if (!isResponsive) return columnSpan as ColumnSpanValueInput;
  return pickResponsive(
    columnSpan as {
      base?: ColumnSpanValueInput;
      sm?: ColumnSpanValueInput;
      md?: ColumnSpanValueInput;
      lg?: ColumnSpanValueInput;
      xl?: ColumnSpanValueInput;
      "2xl"?: ColumnSpanValueInput;
    },
    isDesktop
  );
}

export function resolveItemStyles(
  itemStyles: ItemStylesInput,
  isDesktop: boolean
): ResolvedItemStylesInput {
  if (!itemStyles) return undefined;
  const isResponsive =
    typeof itemStyles === "object" &&
    !Array.isArray(itemStyles) &&
    isSectionColumnResponsiveObject(itemStyles);
  if (!isResponsive) return itemStyles as ItemStylesValueInput;
  return pickResponsive(
    itemStyles as {
      base?: ItemStylesValueInput;
      sm?: ItemStylesValueInput;
      md?: ItemStylesValueInput;
      lg?: ItemStylesValueInput;
      xl?: ItemStylesValueInput;
      "2xl"?: ItemStylesValueInput;
    },
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
  const isResponsive =
    typeof itemLayout === "object" &&
    !Array.isArray(itemLayout) &&
    isSectionColumnResponsiveObject(itemLayout);
  if (!isResponsive) return itemLayout as ItemLayoutValueInput;
  return pickResponsive(
    itemLayout as {
      base?: ItemLayoutValueInput;
      sm?: ItemLayoutValueInput;
      md?: ItemLayoutValueInput;
      lg?: ItemLayoutValueInput;
      xl?: ItemLayoutValueInput;
      "2xl"?: ItemLayoutValueInput;
    },
    isDesktop
  );
}
