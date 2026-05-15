/**
 * Auto-layout (flexbox), absolute positioning, and constraint extraction.
 */

import type { ContentBlockProps } from "../types/peblor";
import { toPx } from "../utils/css";
import { resolveNumericVar, type BoundVarsMap } from "./layout-var-resolve";
import { getBoundingRect } from "@figma-plugin/helpers";

/**
 * Extracts auto-layout / flexbox props from a frame-like node.
 * Returns a partial ContentBlockProps suitable for merging into a section or elementGroup.
 */
export function extractAutoLayoutProps(
  node: FrameNode | ComponentNode | InstanceNode
): Partial<ContentBlockProps> {
  const props: Partial<ContentBlockProps> = {};

  if (node.layoutMode === "NONE") return props;

  const boundVars = (node as SceneNode & { boundVariables?: BoundVarsMap }).boundVariables;

  props.display = "flex";
  props.flexDirection = node.layoutMode === "HORIZONTAL" ? "row" : "column";

  // Primary axis alignment
  switch (node.primaryAxisAlignItems) {
    case "MIN":
      props.justifyContent = "flex-start";
      break;
    case "CENTER":
      props.justifyContent = "center";
      break;
    case "MAX":
      props.justifyContent = "flex-end";
      break;
    case "SPACE_BETWEEN":
      props.justifyContent = "space-between";
      break;
    default: {
      const raw = node.primaryAxisAlignItems as string;
      if (raw === "SPACE_EVENLY") props.justifyContent = "space-evenly";
      else if (raw === "SPACE_AROUND") props.justifyContent = "space-around";
      break;
    }
  }

  // Counter axis alignment
  switch (node.counterAxisAlignItems) {
    case "MIN":
      props.alignItems = "flex-start";
      break;
    case "CENTER":
      props.alignItems = "center";
      break;
    case "MAX":
      props.alignItems = "flex-end";
      break;
    case "BASELINE":
      props.alignItems = "baseline";
      break;
  }

  // Spacing — API only exposes itemSpacing as a number; "packed" / dynamic spacing often
  // still reads as 0. When geometry shows non-zero effective spacing, emit gap: "auto"
  // so the renderer omits fixed CSS gap and relies on flex + child layout (explicit
  // negative/positive itemSpacing still exports as px, e.g. -200px).
  const visibleChildCount = node.children.length;
  if (visibleChildCount >= 2) {
    if (node.itemSpacing !== 0) {
      const resolvedGap = resolveNumericVar(boundVars, "itemSpacing", node.itemSpacing, "px", node);
      props.gap = typeof resolvedGap === "number" ? toPx(resolvedGap) : resolvedGap;
    } else if (shouldEmitItemSpacingVariable(boundVars, node.itemSpacing)) {
      const resolvedGap = resolveNumericVar(boundVars, "itemSpacing", node.itemSpacing, "px", node);
      props.gap = typeof resolvedGap === "number" ? toPx(resolvedGap) : resolvedGap;
    } else {
      const inferred = inferPrimaryAxisGapFromFlowChildren(node);
      if (inferred !== undefined && Number.isFinite(inferred) && Math.abs(inferred) > 1e-3) {
        props.gap = "auto";
      }
    }
  }

  // counterAxisSpacing (multi-wrap gap on the cross axis)
  const counterAxisSpacing = (node as FrameNode & { counterAxisSpacing?: number })
    .counterAxisSpacing;
  if (typeof counterAxisSpacing === "number" && counterAxisSpacing > 0) {
    const resolvedRowGap = resolveNumericVar(
      boundVars,
      "counterAxisSpacing",
      counterAxisSpacing,
      "px",
      node
    );
    props.rowGap = typeof resolvedRowGap === "number" ? toPx(resolvedRowGap) : resolvedRowGap;
  }

  // Padding — resolve variable bindings per side
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node;
  const includeTop = shouldEmitPaddingSide(boundVars, "paddingTop", paddingTop);
  const includeRight = shouldEmitPaddingSide(boundVars, "paddingRight", paddingRight);
  const includeBottom = shouldEmitPaddingSide(boundVars, "paddingBottom", paddingBottom);
  const includeLeft = shouldEmitPaddingSide(boundVars, "paddingLeft", paddingLeft);
  const shouldEmitPadding = includeTop || includeRight || includeBottom || includeLeft;
  if (shouldEmitPadding) {
    const rTop = resolveNumericVar(boundVars, "paddingTop", paddingTop, "px", node);
    const rRight = resolveNumericVar(boundVars, "paddingRight", paddingRight, "px", node);
    const rBottom = resolveNumericVar(boundVars, "paddingBottom", paddingBottom, "px", node);
    const rLeft = resolveNumericVar(boundVars, "paddingLeft", paddingLeft, "px", node);

    const allSidesIncluded = includeTop && includeRight && includeBottom && includeLeft;
    if (allSidesIncluded && rTop === rRight && rRight === rBottom && rBottom === rLeft) {
      props.padding = formatResolvedCssUnit(rTop);
    } else {
      props.paddingTop = includeTop ? formatResolvedCssUnit(rTop) : undefined;
      props.paddingRight = includeRight ? formatResolvedCssUnit(rRight) : undefined;
      props.paddingBottom = includeBottom ? formatResolvedCssUnit(rBottom) : undefined;
      props.paddingLeft = includeLeft ? formatResolvedCssUnit(rLeft) : undefined;
    }
  }

  // Wrapping (counterAxisAlignContent / layoutWrap)
  if ("layoutWrap" in node && node.layoutWrap === "WRAP") {
    props.flexWrap = "wrap";

    const counterAxisAlignContent = (node as FrameNode & { counterAxisAlignContent?: string })
      .counterAxisAlignContent;
    if (counterAxisAlignContent) {
      const alignContentMap: Record<string, string> = {
        AUTO: "normal",
        MIN: "flex-start",
        MAX: "flex-end",
        CENTER: "center",
        SPACE_BETWEEN: "space-between",
        SPACE_AROUND: "space-around",
        BASELINE: "baseline",
      };
      const mapped = alignContentMap[counterAxisAlignContent];
      if (mapped && mapped !== "normal") props.alignContent = mapped;
    }
  }

  // Min/max constraints and sizing modes (Figma auto-layout extended API)
  const frameNode = node as FrameNode & {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
    layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
  };

  if (typeof frameNode.minWidth === "number" && frameNode.minWidth > 0)
    props.minWidth = toPx(frameNode.minWidth);
  if (typeof frameNode.maxWidth === "number" && frameNode.maxWidth < 100000)
    props.maxWidth = toPx(frameNode.maxWidth);
  if (typeof frameNode.minHeight === "number" && frameNode.minHeight > 0)
    props.minHeight = toPx(frameNode.minHeight);
  if (typeof frameNode.maxHeight === "number" && frameNode.maxHeight < 100000)
    props.maxHeight = toPx(frameNode.maxHeight);

  // Sizing modes override fixed width/height when HUG or FILL
  const parentLayoutMode = readParentLayoutMode(node);

  if (frameNode.layoutSizingHorizontal === "HUG") props.width = "fit-content";
  if (frameNode.layoutSizingHorizontal === "FILL") {
    if (parentLayoutMode === "HORIZONTAL") {
      props.wrapperStyle = {
        ...(props.wrapperStyle ?? {}),
        flex: "1 1 0%",
        minWidth: 0,
      };
    } else {
      props.width = "100%";
    }
  }
  if (frameNode.layoutSizingVertical === "HUG") props.height = "fit-content";
  if (frameNode.layoutSizingVertical === "FILL") {
    if (parentLayoutMode === "VERTICAL") {
      props.wrapperStyle = {
        ...(props.wrapperStyle ?? {}),
        flex: "1 1 0%",
        minHeight: 0,
      };
    } else {
      props.height = "100%";
    }
  }

  return props;
}

