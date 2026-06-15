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
import { stripAnnotations } from "./annotations-parse";
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

const NATIVE_ANNOTATION_TYPES = new Set(["button", "spacer", "svg", "image"]);
const FORM_FIELD_TYPES = new Set([
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "time",
  "datetime-local",
  "color",
  "search",
  "paragraph",
  "checkbox",
  "checkboxgroup",
  "radio",
  "select",
  "switch",
  "range",
  "hidden",
  "button",
  "row",
  "submit",
]);

const INTENT_ONLY_ANNOTATION_TYPE_MAP: Record<string, string> = {
  elementaudio: "elementAudio",
  audio: "elementAudio",
  elementtabs: "elementTabs",
  tabs: "elementTabs",
  elementtooltip: "elementTooltip",
  tooltip: "elementTooltip",
  elementlottie: "elementLottie",
  lottie: "elementLottie",
  elementmodel3d: "elementModel3D",
  model3d: "elementModel3D",
  elementdrag: "elementDrag",
  drag: "elementDrag",
  elementmarquee: "elementMarquee",
  marquee: "elementMarquee",
  elementimagecompare: "elementImageCompare",
  imagecompare: "elementImageCompare",
  elementcounter: "elementCounter",
  counter: "elementCounter",
  elementinfinitescroll: "elementInfiniteScroll",
  infinitescroll: "elementInfiniteScroll",
  elementvideotime: "elementVideoTime",
  videotime: "elementVideoTime",
  elementvideoqualityselect: "elementVideoQualitySelect",
  videoqualityselect: "elementVideoQualitySelect",
  elementrange: "elementRange",
  range: "elementRange",
  elementvector: "elementVector",
  vector: "elementVector",
  elementdivider: "elementDivider",
  divider: "elementDivider",
  elementformfield: "elementFormField",
  formfield: "elementFormField",
};

function applyAnnotationTypeIntent(
  result: ElementBlock | null,
  node: SceneNode,
  annotations: Record<string, string>,
  warnings: string[]
): void {
  if (!result) return;
  const rawType = (annotations.type ?? "").trim().toLowerCase();
  if (!rawType) return;
  if (NATIVE_ANNOTATION_TYPES.has(rawType)) return;
  const intendedType = INTENT_ONLY_ANNOTATION_TYPE_MAP[rawType];
  if (!intendedType) return;
  mergeElementMetaFigma(result, {
    inference: {
      kind: intendedType,
      confidence: "low",
      detail: "Annotation requested an element type without a dedicated Figma exporter converter.",
    },
    fallbackReason: `annotation-intent:${intendedType}`,
  });
  warnings.push(
    `[intent] "${node.name}" requested ${intendedType} via annotation, but exporter has no direct converter yet; exported nearest supported representation.`
  );
}

