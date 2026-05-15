import {
  DEFAULT_COLUMN_WIDTHS,
  type ElementWithId,
  type ResolvedColumnWidthsInput,
} from "@pb/contracts/peblor/core/section-column-layout-types";

export function normalizeColumnSpanValue(
  value: number | "all" | undefined,
  columnCount: number
): number | undefined {
  if (value == null || columnCount < 1) return undefined;
  if (value === "all") return columnCount;
  if (!Number.isFinite(value)) return undefined;
  const n = Math.max(1, Math.min(columnCount, Math.floor(value)));
  return n;
}

export function buildElementMap<T extends ElementWithId>(elements: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const el of elements) {
    if (el.id) map.set(el.id, el);
  }
  return map;
}

export function orderElementsByOrder<T extends ElementWithId>(
  resolvedElementOrder: string[],
  elementMap: Map<string, T>,
  elements: T[]
): T[] {
  const ordered: T[] = [];
  const usedIds = new Set<string>();
  for (const id of resolvedElementOrder) {
    const element = elementMap.get(id);
    if (element) {
      ordered.push(element);
      usedIds.add(id);
    }
  }
  for (const element of elements) {
    if (element.id && !usedIds.has(element.id)) ordered.push(element);
  }
  return ordered;
}

export function groupElementsByColumn<T extends ElementWithId>(
  orderedElements: T[],
  columnCount: number,
  columnAssignments: Record<string, number>
): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < columnCount; i++) groups[i] = [];
  let nextAutoColumn = 0;
  for (const element of orderedElements) {
    const assignedColumn =
      element.id != null ? (columnAssignments[element.id] as number | undefined) : undefined;
    if (
      assignedColumn !== undefined &&
      assignedColumn >= 0 &&
      assignedColumn < columnCount &&
      groups[assignedColumn]
    ) {
      groups[assignedColumn].push(element);
      continue;
    }
    if (columnCount > 0) {
      const autoColumn = nextAutoColumn % columnCount;
      groups[autoColumn]?.push(element);
      nextAutoColumn += 1;
    }
  }
  return groups;
}

export type ColumnFlexStyle =
  | { flex: "0 0 auto"; width?: string }
  | { flex: "1 1 0%" }
  | { flex: string };

const HUG_STYLE: ColumnFlexStyle = { flex: "0 0 auto" };
const EQUAL_STYLE: ColumnFlexStyle = { flex: "1 1 0%" };

function flexStyleForWidth(w: number | "hug" | "equal" | string): ColumnFlexStyle {
  if (w === "hug") return HUG_STYLE;
  if (w === "equal") return EQUAL_STYLE;
  if (typeof w === "string") return { flex: "0 0 auto", width: w };
  const n = typeof w === "number" ? w : 1;
  return { flex: `${n} ${n} 0%` };
}

export function getColumnFlexStyles(
  columnWidths: ResolvedColumnWidthsInput,
  columnCount: number
): ColumnFlexStyle[] {
  const effectiveWidths = columnWidths ?? DEFAULT_COLUMN_WIDTHS;
  if (columnCount === 1) {
    if (effectiveWidths === "equal") return [EQUAL_STYLE];
    if (effectiveWidths === "hug") return [HUG_STYLE];
    if (Array.isArray(effectiveWidths) && effectiveWidths.length > 0) {
      return [flexStyleForWidth(effectiveWidths[0]!)];
    }
    return [HUG_STYLE];
  }
  if (effectiveWidths === "hug") return Array.from({ length: columnCount }, () => HUG_STYLE);
  if (effectiveWidths === "equal") return Array.from({ length: columnCount }, () => EQUAL_STYLE);
  if (Array.isArray(effectiveWidths)) {
    return effectiveWidths.slice(0, columnCount).map(flexStyleForWidth);
  }
  return Array.from({ length: columnCount }, () => HUG_STYLE);
}

export type GapStyle = {
  columnGap?: number | string;
  rowGap?: number | string;
  justifyContent?: "space-between";
};

export type ColumnLayoutSegment<T extends ElementWithId> =
  | {
      type: "columns";
      elementsByColumn: T[][];
    }
  | {
      type: "span";
      element: T;
      columnStart: number;
      columnSpan: number;
    };

export type GridLayoutItem<T extends ElementWithId> = {
  element: T;
  columnStart?: number;
  rowStart?: number;
  columnSpan?: number;
  rowSpan?: number;
  justifySelf?: "start" | "center" | "end" | "stretch";
  alignSelf?: "start" | "center" | "end" | "stretch";
  zIndex?: number;
  order?: number;
};

function effectiveGapValue(gaps: string | string[]): string | undefined {
  return typeof gaps === "string" ? gaps : gaps[0];
}

export function getGapStyle(
  resolvedColumnGaps: string | string[] | undefined,
  columnCount: number
): GapStyle | undefined {
  if (!resolvedColumnGaps) return undefined;
  const isAuto =
    resolvedColumnGaps === "auto" ||
    (Array.isArray(resolvedColumnGaps) && resolvedColumnGaps[0] === "auto");
  const gap = effectiveGapValue(
    typeof resolvedColumnGaps === "string" ? resolvedColumnGaps : resolvedColumnGaps
  );
  if (columnCount === 1) {
    return isAuto ? { columnGap: 0 } : { rowGap: gap ?? 0, columnGap: 0 };
  }
  return isAuto
    ? { justifyContent: "space-between", rowGap: 0 }
    : { columnGap: gap ?? 0, rowGap: 0 };
}