export type FigmaConstraintsPayload = {
  horizontal?: "LEFT" | "RIGHT" | "LEFT_RIGHT" | "CENTER" | "SCALE";
  vertical?: "TOP" | "BOTTOM" | "TOP_BOTTOM" | "CENTER" | "SCALE";
  x?: number;
  y?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  parentWidth?: number;
  parentHeight?: number;
};

/**
 * Raw absolute geometry for a node whose parent uses free (non-auto-layout)
 * positioning. The peblor renderer maps this to CSS via `figmaConstraints`.
 */
export function extractAbsolutePositionStyle(
  node: SceneNode & { x: number; y: number; width: number; height: number },
  parentWidth?: number,
  parentHeight?: number
): { figmaConstraints: FigmaConstraintsPayload } {
  const visualSize = getNodeVisualSize(node);
  const right =
    parentWidth !== undefined && Number.isFinite(parentWidth)
      ? parentWidth - node.x - visualSize.width
      : undefined;
  const bottom =
    parentHeight !== undefined && Number.isFinite(parentHeight)
      ? parentHeight - node.y - visualSize.height
      : undefined;

  const figmaConstraints: FigmaConstraintsPayload = {
    horizontal: "LEFT",
    vertical: "TOP",
    x: node.x,
    y: node.y,
    ...(right !== undefined && Number.isFinite(right) ? { right } : {}),
    ...(bottom !== undefined && Number.isFinite(bottom) ? { bottom } : {}),
    ...(Number.isFinite(visualSize.width) ? { width: visualSize.width } : {}),
    ...(Number.isFinite(visualSize.height) ? { height: visualSize.height } : {}),
    ...(parentWidth !== undefined && Number.isFinite(parentWidth) ? { parentWidth } : {}),
    ...(parentHeight !== undefined && Number.isFinite(parentHeight) ? { parentHeight } : {}),
  };

  return { figmaConstraints };
}

