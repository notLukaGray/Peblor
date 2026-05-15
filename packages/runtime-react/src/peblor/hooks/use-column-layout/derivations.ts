"use client";

import { useMemo } from "react";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import {
  type ColumnGapsInput,
  resolveColumnAssignments,
  resolveColumnCount,
  resolveColumnGaps,
  resolveColumnSpan,
  resolveColumnStyles,
  resolveColumnWidths,
  resolveElementOrder,
  resolveGridMode,
  resolveItemLayout,
  resolveItemStyles,
  type ColumnAssignmentsInput,
  type ColumnCountInput,
  type ColumnStyleInput,
  type ColumnStylesInput,
  type ColumnSpanInput,
  type ColumnWidthsInput,
  type ElementOrderInput,
  type ElementWithId,
  type GapStyle,
  type GridModeInput,
  type GridModeValue,
  type ItemLayoutEntryInput,
  type ItemLayoutInput,
  type ItemStyleInput,
  type ItemStylesInput,
} from "@pb/core/layout";

type ResolvedColumnLayoutInputs = {
  resolvedColumnCount: number;
  resolvedElementOrder: string[];
  resolvedColumnAssignments: Record<string, number>;
  resolvedColumnGaps: string | string[] | undefined;
  resolvedColumnWidths: ReturnType<typeof resolveColumnWidths>;
  resolvedColumnStyles: ColumnStyleInput[] | undefined;
  resolvedColumnSpan: ReturnType<typeof resolveColumnSpan>;
  resolvedItemStyles: Record<string, ItemStyleInput> | undefined;
  resolvedGridMode: GridModeValue;
  resolvedItemLayout: Record<string, ItemLayoutEntryInput> | undefined;
  resolvedContentWidth: string | undefined;
  resolvedContentHeight: string | undefined;
};

type UseResolvedColumnLayoutInputsParams<T extends ElementWithId> = {
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

export function useResolvedColumnLayoutInputs<T extends ElementWithId>({
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
}: UseResolvedColumnLayoutInputsParams<T>): ResolvedColumnLayoutInputs {
  const { isMobile, isDesktop } = useDeviceType();

  const resolvedColumnCount = useMemo(
    () => resolveColumnCount(columns, isDesktop),
    [columns, isDesktop]
  );
  const resolvedElementOrder = useMemo(
    () => resolveElementOrder(elementOrder, elements, isDesktop),
    [elementOrder, elements, isDesktop]
  );
  const resolvedColumnAssignments = useMemo(
    () => resolveColumnAssignments(columnAssignments, isDesktop),
    [columnAssignments, isDesktop]
  );
  const resolvedColumnGaps = useMemo(
    () => resolveColumnGaps(columnGaps, isDesktop),
    [columnGaps, isDesktop]
  );
  const resolvedColumnWidths = useMemo(
    () => resolveColumnWidths(columnWidths, isDesktop),
    [columnWidths, isDesktop]
  );
  const resolvedColumnStyles = useMemo(
    () => resolveColumnStyles(columnStyles, isDesktop),
    [columnStyles, isDesktop]
  );
  const resolvedColumnSpan = useMemo(
    () => resolveColumnSpan(columnSpan, isDesktop),
    [columnSpan, isDesktop]
  );
  const resolvedItemStyles = useMemo(
    () => resolveItemStyles(itemStyles, isDesktop),
    [itemStyles, isDesktop]
  );
  const resolvedGridMode = useMemo(
    () => resolveGridMode(gridMode, isDesktop),
    [gridMode, isDesktop]
  );
  const resolvedItemLayout = useMemo(
    () => resolveItemLayout(itemLayout, isDesktop),
    [itemLayout, isDesktop]
  );

  const resolvedContentWidth = resolveResponsiveValue(contentWidth, isMobile);
  const resolvedContentHeight = resolveResponsiveValue(contentHeight, isMobile);

  return {
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
  };
}

type BuildContentWrapperStyleParams = {
  resolvedContentWidth: string | undefined;
  resolvedContentHeight: string | undefined;
  resolvedColumnCount: number;
  gapStyle: GapStyle | undefined;
};

export function buildContentWrapperStyle({
  resolvedContentWidth,
  resolvedContentHeight,
  resolvedColumnCount,
  gapStyle,
}: BuildContentWrapperStyleParams): React.CSSProperties {
  return {
    flexDirection: "row" as const,
    alignItems: "stretch" as const,
    flexWrap: "nowrap" as const,
    minWidth: 0,
    ...(resolvedContentWidth === "hug"
      ? {
          width: "fit-content" as const,
          marginLeft: "auto" as const,
          marginRight: "auto" as const,
        }
      : resolvedContentWidth && resolvedContentWidth !== "full"
        ? {
            width: resolvedContentWidth,
            marginLeft: "auto" as const,
            marginRight: "auto" as const,
          }
        : { width: "100%" as const }),
    ...(resolvedContentHeight === "hug"
      ? { height: "fit-content" as const }
      : resolvedContentHeight && resolvedContentHeight !== "full"
        ? { height: resolvedContentHeight }
        : resolvedContentHeight === "full"
          ? { flex: "1 1 0" as const, minHeight: 0 }
          : {}),
    ...(resolvedColumnCount === 1 ? {} : gapStyle),
  };
}
