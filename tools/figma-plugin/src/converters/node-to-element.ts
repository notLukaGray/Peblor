/**
 * Node type router.
 * Dispatches a SceneNode to the appropriate element converter based on node.type.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { convertTextNode } from "./text";
import { convertImageNode } from "./image";
import { convertVectorNode } from "./vector";
import { extractImageFill } from "./fills-image";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { toPx } from "../utils/css";
import {
  parseNodeAnnotations,
  findUnsupportedAnnotationKeys,
  ELEMENT_SUPPORTED_ANNOTATION_KEYS,
} from "./annotations-parse";
import { buildMotionTiming } from "./motion";
import { isLikelyButton, convertButtonNode, inferButtonInferenceMeta } from "./button";
import { isVideoNode, convertVideoNode, inferVideoInferenceMeta } from "./video";
import { inferImageInferenceMeta } from "./element-media-detect";
import { buildVariantElement } from "./component-variants";
import { convertGroupNode, convertRichTextNode } from "./node-element-group";
import {
  inferNodeId,
  applyElementAnnotationProps,
  applyAbsPos,
  mergeElementMetaFigma,
  type GroupNodeParentCtx,
} from "./node-element-helpers";
import { convertInstanceNode } from "./node-instance-convert";
import { convertSectionNode } from "./node-section-convert";
import { EXPORT_DROP_REASON, getOrCreateExportParity, recordConverterDrop } from "../export-parity";

export type { GroupNodeParentCtx };

void buildMotionTiming; // referenced transitively via applyElementAnnotationProps

function isVectorLikeType(type: SceneNode["type"]): boolean {
  return (
    type === "VECTOR" ||
    type === "BOOLEAN_OPERATION" ||
    type === "STAR" ||
    type === "POLYGON" ||
    type === "LINE" ||
    type === "ELLIPSE"
  );
}

function isCompositeVectorFrame(node: SceneNode): boolean {
  if (node.type !== "FRAME" && node.type !== "GROUP") return false;
  if (!("children" in node) || node.children.length === 0) return false;
  if (node.type === "FRAME" && node.layoutMode !== "NONE") return false;
  return node.children.every((child) => isVectorLikeType(child.type));
}

function finalizeConvertNodeResult(
  ctx: ConversionContext,
  node: SceneNode,
  result: ElementBlock | null
): ElementBlock | null {
  if (result === null) {
    getOrCreateExportParity(ctx);
    recordConverterDrop(ctx, EXPORT_DROP_REASON.CONVERT_NODE_NULL, {
      nodeName: node.name,
      nodeType: node.type,
    });
  }
  return result;
}

function buildFallbackGroupForNode(
  node: SceneNode,
  ctx: ConversionContext,
  annotations: Record<string, string>,
  reason: string,
  parentCtx?: GroupNodeParentCtx
): ElementBlock {
  const fallbackId = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  const fallback: ElementBlock = {
    type: "elementGroup",
    id: fallbackId,
    section: { elementOrder: [], definitions: {} },
    ...("width" in node && typeof node.width === "number" ? { width: toPx(node.width) } : {}),
    ...("height" in node && typeof node.height === "number" ? { height: toPx(node.height) } : {}),
  } as ElementBlock;
  mergeElementMetaFigma(fallback, {
    sourceType: node.type,
    sourceName: node.name,
    fallbackReason: reason,
  });
  applyAbsPos(fallback, node, parentCtx);
  applyElementAnnotationProps(fallback, node, annotations, ctx.warnings);
  ctx.warnings.push(
    `[node-router] "${node.name}" (${node.type}) — emitted fallback elementGroup (${reason})`
  );
  return fallback;
}

/**
 * Converts a SceneNode to a peblor ElementBlock.
 * Returns null for nodes that cannot be represented in the peblor schema.
 */
export async function convertNode(
  node: SceneNode,
  ctx: ConversionContext,
  parentCtx?: GroupNodeParentCtx
): Promise<ElementBlock | null> {
  return finalizeConvertNodeResult(ctx, node, await convertNodeImpl(node, ctx, parentCtx));
}

