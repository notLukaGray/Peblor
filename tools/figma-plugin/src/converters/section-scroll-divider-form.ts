/**
 * Section variants inferred from Figma: scrollContainer, divider, formBlock.
 */

import type { ConversionContext } from "../types/figma-plugin";
import type { ContentBlock, ElementBlock } from "../types/peblor";
import { gatherDirectChildElements } from "./section-elements-gather";
import {
  extractLayoutProps,
  extractAutoLayoutProps,
  extractSectionPlacementFromParent,
  extractBorderProps,
} from "./layout";
import {
  extractBoxShadow,
  extractBackdropFilter,
  extractFilter,
  extractGlassEffect,
} from "./effects";
import { extractSectionFillPayload, exportImageFillAsset } from "./fills";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { toPx } from "../utils/css";
import {
  parseNodeAnnotations,
  stripAnnotations,
  findUnsupportedAnnotationKeys,
  SECTION_SUPPORTED_ANNOTATION_KEYS,
  SECTION_SUPPORTED_ANNOTATION_FAMILIES,
} from "./annotations-parse";
import { buildMotionTiming } from "./motion";
import { parseSectionTriggerProps } from "./section-triggers";
import { warnRepeatedStructuralSignatures } from "./structure-hints";
import { getInspectableBackgroundAsync } from "./node-css";
import { figmaPaintToCSS } from "../utils/color";
import { isLikelyButton, convertButtonNode } from "./button";
import { isInputLikeInstance } from "./section-routing-detect";
import { ensureElementId } from "./node-element-helpers";
import { applySectionFillAnnotationOverride } from "./section-annotation-fill-override";

function scrollDirectionFromOverflow(od: OverflowDirection): "horizontal" | "vertical" | "both" {
  if (od === "HORIZONTAL") return "horizontal";
  if (od === "VERTICAL") return "vertical";
  if (od === "BOTH") return "both";
  return "vertical";
}

function strokeToCss(frame: FrameNode): string | undefined {
  const strokes = frame.strokes as Paint[];
  if (!Array.isArray(strokes)) return undefined;
  const visible = strokes.find((s) => s.visible !== false);
  if (!visible) return undefined;
  return figmaPaintToCSS(visible) ?? undefined;
}

async function inferFormFieldBlock(
  node: SceneNode,
  ctx: ConversionContext
): Promise<Record<string, unknown> | null> {
  if (node.visible === false) return null;

  if (node.type === "TEXT") {
    const t = node as TextNode;
    const label = (t.characters ?? "").trim();
    if (!label) return null;
    return {
      type: "formField",
      fieldType: "text",
      name: slugify(label),
      label,
    };
  }

  if (node.type === "INSTANCE") {
    const inst = node as InstanceNode;
    const ann = parseNodeAnnotations(
      inst as unknown as { name?: string } & Record<string, unknown>
    );
    if (isLikelyButton(inst, ann)) {
      const btn = await convertButtonNode(inst, ctx, ann);
      return {
        type: "formField",
        fieldType: "submit",
        label: (btn.label as string) || "Submit",
      };
    }
    if (await isInputLikeInstance(inst)) {
      const mc = await inst.getMainComponentAsync();
      const hint = ((mc?.name ?? inst.name) || "").toLowerCase();
      let fieldType: "text" | "email" | "password" | "tel" | "paragraph" = "text";
      if (hint.includes("email")) fieldType = "email";
      else if (hint.includes("password")) fieldType = "password";
      else if (hint.includes("tel") || hint.includes("phone")) fieldType = "tel";
      else if (hint.includes("textarea") || hint.includes("area")) fieldType = "paragraph";

      const placeholderNode = inst.findOne(
        (n) => n.type === "TEXT" && Boolean((n as TextNode).characters?.trim().length)
      ) as TextNode | null;
      const placeholder = placeholderNode?.characters?.trim();
      return {
        type: "formField",
        fieldType,
        name: slugify(stripAnnotations(inst.name) || fieldType),
        placeholder: placeholder || undefined,
        label: stripAnnotations(inst.name) || undefined,
      };
    }
  }

  return null;
}

