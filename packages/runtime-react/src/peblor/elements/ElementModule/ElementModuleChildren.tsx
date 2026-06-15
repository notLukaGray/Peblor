"use client";

import type { CSSProperties } from "react";
import type { CssInlineStyle, ElementBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { getPbContentGuidelines } from "@pb/core/host";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { generateElementKey } from "@pb/core/keys";
import { LayoutMotionDiv } from "@/peblor/integrations/framer-motion";
import {
  getChildWrapperLayoutStyle,
  getContainerWrapperStyle,
  shouldRenderChildWrapper,
} from "./element-module-style-utils";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";
import { useDisclosureContext } from "./DisclosureContext";

type ElementModuleChildrenProps = {
  blocks: ElementBlock[];
  overlapGap?: string;
  flexDirection?: CSSProperties["flexDirection"];
  parentAlignItems?: CSSProperties["alignItems"];
  inDimensionGesture: boolean;
  isMobile: boolean;
  layoutChildren?: boolean;
  slotDefaultWrapper: Record<string, unknown>;
  getActionHandler?: (action: string | undefined, payload?: number) => (() => void) | undefined;
};

function mapCrossAxisPlacement(
  alignItems: CSSProperties["alignItems"]
): CSSProperties["justifyContent"] | CSSProperties["alignItems"] | undefined {
  if (alignItems === "center") return "center";
  if (alignItems === "flex-end" || alignItems === "end") return "flex-end";
  if (alignItems === "flex-start" || alignItems === "start") return "flex-start";
  return undefined;
}

export function ElementModuleChildren({
  blocks,
  overlapGap,
  flexDirection = "row",
  parentAlignItems,
  inDimensionGesture,
  isMobile,
  layoutChildren,
  slotDefaultWrapper,
  getActionHandler,
}: ElementModuleChildrenProps) {
  const disclosure = useDisclosureContext();
  const resolvedParentAlignItems =
    parentAlignItems ?? getPbContentGuidelines().frameAlignItemsDefault;
  return blocks.map((block, index) => {
    const key = generateElementKey(block, index);
    const blockId = (block as ElementBlock & { id?: string }).id;
    const action = (block as ElementBlock & { action?: string }).action;
    const actionPayload = (block as ElementBlock & { actionPayload?: number }).actionPayload;
    const handler = getActionHandler?.(action, actionPayload);
    const isDisclosureTrigger = !!(blockId && disclosure?.triggerKeys.has(blockId));
    // elementGroup blocks apply their own wrapperStyle internally via
    // ElementModuleGroup's resolvedGroupWrapperStyle — applying it here too
    // creates a double visual (e.g. two pill boxes on a kicker badge, or a
    // backgroundColor rectangle behind a borderRadius: 999px pill).
    // Other element types (elementBody, elementHeading, elementLink, etc.)
    // apply wrapperStyle via computeVisualStyle, so skip them too.
    const elWrapperStyle: CssInlineStyle | undefined = undefined;
    const resolvedElWrapperStyle = lowerThemeStyleObject(elWrapperStyle) ?? {};
    const baseWrapperStyle = (
      handler
        ? {
            ...lowerThemeStyleObject(slotDefaultWrapper),
            ...resolvedElWrapperStyle,
          }
        : resolvedElWrapperStyle
    ) as CSSProperties;
    const wrapperStyle = getContainerWrapperStyle(baseWrapperStyle);
    const blockWidth = (block as ElementBlock & { width?: unknown }).width;
    const blockMaxWidth = (block as ElementBlock & { maxWidth?: unknown }).maxWidth;
    const blockHeight = (block as ElementBlock & { height?: unknown }).height;
    const blockMaxHeight = (block as ElementBlock & { maxHeight?: unknown }).maxHeight;
    const isConstrainedFullWidthChild =
      blockWidth === "100%" && typeof blockMaxWidth === "string" && blockMaxWidth.trim().length > 0;
    const isConstrainedFullHeightChild =
      blockHeight === "100%" &&
      typeof blockMaxHeight === "string" &&
      blockMaxHeight.trim().length > 0;
    const isColumnLikeParent = flexDirection === "column" || flexDirection === "column-reverse";
    const isRowLikeParent = flexDirection === "row" || flexDirection === "row-reverse";
    const crossAxisPlacement = mapCrossAxisPlacement(resolvedParentAlignItems);
    const shouldApplyConstrainedStretchPlacement =
      wrapperStyle.alignSelf === "stretch" &&
      crossAxisPlacement != null &&
      ((isColumnLikeParent && isConstrainedFullWidthChild) ||
        (isRowLikeParent && isConstrainedFullHeightChild));
    const cellStyleBase: CSSProperties = inDimensionGesture
      ? { width: "100%", height: "100%", ...wrapperStyle }
      : wrapperStyle;
    const cellLayoutStyle = getChildWrapperLayoutStyle(block, isMobile);
    const overlapOffsetStyle: CSSProperties =
      overlapGap && index > 0
        ? flexDirection === "column" || flexDirection === "column-reverse"
          ? { marginTop: overlapGap }
          : { marginLeft: overlapGap }
        : {};
    const constrainedStretchPlacementStyle: CSSProperties = shouldApplyConstrainedStretchPlacement
      ? isColumnLikeParent
        ? { display: "flex", justifyContent: crossAxisPlacement as CSSProperties["justifyContent"] }
        : { display: "flex", alignItems: crossAxisPlacement as CSSProperties["alignItems"] }
      : {};
    const wrapperFlex = wrapperStyle.flex;
    const hasFlexGrowWrapper = typeof wrapperFlex === "string" && /^\s*\d/.test(wrapperFlex);
    const isClippedGroupWithoutExplicitHeight =
      block.type === "elementGroup" &&
      (block as ElementBlock & { overflow?: unknown }).overflow === "hidden" &&
      (blockHeight == null || blockHeight === "fit-content");
    const clippedFlexContainStyle: CSSProperties =
      hasFlexGrowWrapper && isClippedGroupWithoutExplicitHeight
        ? {
            display: constrainedStretchPlacementStyle.display ?? "flex",
            alignItems:
              (constrainedStretchPlacementStyle.alignItems as CSSProperties["alignItems"]) ??
              "stretch",
          }
        : {};
    // In a column flex parent, a width:100% child needs the cell wrapper to
    // stretch across the cross axis or WebKit can resolve the percentage width
    // against a content-sized wrapper during client navigation.
    const childRequestsFullWidth = blockWidth === "100%" && !isConstrainedFullWidthChild;
    const fullWidthColumnStretchStyle: CSSProperties =
      isColumnLikeParent && childRequestsFullWidth
        ? {
            alignSelf: "stretch",
            minWidth: 0,
            maxWidth: "100%",
          }
        : {};
    const resolvedBlockWidth = resolveResponsiveValue(
      blockWidth as string | [string, string] | undefined,
      isMobile
    );
    const resolvedBlockHeight = resolveResponsiveValue(
      blockHeight as string | [string, string] | undefined,
      isMobile
    );
    // Column + height:100% (or row + width:100%): the inner element needs a bounded flex item.
    // A wrapper with only shrink-0 sizes to content, so percentage height never resolves and
    // nested overflow (e.g. Work index elementInfiniteScroll) cannot scroll.
    const columnChildFillsMainAxis = isColumnLikeParent && resolvedBlockHeight === "100%";
    const rowChildFillsMainAxis = isRowLikeParent && resolvedBlockWidth === "100%";
    const flexParentAxisFillStyle: CSSProperties = columnChildFillsMainAxis
      ? {
          flex: "1 1 0%",
          minHeight: 0,
          minWidth: 0,
          alignSelf: "stretch",
        }
      : rowChildFillsMainAxis
        ? {
            flex: "1 1 0%",
            minHeight: 0,
            minWidth: 0,
          }
        : {};
    const cellStyle: CSSProperties = {
      ...cellLayoutStyle,
      ...cellStyleBase,
      ...overlapOffsetStyle,
      ...constrainedStretchPlacementStyle,
      ...clippedFlexContainStyle,
      ...fullWidthColumnStretchStyle,
      ...flexParentAxisFillStyle,
    };
    const flexFillWrapperClass =
      columnChildFillsMainAxis || rowChildFillsMainAxis ? "min-h-0 min-w-0" : "shrink-0 min-w-0";
    const content = <ElementRenderer key={key} block={block} />;

    if (handler || isDisclosureTrigger) {
      return (
        <button
          key={key}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handler?.();
            if (isDisclosureTrigger) disclosure?.toggle();
          }}
          className="flex shrink-0 min-w-0 items-center justify-center text-white rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ cursor: "pointer", ...cellStyle }}
          aria-label={action ?? "Toggle disclosure"}
        >
          {content}
        </button>
      );
    }

    if (layoutChildren) {
      return (
        <LayoutMotionDiv key={key} className={flexFillWrapperClass} style={cellStyle}>
          {content}
        </LayoutMotionDiv>
      );
    }

    const needsWrapperForOverlap = !!(overlapGap && index > 0);
    if (
      !needsWrapperForOverlap &&
      !shouldRenderChildWrapper({
        hasHandler: false,
        layoutChildren: false,
        style: cellStyle,
      })
    ) {
      return content;
    }

    return (
      <div key={key} className={flexFillWrapperClass} style={cellStyle}>
        {content}
      </div>
    );
  });
}
