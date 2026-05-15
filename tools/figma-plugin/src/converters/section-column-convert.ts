/**
 * Converts frame nodes to sectionColumn peblor section blocks.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { convertNode } from "./node-to-element";
import { extractSectionFillPayload } from "./fills-image";
import {
  extractAutoLayoutProps,
  extractLayoutProps,
  extractBorderProps,
  extractSectionPlacementFromParent,
} from "./layout";
import { extractColumnGrid, snapToColumn, type ColumnGridInfo } from "./layout-grid";
import {
  extractBoxShadow,
  extractFilter,
  extractBackdropFilter,
  extractGlassEffect,
} from "./effects";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { toPx } from "../utils/css";
import { parseNodeAnnotations, stripAnnotations } from "./annotations-parse";
import { parseSectionTriggerProps } from "./section-triggers";
import { getVisibleChildren, warnRepeatedStructuralSignatures } from "./structure-hints";
import { getInspectableBackgroundAsync } from "./node-css";
import { ensureElementId, type GroupNodeParentCtx } from "./node-element-helpers";
import { applySectionFillAnnotationOverride } from "./section-annotation-fill-override";
import { EXPORT_DROP_REASON, recordConverterDrop } from "../export-parity";

function isColumnContainer(
  node: SceneNode
): node is FrameNode | GroupNode | ComponentNode | InstanceNode {
  return (
    node.type === "FRAME" ||
    node.type === "GROUP" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  );
}

/**
 * Minimal representation of a sectionColumn section block as emitted by this converter.
 */
export interface SectionColumnBlock {
  type: "sectionColumn";
  id: string;
  elements: ElementBlock[];
  columns: number;
  columnAssignments: Record<string, number>;
  columnWidths?: string[];
  columnGaps?: string;
  columnStyles?: Array<Record<string, unknown>>;
  elementOrder?: string[];
  fill?: string;
  width?: string;
  height?: string;
  overflow?: string;
  borderRadius?: string;
  [key: string]: unknown;
}

function isFrameLikeAutoLayout(node: SceneNode): node is FrameNode | ComponentNode | InstanceNode {
  return node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE";
}

function toCssUnit(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return toPx(value);
  return undefined;
}

function buildNodeParentCtx(node: SceneNode): GroupNodeParentCtx {
  const layoutMode =
    node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE"
      ? node.layoutMode
      : "NONE";
  const hasWidth = "width" in node && typeof node.width === "number";
  const hasHeight = "height" in node && typeof node.height === "number";
  return {
    layoutMode,
    parentWidth: hasWidth ? node.width : undefined,
    parentHeight: hasHeight ? node.height : undefined,
  };
}

function extractSectionPaddingMarginsFromAutoLayout(autoLayout: Record<string, unknown>): {
  marginLeft?: string;
  marginRight?: string;
  marginTop?: string;
  marginBottom?: string;
} {
  const placement: {
    marginLeft?: string;
    marginRight?: string;
    marginTop?: string;
    marginBottom?: string;
  } = {};

  const padding = toCssUnit(autoLayout.padding);
  if (padding) {
    placement.marginTop = padding;
    placement.marginRight = padding;
    placement.marginBottom = padding;
    placement.marginLeft = padding;
    return placement;
  }

  const paddingTop = toCssUnit(autoLayout.paddingTop);
  const paddingRight = toCssUnit(autoLayout.paddingRight);
  const paddingBottom = toCssUnit(autoLayout.paddingBottom);
  const paddingLeft = toCssUnit(autoLayout.paddingLeft);

  if (paddingTop) placement.marginTop = paddingTop;
  if (paddingRight) placement.marginRight = paddingRight;
  if (paddingBottom) placement.marginBottom = paddingBottom;
  if (paddingLeft) placement.marginLeft = paddingLeft;

  return placement;
}

