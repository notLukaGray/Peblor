"use client";

import { useMemo } from "react";
import type {
  ColumnCountInput,
  ElementOrderInput,
  ColumnAssignmentsInput,
  ColumnGapsInput,
  ColumnWidthsInput,
  ColumnStylesInput,
  ColumnStyleInput,
  ColumnSpanInput,
  ItemStylesInput,
  ItemStyleInput,
  GridModeInput,
  GridModeValue,
  ItemLayoutInput,
  ItemLayoutEntryInput,
  ElementWithId,
} from "@pb/core/layout";
import {
  buildElementMap,
  orderElementsByOrder,
  groupElementsByColumn,
  buildColumnLayoutSegments,
  buildGridLayoutItems,
  getColumnFlexStyles,
  getGapStyle,
  type GridLayoutItem,
  type ColumnLayoutSegment,
  type ColumnFlexStyle,
  type GapStyle,
} from "@pb/core/layout";
import {
  buildContentWrapperStyle,
  useResolvedColumnLayoutInputs,
} from "@/peblor/hooks/use-column-layout/derivations";

export type UseColumnLayoutParams<T extends ElementWithId> = {
  elements: T[];
  columns: ColumnCountInput | undefined;
  columnAssignments: ColumnAssignmentsInput | undefined;
  columnWidths: ColumnWidthsInput | undefined;
  columnGaps: ColumnGapsInput | undefined;
  columnStyles?: ColumnStylesInput;
  columnSpan?: ColumnSpanInput;
  itemStyles?: ItemStylesInput;
  gridMode?: GridModeInput;
  itemLayout?: ItemLayoutInput;
  elementOrder: ElementOrderInput;
  contentWidth?: string | [string, string];
  contentHeight?: string | [string, string];
};

export type UseColumnLayoutResult<T extends ElementWithId> = {
  elementsByColumn: T[][];
  columnFlexStyles: ColumnFlexStyle[];
  gapStyle: GapStyle | undefined;
  resolvedColumnCount: number;
  resolvedColumnGaps: string | string[] | undefined;
  resolvedContentWidth: string | undefined;
  resolvedContentHeight: string | undefined;
  resolvedColumnStyles: ColumnStyleInput[] | undefined;
  resolvedItemStyles: Record<string, ItemStyleInput> | undefined;
  resolvedGridMode: GridModeValue;
  resolvedItemLayout: Record<string, ItemLayoutEntryInput> | undefined;
  layoutSegments: ColumnLayoutSegment<T>[];
  gridLayoutItems: GridLayoutItem<T>[];
  /** Style for the column wrapper (flex row, width/height, gap). */
  contentWrapperStyle: React.CSSProperties;
};

export function useColumnLayout<T extends ElementWithId>({
  elements,
  columns,
  columnAssignments,
  columnWidths,
  columnGaps,
  columnStyles,
  columnSpan,
  itemStyles,
  gridMode,
  itemLayout,
  elementOrder,
  contentWidth,
  contentHeight,
}: UseColumnLayoutParams<T>): UseColumnLayoutResult<T> {
  const {
    resolvedColumnCount,
    resolvedElementOrder,
    resolvedColumnAssignments,
    resolvedColumnGaps,
    resolvedColumnWidths,
    resolvedColumnStyles,
    resolvedColumnSpan,
    resolvedItemStyles,
    resolvedGridMode,
    resolvedItemLayout,
    resolvedContentWidth,
    resolvedContentHeight,
  } = useResolvedColumnLayoutInputs({
    elements,
    columns,
    columnAssignments,
    columnWidths,
    columnGaps,
    columnStyles,
    columnSpan,
    itemStyles,
    gridMode,
    itemLayout,
    elementOrder,
    contentWidth,
    contentHeight,
  });

  const elementMap = useMemo(() => buildElementMap(elements), [elements]);

  const orderedElements = useMemo(
    () => orderElementsByOrder(resolvedElementOrder, elementMap, elements),
    [resolvedElementOrder, elementMap, elements]
  );

  const elementsByColumn = useMemo(
    () => groupElementsByColumn(orderedElements, resolvedColumnCount, resolvedColumnAssignments),
    [orderedElements, resolvedColumnCount, resolvedColumnAssignments]
  );
  const layoutSegments = useMemo(
    () =>
      buildColumnLayoutSegments(
        orderedElements,
        resolvedColumnCount,
        resolvedColumnAssignments,
        resolvedColumnSpan
      ),
    [orderedElements, resolvedColumnCount, resolvedColumnAssignments, resolvedColumnSpan]
  );
  const gridLayoutItems = useMemo(
    () =>
      buildGridLayoutItems(
        orderedElements,
        resolvedColumnCount,
        resolvedColumnAssignments,
        resolvedColumnSpan,
        resolvedItemLayout
      ),
    [
      orderedElements,
      resolvedColumnCount,
      resolvedColumnAssignments,
      resolvedColumnSpan,
      resolvedItemLayout,
    ]
  );

  const columnFlexStyles = useMemo(
    () => getColumnFlexStyles(resolvedColumnWidths, resolvedColumnCount),
    [resolvedColumnWidths, resolvedColumnCount]
  );

  const gapStyle = useMemo(
    () => getGapStyle(resolvedColumnGaps, resolvedColumnCount),
    [resolvedColumnGaps, resolvedColumnCount]
  );

  const contentWrapperStyle = useMemo(
    () =>
      buildContentWrapperStyle({
        resolvedContentWidth,
        resolvedContentHeight,
        resolvedColumnCount,
        gapStyle,
      }),
    [resolvedContentWidth, resolvedContentHeight, resolvedColumnCount, gapStyle]
  );

  return {
    elementsByColumn,
    columnFlexStyles,
    gapStyle,
    resolvedColumnCount,
    resolvedColumnGaps,
    resolvedContentWidth,
    resolvedContentHeight,
    resolvedColumnStyles,
    resolvedItemStyles,
    resolvedGridMode,
    resolvedItemLayout,
    layoutSegments,
    gridLayoutItems,
    contentWrapperStyle,
  };
}