async function convertNodeImpl(
  node: SceneNode,
  ctx: ConversionContext,
  parentCtx?: GroupNodeParentCtx
): Promise<ElementBlock | null> {
  const annotations = parseNodeAnnotations(
    node as unknown as { name?: string } & Record<string, unknown>
  );
  const unsupportedKeys = findUnsupportedAnnotationKeys(
    annotations,
    ELEMENT_SUPPORTED_ANNOTATION_KEYS
  );
  if (unsupportedKeys.length > 0) {
    ctx.warnings.push(
      `[annotations] "${node.name}" (${node.type}) has unsupported annotation key(s): ${unsupportedKeys.join(", ")}`
    );
  }

  // Annotation type overrides — bypass normal heuristic routing
  if (annotations.type === "button") {
    const result = await convertButtonNode(node, ctx, annotations);
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }
  if (annotations.type === "spacer") {
    const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
    const result: ElementBlock = {
      type: "elementSpacer",
      id,
      width: "width" in node ? toPx((node as { width: number }).width) : undefined,
      height: "height" in node ? toPx((node as { height: number }).height) : undefined,
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }
  if (annotations.type === "svg") {
    const result = await convertVectorNode(node as VectorNode, ctx);
    if (result) {
      applyAbsPos(result, node, parentCtx);
      applyElementAnnotationProps(result, node, annotations, ctx.warnings);
      return result;
    }
    return buildFallbackGroupForNode(
      node,
      ctx,
      annotations,
      "annotated-svg-conversion-failed",
      parentCtx
    );
  }
  if (annotations.type === "image") {
    const result = await convertImageNode(node as RectangleNode, ctx, parentCtx);
    if (result) {
      applyAbsPos(result, node, parentCtx);
      applyElementAnnotationProps(result, node, annotations, ctx.warnings);
      return result;
    }
    return buildFallbackGroupForNode(
      node,
      ctx,
      annotations,
      "annotated-image-conversion-failed",
      parentCtx
    );
  }

  // Video detection
  if (isVideoNode(node, annotations)) {
    const result = await convertVideoNode(node, ctx, annotations);
    if (result) {
      const infer = inferVideoInferenceMeta(node, annotations);
      if (infer) mergeElementMetaFigma(result, { inference: infer });
      applyAbsPos(result, node, parentCtx);
      applyElementAnnotationProps(result, node, annotations, ctx.warnings);
      return result;
    }
    return buildFallbackGroupForNode(node, ctx, annotations, "video-conversion-failed", parentCtx);
  }

  switch (node.type) {
    case "TEXT": {
      if (
        node.textStyleId === figma.mixed ||
        node.fontName === figma.mixed ||
        node.fontSize === figma.mixed ||
        node.fills === figma.mixed ||
        node.textCase === figma.mixed ||
        node.textDecoration === figma.mixed
      ) {
        const result = await convertRichTextNode(node, ctx);
        if (result) {
          applyAbsPos(result, node, parentCtx);
          applyElementAnnotationProps(result, node, annotations, ctx.warnings);
        }
        return result;
      }
      const result: ElementBlock | null = await convertTextNode(node, ctx);
      if (result) {
        applyAbsPos(result, node, parentCtx);
        applyElementAnnotationProps(result, node, annotations, ctx.warnings);
      }
      return result;
    }

    case "VECTOR":
    case "BOOLEAN_OPERATION":
    case "STAR":
    case "POLYGON":
    case "LINE": {
      const result = await convertVectorNode(node, ctx);
      if (result) {
        applyAbsPos(result, node, parentCtx);
        applyElementAnnotationProps(result, node, annotations, ctx.warnings);
        return result;
      }
      return buildFallbackGroupForNode(node, ctx, annotations, "vector-export-failed", parentCtx);
    }

    case "RECTANGLE": {
      const fills = node.fills as Paint[];
      const imageFill = extractImageFill(fills);
      if (imageFill) {
        const result = await convertImageNode(node, ctx, parentCtx);
        if (result) {
          const im = inferImageInferenceMeta(node, annotations);
          if (im) mergeElementMetaFigma(result, { inference: im });
          applyAbsPos(result, node, parentCtx);
          applyElementAnnotationProps(result, node, annotations, ctx.warnings);
          return result;
        }
        return buildFallbackGroupForNode(
          node,
          ctx,
          annotations,
          "rectangle-image-export-failed",
          parentCtx
        );
      }
      const result = await convertVectorNode(node, ctx);
      if (result) {
        applyAbsPos(result, node, parentCtx);
        applyElementAnnotationProps(result, node, annotations, ctx.warnings);
        return result;
      }
      return buildFallbackGroupForNode(
        node,
        ctx,
        annotations,
        "rectangle-vector-export-failed",
        parentCtx
      );
    }

    case "ELLIPSE": {
      const result = await convertVectorNode(node, ctx);
      if (result) {
        applyAbsPos(result, node, parentCtx);
        applyElementAnnotationProps(result, node, annotations, ctx.warnings);
        return result;
      }
      return buildFallbackGroupForNode(
        node,
        ctx,
        annotations,
        "ellipse-vector-export-failed",
        parentCtx
      );
    }

    case "FRAME":
    case "COMPONENT":
    case "GROUP": {
      const fills = "fills" in node ? (node.fills as Paint[]) : [];
      const imageFill = extractImageFill(fills);
      if (imageFill) {
        // Only flatten to elementImage when the node has no visible children.
        // Frames/groups with an image fill AND children should be elementGroups with
        // the image exported as a background child — content renders on top.
        const nodeChildren =
          "children" in node ? (node as { children: readonly SceneNode[] }).children : [];
        const hasVisibleChildren = nodeChildren.some(
          (c) => !("visible" in c) || (c as { visible?: boolean }).visible !== false
        );
        if (!hasVisibleChildren) {
          const result = await convertImageNode(node, ctx, parentCtx);
          if (result) {
            const im = inferImageInferenceMeta(node, annotations);
            if (im) mergeElementMetaFigma(result, { inference: im });
            applyAbsPos(result, node, parentCtx);
            applyElementAnnotationProps(result, node, annotations, ctx.warnings);
            return result;
          }
          return buildFallbackGroupForNode(
            node,
            ctx,
            annotations,
            "group-image-export-failed",
            parentCtx
          );
        }
        // Has visible children — fall through to convertGroupNode.
        // The image fill will be injected as a positioned background elementImage child.
      }

      if (isCompositeVectorFrame(node)) {
        const result = await convertVectorNode(node, ctx);
        if (result) {
          applyAbsPos(result, node, parentCtx);
          applyElementAnnotationProps(result, node, annotations, ctx.warnings);
          return result;
        }
      }

      if (
        (node.type === "FRAME" || node.type === "COMPONENT") &&
        isLikelyButton(node, annotations)
      ) {
        const result = await convertButtonNode(node, ctx, annotations);
        const bm = inferButtonInferenceMeta(node, annotations);
        if (bm) mergeElementMetaFigma(result, { inference: bm });
        applyAbsPos(result, node, parentCtx);
        applyElementAnnotationProps(result, node, annotations, ctx.warnings);
        return result;
      }

      const groupResult = await convertGroupNode(
        node as FrameNode | GroupNode | ComponentNode,
        ctx,
        convertNode,
        parentCtx
      );
      if (groupResult) {
        applyElementAnnotationProps(groupResult, node, annotations, ctx.warnings);
        return groupResult;
      }

      {
        const fallbackId = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
        ctx.warnings.push(
          `[warn] "${node.name}" (${node.type}) — could not fully convert, emitting as fallback group`
        );
        const fallbackGroup: ElementBlock = {
          type: "elementGroup",
          id: fallbackId,
          section: { elementOrder: [], definitions: {} },
        } as ElementBlock;
        mergeElementMetaFigma(fallbackGroup, {
          sourceType: node.type,
          sourceName: node.name,
          fallbackReason: "group-conversion-fallback",
        });
        applyAbsPos(fallbackGroup, node, parentCtx);
        applyElementAnnotationProps(fallbackGroup, node, annotations, ctx.warnings);
        return fallbackGroup;
      }
    }

    case "INSTANCE":
      return convertInstanceNode(node as InstanceNode, ctx, annotations, parentCtx, convertNode);

    case "COMPONENT_SET":
      return buildVariantElement(node as ComponentSetNode, ctx, convertNode);

    case "SECTION":
      return convertSectionNode(node as SectionNode, ctx, annotations, parentCtx, convertNode);

    default:
      return buildFallbackGroupForNode(node, ctx, annotations, "unsupported-node-type", parentCtx);
  }
}