async function extractColumnStyle(node: SceneNode): Promise<Record<string, unknown>> {
  const style: Record<string, unknown> = {};

  if (isFrameLikeAutoLayout(node)) {
    const auto = extractAutoLayoutProps(node);
    if (typeof auto.justifyContent === "string") style.justifyContent = auto.justifyContent;
    if (typeof auto.alignItems === "string") style.alignItems = auto.alignItems;
    if (typeof auto.gap === "string") style.gap = auto.gap;

    const padding = toCssUnit(auto.padding);
    if (padding) {
      style.padding = padding;
    } else {
      const top = toCssUnit(auto.paddingTop);
      const right = toCssUnit(auto.paddingRight);
      const bottom = toCssUnit(auto.paddingBottom);
      const left = toCssUnit(auto.paddingLeft);
      if (top || right || bottom || left) {
        style.padding = `${top ?? "0px"} ${right ?? "0px"} ${bottom ?? "0px"} ${left ?? "0px"}`;
      }
    }
  }

  if ("clipsContent" in node && (node as FrameNode).clipsContent) {
    style.overflow = "hidden";
  }

  if ("fills" in node && "width" in node && "height" in node) {
    const fillPayload = extractSectionFillPayload((node as FrameNode).fills as readonly Paint[], {
      width: (node as FrameNode).width,
      height: (node as FrameNode).height,
    });
    if (fillPayload?.fill) style.fill = fillPayload.fill;
  }

  if ("effects" in node) {
    const glassEffect = extractGlassEffect((node as FrameNode).effects, node);
    if (glassEffect) style.effects = [glassEffect];
  }

  const layout = extractLayoutProps(node as FrameNode);
  if (layout.borderRadius) style.borderRadius = layout.borderRadius;

  return style;
}

/**
 * Converts a frame with a Figma COLUMN layout grid to a sectionColumn block.
 */