function parseBooleanAnnotation(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

function parseNumberAnnotation(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildAnnotatedSpecialElement(
  node: SceneNode,
  ctx: ConversionContext,
  annotations: Record<string, string>,
  parentCtx?: GroupNodeParentCtx
): ElementBlock | null {
  const rawType = (annotations.type ?? "").trim().toLowerCase();
  const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  const src = annotations.src?.trim();
  const moduleId = annotations.module?.trim();
  const ariaLabel = annotations.arialabel?.trim();

  if (rawType === "audio" || rawType === "elementaudio") {
    if (!src) return null;
    const result: ElementBlock = {
      type: "elementAudio",
      id,
      src,
      ...(moduleId ? { module: moduleId } : {}),
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(parseBooleanAnnotation(annotations.autoplay) !== undefined
        ? { autoplay: parseBooleanAnnotation(annotations.autoplay) }
        : {}),
      ...(parseBooleanAnnotation(annotations.loop) !== undefined
        ? { loop: parseBooleanAnnotation(annotations.loop) }
        : {}),
      ...(parseBooleanAnnotation(annotations.muted) !== undefined
        ? { muted: parseBooleanAnnotation(annotations.muted) }
        : {}),
      ...(parseBooleanAnnotation(annotations.controls) !== undefined
        ? { controls: parseBooleanAnnotation(annotations.controls) }
        : {}),
      ...(annotations.preload === "none" ||
      annotations.preload === "metadata" ||
      annotations.preload === "auto"
        ? { preload: annotations.preload }
        : {}),
      ...(parseBooleanAnnotation(annotations.showwaveform) !== undefined
        ? { showWaveform: parseBooleanAnnotation(annotations.showwaveform) }
        : {}),
      ...(parseBooleanAnnotation(annotations.showtimedisplay) !== undefined
        ? { showTimeDisplay: parseBooleanAnnotation(annotations.showtimedisplay) }
        : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "lottie" || rawType === "elementlottie") {
    if (!src) return null;
    const result: ElementBlock = {
      type: "elementLottie",
      id,
      src,
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(parseBooleanAnnotation(annotations.autoplay) !== undefined
        ? { autoplay: parseBooleanAnnotation(annotations.autoplay) }
        : {}),
      ...(parseBooleanAnnotation(annotations.loop) !== undefined
        ? { loop: parseBooleanAnnotation(annotations.loop) }
        : {}),
      ...(annotations.poster ? { poster: annotations.poster } : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "tooltip" || rawType === "elementtooltip") {
    const content =
      annotations.content?.trim() ||
      annotations.label?.trim() ||
      stripAnnotations(node.name || "Tooltip").trim();
    const result: ElementBlock = {
      type: "elementTooltip",
      id,
      content,
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(annotations.placement ? { placement: annotations.placement } : {}),
      ...(parseNumberAnnotation(annotations.showdelay) !== undefined
        ? { showDelay: parseNumberAnnotation(annotations.showdelay) }
        : {}),
      ...(parseNumberAnnotation(annotations.hidedelay) !== undefined
        ? { hideDelay: parseNumberAnnotation(annotations.hidedelay) }
        : {}),
      ...(annotations.offset ? { offset: annotations.offset } : {}),
      ...(parseBooleanAnnotation(annotations.arrow) !== undefined
        ? { arrow: parseBooleanAnnotation(annotations.arrow) }
        : {}),
      ...(parseBooleanAnnotation(annotations.interactive) !== undefined
        ? { interactive: parseBooleanAnnotation(annotations.interactive) }
        : {}),
      ...(parseBooleanAnnotation(annotations.followcursor) !== undefined
        ? { followCursor: parseBooleanAnnotation(annotations.followcursor) }
        : {}),
      ...(annotations.maxwidth ? { maxWidth: annotations.maxwidth } : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "tabs" || rawType === "elementtabs") {
    const labelsRaw = annotations.tabs?.trim() || annotations.label?.trim() || "Tab 1|Tab 2";
    const labels = labelsRaw
      .split("|")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const tabs = labels.map((label) => ({ label, elements: [] as Array<Record<string, unknown>> }));
    const result: ElementBlock = {
      type: "elementTabs",
      id,
      tabs,
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(parseNumberAnnotation(annotations.activetab) !== undefined
        ? { activeTab: parseNumberAnnotation(annotations.activetab) }
        : {}),
      ...(annotations.tabalignment ? { tabAlignment: annotations.tabalignment } : {}),
      ...(annotations.contentanimation ? { contentAnimation: annotations.contentanimation } : {}),
      ...(parseBooleanAnnotation(annotations.lazyload) !== undefined
        ? { lazyLoad: parseBooleanAnnotation(annotations.lazyload) }
        : {}),
      ...(parseBooleanAnnotation(annotations.scrollable) !== undefined
        ? { scrollable: parseBooleanAnnotation(annotations.scrollable) }
        : {}),
      ...(parseBooleanAnnotation(annotations.mobilecollapse) !== undefined
        ? { mobileCollapse: parseBooleanAnnotation(annotations.mobilecollapse) }
        : {}),
      ...(parseBooleanAnnotation(annotations.keyboardnav) !== undefined
        ? { keyboardNav: parseBooleanAnnotation(annotations.keyboardnav) }
        : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "counter" || rawType === "elementcounter") {
    const target = parseNumberAnnotation(annotations.target) ?? 100;
    const start = parseNumberAnnotation(annotations.start) ?? 0;
    const result: ElementBlock = {
      type: "elementCounter",
      id,
      target,
      start,
      tween: { duration: 1200, easing: "easeOut" },
      ...(annotations.prefix ? { prefix: annotations.prefix } : {}),
      ...(annotations.suffix ? { suffix: annotations.suffix } : {}),
      ...(ariaLabel ? { ariaLabel } : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "marquee" || rawType === "elementmarquee") {
    const text =
      annotations.text?.trim() ||
      annotations.label?.trim() ||
      stripAnnotations(node.name || "Marquee").trim();
    const result: ElementBlock = {
      type: "elementMarquee",
      id,
      text,
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(annotations.direction ? { direction: annotations.direction } : {}),
      ...(parseNumberAnnotation(annotations.speed) !== undefined
        ? { speed: parseNumberAnnotation(annotations.speed) }
        : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "drag" || rawType === "elementdrag") {
    const result: ElementBlock = {
      type: "elementDrag",
      id,
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(annotations.axis ? { axis: annotations.axis } : {}),
      ...(parseBooleanAnnotation(annotations.snapback) !== undefined
        ? { snapBack: parseBooleanAnnotation(annotations.snapback) }
        : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "range" || rawType === "elementrange") {
    const min = parseNumberAnnotation(annotations.min);
    const max = parseNumberAnnotation(annotations.max);
    const step = parseNumberAnnotation(annotations.step);
    const defaultValue = parseNumberAnnotation(annotations.value);
    const result: ElementBlock = {
      type: "elementRange",
      id,
      ...(ariaLabel ? { ariaLabel } : {}),
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(step !== undefined ? { step } : {}),
      ...(defaultValue !== undefined ? { defaultValue } : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (rawType === "formfield" || rawType === "elementformfield") {
    const rawFieldType = annotations.fieldtype?.trim().toLowerCase() || "text";
    const fieldType = FORM_FIELD_TYPES.has(rawFieldType) ? rawFieldType : "text";
    if (rawFieldType !== fieldType) {
      ctx.warnings.push(
        `[annotations] "${node.name}" has unsupported fieldType="${rawFieldType}"; defaulted to fieldType="text".`
      );
    }
    const label = annotations.label?.trim() || stripAnnotations(node.name || "Field").trim();
    const result: ElementBlock = {
      type: "elementFormField",
      id,
      field: {
        type: "formField",
        fieldType,
        label,
        ...(annotations.name ? { name: annotations.name } : {}),
        ...(annotations.placeholder ? { placeholder: annotations.placeholder } : {}),
        ...(parseBooleanAnnotation(annotations.required) !== undefined
          ? { required: parseBooleanAnnotation(annotations.required) }
          : {}),
      },
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  return null;
}

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
  const annotations = parseNodeAnnotations(
    node as unknown as { name?: string } & Record<string, unknown>
  );
  const result = await convertNodeImpl(node, ctx, parentCtx);
  applyAnnotationTypeIntent(result, node, annotations, ctx.warnings);
  return finalizeConvertNodeResult(ctx, node, result);
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
  const special = buildAnnotatedSpecialElement(node, ctx, annotations, parentCtx);
  if (special) return special;

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
