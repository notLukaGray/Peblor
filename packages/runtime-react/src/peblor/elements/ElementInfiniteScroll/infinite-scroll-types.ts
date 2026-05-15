import type { CSSProperties } from "react";
import type {
  ElementBlock,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";

export type InfiniteScrollProps = Extract<ElementBlock, { type: "elementInfiniteScroll" }>;
export type ScrollAxis = "horizontal" | "vertical";
export type SnapAlign = "start" | "center" | "end";

export type InfiniteScrollRenderedItem = {
  baseIndex: number;
  renderedIndex: number;
  block: ElementBlock;
  renderKey: string;
};

export type InfiniteScrollBlocksResult = {
  blocks: ElementBlock[];
  definitions: Record<string, SectionDefinitionBlock>;
  fallbackSelectableBaseIndex: number;
  initialRenderedIndex: number;
  itemCount: number;
  normalizedInitialIndex: number;
  renderedItems: InfiniteScrollRenderedItem[];
  selectableBaseIndexSet: Set<number>;
  selectableBaseIndices: number[];
  selectableRenderedIndices: number[];
};

export type InfiniteScrollRootStyleOptions = {
  effectiveBorderRadius: CSSProperties["borderRadius"];
  hasVisualOverlay: boolean;
  layoutStyle: CSSProperties;
  wrapperStyle?: CSSProperties;
};

export type InfiniteScrollContainerStyleOptions = {
  axis: ScrollAxis;
};

export type InfiniteScrollTrackStyleOptions = {
  alignItems: CSSProperties["alignItems"];
  axis: ScrollAxis;
  columnGap?: CSSProperties["columnGap"];
  framePaddingFallback: CSSProperties;
  gap?: CSSProperties["gap"];
  justifyContent?: CSSProperties["justifyContent"];
  padding?: CSSProperties["padding"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingTop?: CSSProperties["paddingTop"];
  rowGap?: CSSProperties["rowGap"];
};

export type InfiniteScrollItemStyleOptions = {
  activeItemStyle?: CSSProperties;
  axis: ScrollAxis;
  centerOnClick: boolean;
  inactiveItemStyle?: CSSProperties;
  isActive: boolean;
  isMoving: boolean;
  isSelectable: boolean;
  prefersReducedMotion: boolean;
  scale: number;
  snapAlign: SnapAlign;
  snapDurationMs: number;
  stretchCrossAxis: boolean;
  opacity: number;
};
