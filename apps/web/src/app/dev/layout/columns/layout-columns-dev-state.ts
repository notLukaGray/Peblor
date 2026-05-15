import { buildLayoutCardElements } from "@/app/dev/layout/_shared/layout-preview-fixtures";
import type { ElementBlock, SectionBlock } from "@pb/contracts";

export type LayoutColumnsDraft = {
  align: "left" | "center" | "right" | "full";
  contentWidth: string;
  contentHeight: string;
  desktopColumns: number;
  mobileColumns: number;
  desktopGap: string;
  mobileGap: string;
  desktopGridMode: "columns" | "grid";
  mobileGridMode: "columns" | "grid";
  itemCount: number;
  itemMinHeight: string;
  desktopSpanPattern: string;
  mobileSpanPattern: string;
};

function buildSampleElements(itemCount: number, minHeight: string): ElementBlock[] {
  const count = Math.max(1, Math.min(24, Math.round(itemCount)));
  const box = minHeight.trim() || "8rem";
  return buildLayoutCardElements("col", {
    count,
    minHeight: box,
    height: box,
    width: "100%",
    labelPrefix: "Column",
  }).map((el, index) => {
    const id = `col-item-${index + 1}`;
    if (el.type !== "elementBody") return el;
    return { ...el, id };
  });
}

function clampColumnCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(12, Math.max(1, Math.round(value)));
}

function normalizeSizeInput(value: string): string | undefined {
  const next = value.trim();
  return next.length === 0 ? undefined : next;
}

function buildAssignments(
  elements: ElementBlock[],
  desktopColumns: number,
  mobileColumns: number
): { desktop: Record<string, number>; mobile: Record<string, number> } {
  const desktop: Record<string, number> = {};
  const mobile: Record<string, number> = {};
  for (let index = 0; index < elements.length; index += 1) {
    const id = elements[index]?.id;
    if (!id) continue;
    desktop[id] = index % desktopColumns;
    mobile[id] = index % mobileColumns;
  }
  return { desktop, mobile };
}

function normalizeGapValue(value: string): string {
  const next = value.trim();
  return next.length === 0 ? "1rem" : next;
}

function parseSpanPattern(pattern: string): number[] {
  const values = pattern
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.round(value));
  return values.length > 0 ? values : [1];
}

function buildSpanMap(
  elements: ElementBlock[],
  columns: number,
  pattern: number[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (let index = 0; index < elements.length; index += 1) {
    const id = elements[index]?.id;
    if (!id) continue;
    out[id] = Math.max(1, Math.min(columns, pattern[index % pattern.length] ?? 1));
  }
  return out;
}

export function getDefaultLayoutColumnsDraft(): LayoutColumnsDraft {
  return {
    align: "center",
    contentWidth: "full",
    contentHeight: "",
    desktopColumns: 3,
    mobileColumns: 1,
    desktopGap: "1rem",
    mobileGap: "0.75rem",
    desktopGridMode: "columns",
    mobileGridMode: "columns",
    itemCount: 8,
    itemMinHeight: "8rem",
    desktopSpanPattern: "1,1,2,1",
    mobileSpanPattern: "1",
  };
}

export function buildLayoutColumnsSection(
  draft: LayoutColumnsDraft
): Extract<SectionBlock, { type: "sectionColumn" }> {
  const desktopColumns = clampColumnCount(draft.desktopColumns);
  const mobileColumns = clampColumnCount(draft.mobileColumns);
  const elements = buildSampleElements(draft.itemCount, draft.itemMinHeight.trim() || "5.5rem");
  const assignments = buildAssignments(elements, desktopColumns, mobileColumns);
  const desktopSpans = buildSpanMap(
    elements,
    desktopColumns,
    parseSpanPattern(draft.desktopSpanPattern)
  );
  const mobileSpans = buildSpanMap(
    elements,
    mobileColumns,
    parseSpanPattern(draft.mobileSpanPattern)
  );
  return {
    type: "sectionColumn",
    id: "layout-columns-dev-sample",
    align: draft.align,
    elements,
    columns: {
      desktop: desktopColumns,
      mobile: mobileColumns,
    },
    columnAssignments: {
      desktop: assignments.desktop,
      mobile: assignments.mobile,
    },
    columnGaps: {
      desktop: normalizeGapValue(draft.desktopGap),
      mobile: normalizeGapValue(draft.mobileGap),
    },
    gridMode: {
      desktop: draft.desktopGridMode,
      mobile: draft.mobileGridMode,
    },
    columnSpan: {
      desktop: desktopSpans,
      mobile: mobileSpans,
    },
    contentWidth: normalizeSizeInput(draft.contentWidth),
    contentHeight: normalizeSizeInput(draft.contentHeight),
  };
}