/**
 * Returns true when a node is individually marked as "absolute" within its
 * auto-layout parent.
 */
export function isAbsolutePositioned(node: SceneNode): boolean {
  return (
    "layoutPositioning" in node &&
    (node as unknown as { layoutPositioning?: string }).layoutPositioning === "ABSOLUTE"
  );
}

/**
 * Raw constraint + geometry for a node that is absolutely positioned inside an
 * auto-layout parent. The peblor maps `figmaConstraints` to CSS.
 */
export function extractConstraintPosition(
  node: SceneNode & { x: number; y: number; width: number; height: number },
  parentWidth?: number,
  parentHeight?: number
): { figmaConstraints: FigmaConstraintsPayload } {
  const visualSize = getNodeVisualSize(node);

  const constraints = (
    node as unknown as { constraints?: { horizontal: string; vertical: string } }
  ).constraints;
  const rawH = constraints?.horizontal ?? "LEFT";
  const rawV = constraints?.vertical ?? "TOP";
  const hc: NonNullable<FigmaConstraintsPayload["horizontal"]> =
    rawH === "RIGHT" || rawH === "LEFT_RIGHT" || rawH === "CENTER" || rawH === "SCALE"
      ? rawH
      : "LEFT";
  const vc: NonNullable<FigmaConstraintsPayload["vertical"]> =
    rawV === "BOTTOM" || rawV === "TOP_BOTTOM" || rawV === "CENTER" || rawV === "SCALE"
      ? rawV
      : "TOP";

  const right =
    parentWidth !== undefined && Number.isFinite(parentWidth)
      ? parentWidth - node.x - visualSize.width
      : undefined;
  const bottom =
    parentHeight !== undefined && Number.isFinite(parentHeight)
      ? parentHeight - node.y - visualSize.height
      : undefined;

  const figmaConstraints: FigmaConstraintsPayload = {
    horizontal: hc,
    vertical: vc,
    x: node.x,
    y: node.y,
    ...(right !== undefined && Number.isFinite(right) ? { right } : {}),
    ...(bottom !== undefined && Number.isFinite(bottom) ? { bottom } : {}),
    ...(Number.isFinite(visualSize.width) ? { width: visualSize.width } : {}),
    ...(Number.isFinite(visualSize.height) ? { height: visualSize.height } : {}),
    ...(parentWidth !== undefined && Number.isFinite(parentWidth) ? { parentWidth } : {}),
    ...(parentHeight !== undefined && Number.isFinite(parentHeight) ? { parentHeight } : {}),
  };

  return { figmaConstraints };
}

function getNodeVisualSize(node: SceneNode & { width: number; height: number }): {
  width: number;
  height: number;
} {
  const rotation = (node as SceneNode & { rotation?: number }).rotation ?? 0;
  if (Math.abs(rotation) < 0.01) {
    return { width: node.width, height: node.height };
  }
  try {
    const rect = getBoundingRect([node]);
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }
  } catch {
    // fall back to raw width/height below
  }
  return { width: node.width, height: node.height };
}

function readParentLayoutMode(
  node: SceneNode
): "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID" | undefined {
  const parent = node.parent;
  if (
    !parent ||
    (parent.type !== "FRAME" && parent.type !== "COMPONENT" && parent.type !== "INSTANCE")
  ) {
    return undefined;
  }
  return parent.layoutMode;
}

