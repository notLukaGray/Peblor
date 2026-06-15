import type {
  ElementWithId,
  ItemLayoutEntryInput,
  ResolvedColumnSpanInput,
  ResolvedItemLayoutInput,
} from "@pb/contracts/peblor/core/section-column-layout-types";
import {
  normalizeColumnSpanValue,
  type ColumnLayoutSegment,
  type GridLayoutItem,
} from "./section-column-layout-builders-primitives";

function cloneEmptyGroups<T>(columnCount: number): T[][] {
  return Array.from({ length: columnCount }, () => []);
}

function hasAnyElements<T>(groups: T[][]): boolean {
  return groups.some((g) => g.length > 0);
}

export function buildColumnLayoutSegments<T extends ElementWithId>(
  orderedElements: T[],
  columnCount: number,
  columnAssignments: Record<string, number>,
  columnSpan: ResolvedColumnSpanInput
): ColumnLayoutSegment<T>[] {
  if (columnCount < 1) return [];
  const segments: ColumnLayoutSegment<T>[] = [];
  let currentGroups = cloneEmptyGroups<T>(columnCount);
  let nextAutoColumn = 0;

  const flushColumns = () => {
    if (!hasAnyElements(currentGroups)) return;
    segments.push({ type: "columns", elementsByColumn: currentGroups });
    currentGroups = cloneEmptyGroups<T>(columnCount);
  };

  const placeInColumns = (element: T) => {
    const assigned =
      element.id != null ? (columnAssignments[element.id] as number | undefined) : undefined;
    const target =
      assigned !== undefined && assigned >= 0 && assigned < columnCount
        ? assigned
        : nextAutoColumn++ % columnCount;
    currentGroups[target]?.push(element);
  };

  for (const element of orderedElements) {
    const spanRaw =
      element.id != null ? (columnSpan?.[element.id] as number | "all" | undefined) : undefined;
    const normalizedSpan = normalizeColumnSpanValue(spanRaw, columnCount);
    if (normalizedSpan && columnCount > 1) {
      flushColumns();
      const assigned =
        element.id != null ? (columnAssignments[element.id] as number | undefined) : undefined;
      const boundedAssigned =
        assigned !== undefined && assigned >= 0 && assigned < columnCount ? assigned : 0;
      const maxStart = Math.max(0, columnCount - normalizedSpan);
      const columnStart = Math.min(boundedAssigned, maxStart);
      segments.push({
        type: "span",
        element,
        columnStart,
        columnSpan: normalizedSpan,
      });
      continue;
    }
    placeInColumns(element);
  }

  flushColumns();
  return segments;
}

function toCssSelfX(
  value: ItemLayoutEntryInput["alignX"]
): GridLayoutItem<ElementWithId>["justifySelf"] | undefined {
  if (!value) return undefined;
  if (value === "left") return "start";
  if (value === "right") return "end";
  return value;
}

function toCssSelfY(
  value: ItemLayoutEntryInput["alignY"]
): GridLayoutItem<ElementWithId>["alignSelf"] | undefined {
  if (!value) return undefined;
  if (value === "top") return "start";
  if (value === "bottom") return "end";
  return value;
}

export function buildGridLayoutItems<T extends ElementWithId>(
  orderedElements: T[],
  columnCount: number,
  columnAssignments: Record<string, number>,
  columnSpan: ResolvedColumnSpanInput,
  itemLayout: ResolvedItemLayoutInput
): GridLayoutItem<T>[] {
  if (columnCount < 1) return orderedElements.map((element) => ({ element }));

  const items = orderedElements.map((element, index) => {
    const layout = element.id ? itemLayout?.[element.id] : undefined;
    const assignedColumn =
      layout?.column ??
      (element.id != null ? (columnAssignments[element.id] as number | undefined) : undefined);
    const normalizedAssigned =
      assignedColumn !== undefined && assignedColumn >= 0 && assignedColumn < columnCount
        ? assignedColumn
        : undefined;
    const spanSource =
      layout?.columnSpan ??
      (element.id != null ? (columnSpan?.[element.id] as number | "all" | undefined) : undefined);
    const normalizedColSpan = normalizeColumnSpanValue(spanSource, columnCount);
    const rowSpan =
      layout?.rowSpan && Number.isFinite(layout.rowSpan)
        ? Math.max(1, Math.floor(layout.rowSpan))
        : undefined;
    const rowStart =
      layout?.row !== undefined && Number.isFinite(layout.row)
        ? Math.max(1, Math.floor(layout.row) + 1)
        : undefined;

    let columnStart: number | undefined;
    if (normalizedAssigned !== undefined) {
      const maxStart = Math.max(0, columnCount - (normalizedColSpan ?? 1));
      columnStart = Math.min(normalizedAssigned, maxStart) + 1;
    }

    const out: GridLayoutItem<T> = {
      element,
      columnStart,
      rowStart,
      columnSpan: normalizedColSpan,
      rowSpan,
      justifySelf: toCssSelfX(layout?.alignX),
      alignSelf: toCssSelfY(layout?.alignY),
      zIndex: layout?.layer,
      order: layout?.order ?? index,
      gridArea: layout?.gridArea,
      gridColumn: layout?.gridColumn,
      gridRow: layout?.gridRow,
    };
    return out;
  });

  return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
