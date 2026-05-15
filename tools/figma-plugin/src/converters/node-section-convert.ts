/**
 * Converts Figma SECTION nodes (canvas section frames) to ElementBlocks.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { slugify, ensureUniqueId } from "../utils/slugify";
import {
  inferNodeId,
  ensureElementId,
  applyAbsPos,
  applyElementAnnotationProps,
  mergeElementMetaFigma,
  type GroupNodeParentCtx,
} from "./node-element-helpers";

type ConvertNodeFn = (
  node: SceneNode,
  ctx: ConversionContext,
  parentCtx?: GroupNodeParentCtx
) => Promise<ElementBlock | null>;

function makeFallbackGroup(
  node: SectionNode,
  ctx: ConversionContext,
  parentCtx?: GroupNodeParentCtx,
  annotations?: Record<string, string>
): ElementBlock {
  const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  ctx.warnings.push(
    `[warn] "${node.name}" (SECTION) — could not fully convert, emitting as fallback group`
  );
  const fallback: ElementBlock = {
    type: "elementGroup",
    id,
    section: { elementOrder: [], definitions: {} },
  } as ElementBlock;
  mergeElementMetaFigma(fallback, {
    sourceType: node.type,
    sourceName: node.name,
    fallbackReason: "section-conversion-fallback",
  });
  applyAbsPos(fallback, node, parentCtx);
  if (annotations) {
    applyElementAnnotationProps(fallback, node, annotations, ctx.warnings);
  }
  return fallback;
}

export async function convertSectionNode(
  node: SectionNode,
  ctx: ConversionContext,
  annotations: Record<string, string>,
  parentCtx: GroupNodeParentCtx | undefined,
  convertNodeFn: ConvertNodeFn
): Promise<ElementBlock> {
  if (!("children" in node) || !node.children.length) {
    return makeFallbackGroup(node, ctx, parentCtx, annotations);
  }

  const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  const definitions: Record<string, ElementBlock> = {};
  const elementOrder: string[] = [];
  const sectionCtx: GroupNodeParentCtx = {
    layoutMode: "NONE",
    parentWidth: typeof node.width === "number" ? node.width : undefined,
    parentHeight: typeof node.height === "number" ? node.height : undefined,
  };

  for (const child of node.children) {
    const el = await convertNodeFn(child, ctx, sectionCtx);
    if (!el) continue;
    const childId = ensureElementId(el, child.name || child.type, ctx, ctx.warnings);
    definitions[childId] = el;
    elementOrder.push(childId);
  }

  if (elementOrder.length === 0) {
    return makeFallbackGroup(node, ctx, parentCtx, annotations);
  }

  const result: ElementBlock = {
    type: "elementGroup",
    id,
    section: {
      elementOrder,
      definitions,
    },
  };
  applyAbsPos(result, node, parentCtx);
  const wrapperStyle =
    "wrapperStyle" in result && typeof result.wrapperStyle === "object" && result.wrapperStyle
      ? (result.wrapperStyle as Record<string, unknown>)
      : {};
  if (!("position" in wrapperStyle)) {
    result.wrapperStyle = { ...wrapperStyle, position: "relative" };
  }
  applyElementAnnotationProps(result, node, annotations, ctx.warnings);
  return result;
}