type SectionAlign = "left" | "center" | "right" | "full";
type SectionParentPlacement = {
  align?: SectionAlign;
  marginLeft?: string;
  marginRight?: string;
  marginTop?: string;
  marginBottom?: string;
};

function mapChildLayoutAlignToSectionAlign(value: string | undefined): SectionAlign | undefined {
  if (!value || value === "INHERIT") return undefined;
  const map: Record<string, SectionAlign> = {
    MIN: "left",
    CENTER: "center",
    MAX: "right",
    STRETCH: "full",
  };
  return map[value];
}

function mapCounterAxisAlignToSectionAlign(value: string | undefined): SectionAlign | undefined {
  if (!value || value === "BASELINE") return undefined;
  const map: Record<string, SectionAlign> = {
    MIN: "left",
    CENTER: "center",
    MAX: "right",
  };
  return map[value];
}

/**
 * Lifts parent frame auto-layout placement into section-level alignment/margins.
 * Useful when selected "section" frames are children of a padded page frame.
 */
export function extractSectionPlacementFromParent(
  node: FrameNode | ComponentNode | InstanceNode
): SectionParentPlacement {
  const parent = node.parent;
  if (
    !parent ||
    (parent.type !== "FRAME" && parent.type !== "COMPONENT" && parent.type !== "INSTANCE")
  ) {
    return {};
  }

  const parentLayoutNode = parent as FrameNode | ComponentNode | InstanceNode;
  if (parentLayoutNode.layoutMode === "NONE") return {};

  const placement: SectionParentPlacement = {};

  const childLayoutAlign = (node as SceneNode & { layoutAlign?: string }).layoutAlign;
  if (parentLayoutNode.layoutMode === "VERTICAL") {
    placement.align =
      mapChildLayoutAlignToSectionAlign(childLayoutAlign) ??
      mapCounterAxisAlignToSectionAlign(parentLayoutNode.counterAxisAlignItems);
  }

  if (parentLayoutNode.layoutMode === "VERTICAL") {
    if (parentLayoutNode.paddingLeft > 0) placement.marginLeft = toPx(parentLayoutNode.paddingLeft);
    if (parentLayoutNode.paddingRight > 0)
      placement.marginRight = toPx(parentLayoutNode.paddingRight);
  } else if (parentLayoutNode.layoutMode === "HORIZONTAL") {
    if (parentLayoutNode.paddingTop > 0) placement.marginTop = toPx(parentLayoutNode.paddingTop);
    if (parentLayoutNode.paddingBottom > 0)
      placement.marginBottom = toPx(parentLayoutNode.paddingBottom);
  }

  return placement;
}

function formatResolvedCssUnit(value: number | string): string {
  return typeof value === "number" ? toPx(value) : value;
}

function shouldEmitPaddingSide(
  boundVars: BoundVarsMap | undefined,
  key: "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft",
  fallback: number
): boolean {
  if (fallback !== 0) return true;
  const raw = boundVars?.[key];
  if (!raw) return false;
  if (Array.isArray(raw)) {
    return raw.some((entry) => entry?.type === "VARIABLE_ALIAS");
  }
  return raw.type === "VARIABLE_ALIAS";
}

function shouldEmitItemSpacingVariable(
  boundVars: BoundVarsMap | undefined,
  itemSpacing: number
): boolean {
  if (itemSpacing !== 0) return false;
  const raw = boundVars?.itemSpacing;
  if (!raw) return false;
  if (Array.isArray(raw)) {
    return raw.some((entry) => entry?.type === "VARIABLE_ALIAS");
  }
  return raw.type === "VARIABLE_ALIAS";
}

type LayoutPositioningNode = SceneNode & { layoutPositioning?: "AUTO" | "ABSOLUTE" };

function inferPrimaryAxisGapFromFlowChildren(
  node: FrameNode | ComponentNode | InstanceNode
): number | undefined {
  if (node.layoutMode !== "HORIZONTAL" && node.layoutMode !== "VERTICAL") return undefined;
  const flow = node.children.filter((c) => {
    const lp = (c as LayoutPositioningNode).layoutPositioning;
    return lp !== "ABSOLUTE";
  });
  if (flow.length < 2) return undefined;
  const a = flow[0]!;
  const b = flow[1]!;
  if (node.layoutMode === "HORIZONTAL") {
    return b.x - (a.x + a.width);
  }
  return b.y - (a.y + a.height);
}