async function convertGridFrameToColumnSection(
  frame: FrameNode,
  ctx: ConversionContext,
  grid: ColumnGridInfo
): Promise<SectionColumnBlock> {
  const rawName = stripAnnotations(frame.name || "");
  const id = ensureUniqueId(slugify(rawName || "section"), ctx.usedIds);
  const annotations = parseNodeAnnotations(
    frame as unknown as { name?: string } & Record<string, unknown>
  );

  const elements: ElementBlock[] = [];
  const columnAssignments: Record<string, number> = {};
  const elementOrder: string[] = [];

  const children =
    "children" in frame ? (frame as unknown as { children: SceneNode[] }).children : [];

  const visibleChildren = getVisibleChildren(children);
  const columnChildren = visibleChildren.filter(isColumnContainer);
  const columnChildSet = new Set<SceneNode>(columnChildren);
  const inferImplicitColumns =
    columnChildren.length === 0 && visibleChildren.length >= 2 && frame.layoutMode === "HORIZONTAL";
  const implicitColumnOrder = inferImplicitColumns
    ? [...visibleChildren].sort((a, b) => ("x" in a ? a.x : 0) - ("x" in b ? b.x : 0))
    : [];
  const implicitColumnIndex = new Map<SceneNode, number>();
  implicitColumnOrder.forEach((child, index) => implicitColumnIndex.set(child, index));
  const frameParentCtx = buildNodeParentCtx(frame);

  for (const child of children) {
    if (isColumnContainer(child) && columnChildSet.has(child)) {
      const colIdx = columnChildren.indexOf(child);
      const colChildren = "children" in child ? (child.children as readonly SceneNode[]) : [];
      const columnParentCtx = buildNodeParentCtx(child);

      for (const subChild of colChildren) {
        try {
          const el = await convertNode(subChild, ctx, columnParentCtx);
          if (!el) continue;

          const elId = ensureElementId(el, subChild.name || subChild.type, ctx, ctx.warnings);
          elements.push(el);
          elementOrder.push(elId);
          columnAssignments[elId] = colIdx;
        } catch (err) {
          recordConverterDrop(ctx, EXPORT_DROP_REASON.COLUMN_CHILD_ERROR, {
            nodeName: subChild.name,
            nodeType: subChild.type,
          });
          ctx.warnings.push(
            `[error] section-column (grid): error converting child "${subChild.name}" in column ${colIdx + 1}: ${String(err)}`
          );
        }
      }
      continue;
    }

    let el: ElementBlock | null = null;
    try {
      el = await convertNode(child, ctx, frameParentCtx);
    } catch (err) {
      recordConverterDrop(ctx, EXPORT_DROP_REASON.COLUMN_CHILD_ERROR, {
        nodeName: child.name,
        nodeType: child.type,
      });
      ctx.warnings.push(
        `[error] section-column (grid): error converting child "${child.name}": ${String(err)}`
      );
      continue;
    }
    if (!el) continue;

    const elId = ensureElementId(el, child.name || child.type, ctx, ctx.warnings);
    elements.push(el);
    elementOrder.push(elId);

    if (inferImplicitColumns) {
      const implicitIndex = implicitColumnIndex.get(child);
      if (typeof implicitIndex === "number") {
        columnAssignments[elId] = implicitIndex;
      }
    } else {
      const childX = "x" in child ? (child as { x: number }).x : 0;
      const childWidth = "width" in child ? (child as { width: number }).width : grid.columnWidthPx;
      const { column } = snapToColumn(childX, childWidth, grid);
      columnAssignments[elId] = Math.max(0, column - 1);
    }
  }

  const columnWidths: string[] = inferImplicitColumns
    ? Array(visibleChildren.length).fill("1fr")
    : Array<string>(grid.count).fill("1fr");

  const section: SectionColumnBlock = {
    type: "sectionColumn",
    id,
    elements,
    columns: inferImplicitColumns ? visibleChildren.length : grid.count,
    columnAssignments,
    columnWidths,
    columnGaps: `${grid.gutterPx}px`,
    ...(elementOrder.length > 0 ? { elementOrder } : {}),
  };

  let fillPayload = extractSectionFillPayload(frame.fills as readonly Paint[], {
    width: frame.width,
    height: frame.height,
  });
  const hasImageFillTop = (frame.fills as readonly Paint[]).some(
    (fill) => fill.type === "IMAGE" && fill.visible !== false
  );
  const inspectBackgroundTop = !hasImageFillTop
    ? await getInspectableBackgroundAsync(frame)
    : undefined;
  if (inspectBackgroundTop) {
    fillPayload = { fill: inspectBackgroundTop };
  }
  if (fillPayload?.fill) section.fill = fillPayload.fill;
  if (fillPayload?.layers) (section as Record<string, unknown>).layers = fillPayload.layers;

  const borderRadius = extractLayoutProps(frame).borderRadius;
  if (borderRadius) (section as Record<string, unknown>)["borderRadius"] = borderRadius;

  const boxShadow = extractBoxShadow(frame.effects);
  if (boxShadow) section.boxShadow = boxShadow;
  const filter = extractFilter(frame.effects);
  if (filter) section.filter = filter;
  const backdropFilter = extractBackdropFilter(frame.effects);
  if (backdropFilter) {
    section.backdropFilter = backdropFilter;
    (section as Record<string, unknown>).WebkitBackdropFilter = backdropFilter;
  }
  const glassEffect = extractGlassEffect(frame.effects, frame);
  const figmaEffects: unknown[] = glassEffect ? [glassEffect] : [];
  if (figmaEffects.length > 0) (section as Record<string, unknown>).effects = figmaEffects;

  section.width = `${Math.round(frame.width)}px`;

  const triggerProps = parseSectionTriggerProps(annotations);
  const mergedEffects = [
    ...figmaEffects,
    ...(Array.isArray(triggerProps.effects) ? triggerProps.effects : []),
  ];
  if (mergedEffects.length > 0) triggerProps.effects = mergedEffects;
  Object.assign(section, triggerProps);

  if (annotations["fill"]) {
    applySectionFillAnnotationOverride(section as Record<string, unknown>, annotations["fill"]);
  }

  warnRepeatedStructuralSignatures(frame.name || rawName, elements, ctx.warnings, "children", {
    suppress: ctx.autoPresets,
  });

  return section;
}

/**
 * Converts a horizontal Figma frame to a `sectionColumn` peblor section.
 */