async function buildFormFields(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<Record<string, unknown>[]> {
  const fields: Record<string, unknown>[] = [];
  for (const child of frame.children) {
    const f = await inferFormFieldBlock(child, ctx);
    if (f) fields.push(f);
  }
  return fields;
}

function mergeSectionAnnotations(
  annotations: Record<string, string>,
  sectionBase: Record<string, unknown>,
  figmaEffects: unknown[]
): void {
  if (annotations["fill"]) {
    applySectionFillAnnotationOverride(sectionBase, annotations["fill"]);
  }
  if (annotations["overflow"]) sectionBase["overflow"] = annotations["overflow"];
  if (annotations["hidden"] === "true") sectionBase["hidden"] = true;

  const triggerProps = parseSectionTriggerProps(annotations);
  const mergedEffects = [
    ...figmaEffects,
    ...(Array.isArray(triggerProps.effects) ? triggerProps.effects : []),
  ];
  if (mergedEffects.length > 0) triggerProps.effects = mergedEffects;
  Object.assign(sectionBase, triggerProps);

  const motionTiming = buildMotionTiming(annotations);
  if (motionTiming) sectionBase["motionTiming"] = motionTiming;
}

export async function convertFrameToScrollContainerSection(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<ContentBlock> {
  const annotations = parseNodeAnnotations(
    frame as unknown as { name?: string } & Record<string, unknown>
  );
  const unsupportedKeys = findUnsupportedAnnotationKeys(
    annotations,
    SECTION_SUPPORTED_ANNOTATION_KEYS,
    SECTION_SUPPORTED_ANNOTATION_FAMILIES
  );
  if (unsupportedKeys.length > 0) {
    ctx.warnings.push(
      `[annotations] frame "${frame.name || "section"}" has unsupported annotation key(s): ${unsupportedKeys.join(", ")}`
    );
  }

  const elements = await gatherDirectChildElements(frame, ctx);
  warnRepeatedStructuralSignatures(
    frame.name || "section",
    elements,
    ctx.warnings,
    "direct children",
    { suppress: ctx.autoPresets }
  );

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
  const bgImage = await exportImageFillAsset(frame, ctx);
  const borderProps = extractBorderProps(frame);
  const effects = frame.effects;
  const boxShadow = extractBoxShadow(effects);
  const filter = extractFilter(effects);
  const backdropFilter = extractBackdropFilter(effects);
  const glassEffect = extractGlassEffect(effects, frame);
  const figmaEffects: unknown[] = glassEffect ? [glassEffect] : [];

  const rawName = stripAnnotations(frame.name || "section");
  const sectionId = ensureUniqueId(slugify(rawName), ctx.usedIds);

  const autoLayoutRecord = autoLayout as Record<string, unknown>;
  const { paddingTop, paddingRight, paddingBottom, paddingLeft, padding, ...autoLayoutNoPadding } =
    autoLayoutRecord;
  const hasPadding =
    paddingTop !== undefined ||
    paddingRight !== undefined ||
    paddingBottom !== undefined ||
    paddingLeft !== undefined ||
    padding !== undefined;

  const sectionBase: Record<string, unknown> = {
    type: "scrollContainer",
    id: sectionId,
    elements: [] as ElementBlock[],
    width: toPx(frame.width),
    height: toPx(frame.height),
    ...sectionPlacement,
    ...(fillPayload?.fill ? { fill: fillPayload.fill } : {}),
    ...(fillPayload?.layers ? { layers: fillPayload.layers } : {}),
    ...(bgImage ? { bgImage } : {}),
    ...borderProps,
    ...(boxShadow ? { boxShadow } : {}),
    ...(filter ? { filter } : {}),
    ...(backdropFilter ? { backdropFilter, WebkitBackdropFilter: backdropFilter } : {}),
    overflow: "auto",
    borderRadius: layout.borderRadius,
    ...(layout.opacity !== undefined ? { opacity: layout.opacity } : {}),
    ...(layout.blendMode ? { blendMode: layout.blendMode } : {}),
    ...(figmaEffects.length > 0 ? { effects: figmaEffects } : {}),
    scrollDirection: scrollDirectionFromOverflow(frame.overflowDirection),
  };

  const section = sectionBase as unknown as ContentBlock;

  if (hasPadding && frame.layoutMode !== "NONE") {
    const wrapperId = ensureUniqueId(slugify(rawName + "-inner"), ctx.usedIds);
    const innerDefinitions: Record<string, ElementBlock> = {};
    const innerOrder: string[] = [];
    for (const el of elements) {
      const elId = ensureElementId(el, `${sectionId}-child`, ctx, ctx.warnings);
      innerDefinitions[elId] = el;
      innerOrder.push(elId);
    }
    const wrapperGroup: ElementBlock = {
      type: "elementGroup",
      id: wrapperId,
      width: "100%",
      ...autoLayoutRecord,
      section: {
        elementOrder: innerOrder,
        definitions: innerDefinitions,
      },
    };
    Object.assign(section, autoLayoutNoPadding);
    section.elements = [wrapperGroup];
  } else {
    Object.assign(section, autoLayoutNoPadding);
    section.elements = elements;
  }

  mergeSectionAnnotations(annotations, sectionBase, figmaEffects);
  return section;
}

export async function convertFrameToDividerSection(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<ContentBlock> {
  const annotations = parseNodeAnnotations(
    frame as unknown as { name?: string } & Record<string, unknown>
  );
  const unsupportedKeys = findUnsupportedAnnotationKeys(
    annotations,
    SECTION_SUPPORTED_ANNOTATION_KEYS,
    SECTION_SUPPORTED_ANNOTATION_FAMILIES
  );
  if (unsupportedKeys.length > 0) {
    ctx.warnings.push(
      `[annotations] frame "${frame.name || "section"}" has unsupported annotation key(s): ${unsupportedKeys.join(", ")}`
    );
  }

  const rawName = stripAnnotations(frame.name || "divider");
  const sectionId = ensureUniqueId(slugify(rawName), ctx.usedIds);
  const layout = extractLayoutProps(frame);
  const fills = frame.fills as Paint[];
  const fillPayload = extractSectionFillPayload(fills, {
    width: frame.width,
    height: frame.height,
  });
  const strokeCss = strokeToCss(frame);
  const borderProps = extractBorderProps(frame);

  const sectionBase: Record<string, unknown> = {
    type: "divider",
    id: sectionId,
    width: toPx(frame.width),
    height: toPx(frame.height),
    ...(fillPayload?.fill ? { fill: fillPayload.fill } : {}),
    ...(strokeCss && !fillPayload?.fill ? { fill: strokeCss } : {}),
    ...borderProps,
    borderRadius: layout.borderRadius,
    ...(layout.opacity !== undefined ? { opacity: layout.opacity } : {}),
  };

  mergeSectionAnnotations(annotations, sectionBase, []);
  return sectionBase as unknown as ContentBlock;
}

export async function convertFrameToFormSection(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<ContentBlock> {
  const annotations = parseNodeAnnotations(
    frame as unknown as { name?: string } & Record<string, unknown>
  );
  const unsupportedKeys = findUnsupportedAnnotationKeys(
    annotations,
    SECTION_SUPPORTED_ANNOTATION_KEYS,
    SECTION_SUPPORTED_ANNOTATION_FAMILIES
  );
  if (unsupportedKeys.length > 0) {
    ctx.warnings.push(
      `[annotations] frame "${frame.name || "section"}" has unsupported annotation key(s): ${unsupportedKeys.join(", ")}`
    );
  }

  const fields = await buildFormFields(frame, ctx);
  if (fields.length === 0) {
    ctx.warnings.push(
      `[formBlock] Frame "${frame.name}" — no convertible fields found; add text labels or input/button instances.`
    );
  }

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
  const bgImage = await exportImageFillAsset(frame, ctx);
  const borderProps = extractBorderProps(frame);
  const effects = frame.effects;
  const boxShadow = extractBoxShadow(effects);
  const filter = extractFilter(effects);
  const backdropFilter = extractBackdropFilter(effects);
  const glassEffect = extractGlassEffect(effects, frame);
  const figmaEffects: unknown[] = glassEffect ? [glassEffect] : [];

  const rawName = stripAnnotations(frame.name || "form");
  const sectionId = ensureUniqueId(slugify(rawName), ctx.usedIds);

  const sectionBase: Record<string, unknown> = {
    type: "formBlock",
    id: sectionId,
    fields,
    width: toPx(frame.width),
    height: toPx(frame.height),
    ...sectionPlacement,
    ...(fillPayload?.fill ? { fill: fillPayload.fill } : {}),
    ...(fillPayload?.layers ? { layers: fillPayload.layers } : {}),
    ...(bgImage ? { bgImage } : {}),
    ...borderProps,
    ...(boxShadow ? { boxShadow } : {}),
    ...(filter ? { filter } : {}),
    ...(backdropFilter ? { backdropFilter, WebkitBackdropFilter: backdropFilter } : {}),
    overflow: frame.clipsContent ? "hidden" : undefined,
    borderRadius: layout.borderRadius,
    ...(layout.opacity !== undefined ? { opacity: layout.opacity } : {}),
    ...(layout.blendMode ? { blendMode: layout.blendMode } : {}),
    ...(figmaEffects.length > 0 ? { effects: figmaEffects } : {}),
    ...autoLayout,
  };

  mergeSectionAnnotations(annotations, sectionBase, figmaEffects);
  return sectionBase as unknown as ContentBlock;
}