export async function convertFrameToColumnSection(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<SectionColumnBlock> {
  // Grid-based conversion for frames with layout grids but no auto-layout
  if ((frame.layoutMode === "NONE" || !("layoutMode" in frame)) && "width" in frame) {
    const grid = extractColumnGrid(frame, frame.width);
    if (grid && grid.count >= 2) {
      return convertGridFrameToColumnSection(frame, ctx, grid);
    }
  }

  const annotations = parseNodeAnnotations(
    frame as unknown as { name?: string } & Record<string, unknown>
  );
  const rawName = stripAnnotations(frame.name || "section");
  const sectionId = ensureUniqueId(slugify(rawName), ctx.usedIds);

  const elements: ElementBlock[] = [];
  const columnAssignments: Record<string, number> = {};
  const elementOrder: string[] = [];

  const visibleChildren = (frame.children as readonly SceneNode[]).filter(
    (child) => (child as { visible?: boolean }).visible !== false
  );
  const allChildren = frame.children as readonly SceneNode[];
  const columnChildren = visibleChildren.filter(isColumnContainer);
  const columnChildSet = new Set<SceneNode>(columnChildren);
  const looseChildren = visibleChildren.filter((child) => !isColumnContainer(child));
  const inferImplicitColumns =
    columnChildren.length === 0 && visibleChildren.length >= 2 && frame.layoutMode === "HORIZONTAL";
  const columnIndexByNode = new Map<FrameNode | GroupNode | ComponentNode | InstanceNode, number>();
  const columnCenters = columnChildren.map((colFrame, index) => {
    columnIndexByNode.set(colFrame, index);
    const x = "x" in colFrame ? colFrame.x : 0;
    const width = "width" in colFrame ? colFrame.width : 0;
    return x + width / 2;
  });
  const frameParentCtx = buildNodeParentCtx(frame);

  const assignLooseChildToColumn = (child: SceneNode): number => {
    if (columnCenters.length === 0) {
      const implicitIndex = visibleChildren.indexOf(child);
      return inferImplicitColumns ? (implicitIndex >= 0 ? implicitIndex : 0) : 0;
    }

    const childX = "x" in child ? (child as { x: number }).x : 0;
    const childWidth = "width" in child ? (child as { width: number }).width : 0;
    const childCenter = childX + childWidth / 2;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < columnCenters.length; index++) {
      const distance = Math.abs(columnCenters[index] - childCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }
    return nearestIndex;
  };

  for (const child of allChildren) {
    if (isColumnContainer(child) && columnChildSet.has(child)) {
      const colIdx = columnIndexByNode.get(child) ?? 0;
      const colChildren = "children" in child ? (child.children as readonly SceneNode[]) : [];
      const columnParentCtx = buildNodeParentCtx(child);

      for (const subChild of colChildren) {
        try {
          const converted = await convertNode(subChild, ctx, columnParentCtx);
          if (converted !== null) {
            const elId = ensureElementId(
              converted,
              subChild.name || subChild.type,
              ctx,
              ctx.warnings
            );
            columnAssignments[elId] = colIdx;
            elementOrder.push(elId);
            elements.push(converted);
          }
        } catch (err) {
          recordConverterDrop(ctx, EXPORT_DROP_REASON.COLUMN_CHILD_ERROR, {
            nodeName: subChild.name,
            nodeType: subChild.type,
          });
          ctx.warnings.push(
            `[error] section-column: error converting child "${subChild.name}" in column ${colIdx + 1}: ${String(err)}`
          );
        }
      }
      continue;
    }

    try {
      const converted = await convertNode(child, ctx, frameParentCtx);
      if (converted !== null) {
        const elId = ensureElementId(converted, child.name || child.type, ctx, ctx.warnings);
        columnAssignments[elId] = assignLooseChildToColumn(child);
        elementOrder.push(elId);
        elements.push(converted);
      }
    } catch (err) {
      recordConverterDrop(ctx, EXPORT_DROP_REASON.COLUMN_CHILD_ERROR, {
        nodeName: child.name,
        nodeType: child.type,
      });
      ctx.warnings.push(
        `[error] section-column: error converting loose child "${child.name}": ${String(err)}`
      );
    }
  }

  const allColumnWidths = columnChildren.map((c) =>
    "width" in c ? (c as { width: number }).width : 0
  );
  const allEqual =
    allColumnWidths.length > 0 &&
    allColumnWidths.every((w) => Math.abs(w - allColumnWidths[0]) < 1);
  const columnCount = inferImplicitColumns
    ? visibleChildren.length
    : Math.max(columnChildren.length, 1);
  const columnWidths: string[] = inferImplicitColumns
    ? Array(columnCount).fill("1fr")
    : allColumnWidths.length === 0
      ? Array(columnCount).fill("1fr")
      : allEqual
        ? Array(columnCount).fill("1fr")
        : allColumnWidths.map((w) => toPx(w));

  const columnGaps: string | undefined =
    frame.itemSpacing !== 0
      ? toPx(frame.itemSpacing)
      : frame.primaryAxisAlignItems === "SPACE_BETWEEN" && columnCount > 1
        ? "auto"
        : undefined;

  const columnStyles: Array<Record<string, unknown>> | undefined =
    !inferImplicitColumns && columnChildren.length > 0
      ? (await Promise.all(columnChildren.map((child) => extractColumnStyle(child)))).map(
          (style) => style
        )
      : undefined;

  const layout = extractLayoutProps(frame);
  const autoLayout = extractAutoLayoutProps(frame);
  const sectionPlacement = extractSectionPlacementFromParent(frame);
  const fills = frame.fills as Paint[];
  let fillPayload = extractSectionFillPayload(fills, { width: frame.width, height: frame.height });
  const hasImageFill = fills.some((fill) => fill.type === "IMAGE" && fill.visible !== false);
  const inspectBackground = !hasImageFill ? await getInspectableBackgroundAsync(frame) : undefined;
  if (inspectBackground) {
    fillPayload = { fill: inspectBackground };
  }
  const borderProps = extractBorderProps(frame);
  const effects = frame.effects;
  const boxShadow = extractBoxShadow(effects);
  const filter = extractFilter(effects);
  const backdropFilter = extractBackdropFilter(effects);
  const glassEffect = extractGlassEffect(effects, frame);
  const figmaEffects: unknown[] = glassEffect ? [glassEffect] : [];

  const { paddingTop, paddingRight, paddingBottom, paddingLeft, padding, ...autoLayoutNoPadding } =
    autoLayout as Record<string, unknown>;
  const sectionPaddingPlacement = extractSectionPaddingMarginsFromAutoLayout(
    autoLayout as Record<string, unknown>
  );
  void paddingTop;
  void paddingRight;
  void paddingBottom;
  void paddingLeft;
  void padding;

  const sectionRecord: Record<string, unknown> = {
    type: "sectionColumn",
    id: sectionId,
    elements,
    columns: columnCount,
    columnAssignments,
    ...(columnWidths.length > 0 ? { columnWidths } : {}),
    ...(columnGaps !== undefined ? { columnGaps } : {}),
    ...(columnStyles && columnStyles.some((style) => Object.keys(style).length > 0)
      ? { columnStyles }
      : {}),
    ...(elementOrder.length > 0 ? { elementOrder } : {}),
    width: toPx(frame.width),
    height: toPx(frame.height),
    ...sectionPlacement,
    ...sectionPaddingPlacement,
    ...(fillPayload?.fill ? { fill: fillPayload.fill } : {}),
    ...(fillPayload?.layers ? { layers: fillPayload.layers } : {}),
    ...borderProps,
    ...(boxShadow ? { boxShadow } : {}),
    ...(filter ? { filter } : {}),
    ...(backdropFilter ? { backdropFilter, WebkitBackdropFilter: backdropFilter } : {}),
    ...autoLayoutNoPadding,
    overflow: frame.clipsContent ? "hidden" : undefined,
    ...(layout.borderRadius !== undefined ? { borderRadius: layout.borderRadius } : {}),
    ...(layout.opacity !== undefined ? { opacity: layout.opacity } : {}),
    ...(layout.blendMode ? { blendMode: layout.blendMode } : {}),
    ...(figmaEffects.length > 0 ? { effects: figmaEffects } : {}),
  };
  const section = sectionRecord as unknown as SectionColumnBlock;

  if (annotations["fill"]) {
    applySectionFillAnnotationOverride(sectionRecord, annotations["fill"]);
  }
  if (annotations["overflow"]) section.overflow = annotations["overflow"];
  if (annotations["hidden"] === "true") section.hidden = true;

  const triggerProps = parseSectionTriggerProps(annotations);
  const mergedEffects = [
    ...figmaEffects,
    ...(Array.isArray(triggerProps.effects) ? triggerProps.effects : []),
  ];
  if (mergedEffects.length > 0) triggerProps.effects = mergedEffects;
  Object.assign(section, triggerProps);

  warnRepeatedStructuralSignatures(frame.name || rawName, elements, ctx.warnings, "children", {
    suppress: ctx.autoPresets,
  });

  if (inferImplicitColumns) {
    ctx.warnings.push(
      `section-column: frame "${frame.name || rawName}" inferred ${columnCount} implicit column${columnCount === 1 ? "" : "s"} from horizontal layout; add explicit column wrappers or [pb: type=sectionColumn] to lock the structure`
    );
  } else if (
    looseChildren.length > 0 ||
    (columnChildren.length === 0 && visibleChildren.length > 0)
  ) {
    ctx.warnings.push(
      `section-column: frame "${frame.name || rawName}" used fallback column assignment for mixed/invalid direct children; loose nodes were mapped to the nearest column and a single fallback column was created when needed`
    );
  }

  return section;
}
