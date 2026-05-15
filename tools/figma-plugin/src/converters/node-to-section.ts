/**
 * Top-level FrameNode → SectionBlock converter.
 * Each top-level selected frame becomes one peblor section.
 *
 * Routing:
 * - `[pb: type=sectionColumn]` or detected horizontal grid → sectionColumn
 * - `[pb: type=revealSection]` → revealSection
 * - `[pb: type=scrollContainer]` or Figma overflow scroll → scrollContainer
 * - `[pb: type=divider]` or thin stroke-only frame → divider
 * - `[pb: type=formBlock]` or multiple input-like instances → formBlock
 * - Default → contentBlock
 */

import type { ContentBlock, ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import {
  extractLayoutProps,
  extractAutoLayoutProps,
  extractBorderProps,
  extractSectionPlacementFromParent,
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
import { isColumnLayout, convertFrameToColumnSection } from "./section-column";
import { isRevealLayout, convertFrameToRevealSection } from "./section-reveal";
import {
  isScrollContainerFrame,
  isDividerFrame,
  isLikelyFormFrame,
} from "./section-routing-detect";
import {
  convertFrameToScrollContainerSection,
  convertFrameToDividerSection,
  convertFrameToFormSection,
} from "./section-scroll-divider-form";
import { gatherDirectChildElements } from "./section-elements-gather";
import { warnRepeatedStructuralSignatures } from "./structure-hints";
import { getInspectableBackgroundAsync } from "./node-css";
import { ensureElementId } from "./node-element-helpers";
import { applySectionFillAnnotationOverride } from "./section-annotation-fill-override";

/**
 * Converts a top-level FrameNode to a peblor section block.
 *
 * The section type is determined by annotations and auto-detection:
 * - `[pb: type=sectionColumn]` or horizontal multi-column frame → `sectionColumn`
 * - `[pb: type=revealSection]` → `revealSection`
 * - Otherwise → `contentBlock`
 *
 * For contentBlock sections:
 * - Frame direct children become the `elements` array.
 * - When the frame has auto-layout padding, a wrapper `elementGroup` is injected
 *   so padding is honoured without violating the section model.
 * - All `[pb:...]` trigger/effect annotations are applied via `parseSectionTriggerProps`.
 */
export async function convertFrameToSection(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<ContentBlock> {
  // Parse annotations first — needed for type routing
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

  // -------------------------------------------------------------------------
  // Section type routing
  // -------------------------------------------------------------------------
  const annotatedType = annotations["type"]?.toLowerCase();

  // When an explicit [pb: type=...] annotation is present it fully controls routing.
  // Auto-detection (isColumnLayout, isRevealLayout) is only applied when no type
  // annotation exists, so annotating [pb: type=contentBlock] suppresses the heuristics.
  const hasExplicitType = !!annotatedType;

  if (
    annotatedType === "sectioncolumn" ||
    (!hasExplicitType && isColumnLayout(frame, annotations))
  ) {
    return convertFrameToColumnSection(frame, ctx) as unknown as ContentBlock;
  }

  if (
    annotatedType === "revealsection" ||
    (!hasExplicitType && isRevealLayout(frame, annotations))
  ) {
    return convertFrameToRevealSection(frame, ctx) as unknown as ContentBlock;
  }

  if (annotatedType === "scrollcontainer" || (!hasExplicitType && isScrollContainerFrame(frame))) {
    return convertFrameToScrollContainerSection(frame, ctx);
  }

  if (annotatedType === "divider" || (!hasExplicitType && isDividerFrame(frame))) {
    return convertFrameToDividerSection(frame, ctx);
  }

  if (annotatedType === "formblock" || (!hasExplicitType && (await isLikelyFormFrame(frame)))) {
    return convertFrameToFormSection(frame, ctx);
  }

  // -------------------------------------------------------------------------
  // Default: contentBlock
  // -------------------------------------------------------------------------

  const layout = extractLayoutProps(frame);
  const autoLayout = extractAutoLayoutProps(frame);
  const sectionPlacement = extractSectionPlacementFromParent(frame);

  const effects = frame.effects;
  const boxShadow = extractBoxShadow(effects);
  const filter = extractFilter(effects);
  const backdropFilter = extractBackdropFilter(effects);
  const glassEffect = extractGlassEffect(effects, frame);
  const figmaEffects: unknown[] = glassEffect ? [glassEffect] : [];

  const fills = frame.fills as Paint[];
  let fillPayload = extractSectionFillPayload(fills, { width: frame.width, height: frame.height });
  const hasImageFill = fills.some((fill) => fill.type === "IMAGE" && fill.visible !== false);
  const inspectBackground = !hasImageFill ? await getInspectableBackgroundAsync(frame) : undefined;
  if (inspectBackground) {
    fillPayload = { fill: inspectBackground };
  }
  // Export image background fill as a named CDN asset (e.g. hero/bg.png)
  const bgImage = await exportImageFillAsset(frame, ctx);
  const borderProps = extractBorderProps(frame);

  const elements = await gatherDirectChildElements(frame, ctx);
  warnRepeatedStructuralSignatures(
    frame.name || "section",
    elements,
    ctx.warnings,
    "direct children",
    {
      suppress: ctx.autoPresets,
    }
  );

  const rawName = stripAnnotations(frame.name || "section");
  const sectionId = ensureUniqueId(slugify(rawName), ctx.usedIds);

  const autoLayoutRecord = autoLayout as Record<string, unknown>;
  const autoLayoutNoPadding = stripPaddingProps(autoLayoutRecord);

  // Base section (fill, dimensions, effects, layout)
  const sectionBase: Record<string, unknown> = {
    type: "contentBlock",
    id: sectionId,
    elements: [], // filled below
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
  };
  const section = sectionBase as unknown as ContentBlock;

  // -------------------------------------------------------------------------
  // Auto-layout wrapping
  // For any auto-layout section, wrap direct children in an inner elementGroup
  // that carries full auto-layout props (including padding/spacing/alignment).
  // The section itself retains structural layout props without padding.
  // -------------------------------------------------------------------------
  if (frame.layoutMode !== "NONE") {
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
      // Full autoLayout WITH padding
      ...autoLayoutRecord,
      section: {
        elementOrder: innerOrder,
        definitions: innerDefinitions,
      },
    };

    // Section gets flex layout WITHOUT padding
    Object.assign(section, autoLayoutNoPadding);
    section.elements = [wrapperGroup];
  } else {
    // No padding (or no auto-layout) — spread layout without padding keys
    Object.assign(section, autoLayoutNoPadding);
    section.elements = elements;
  }

  // -------------------------------------------------------------------------
  // Annotation overrides (fill, overflow, hidden only — triggers handled below)
  // -------------------------------------------------------------------------
  if (annotations["fill"]) {
    applySectionFillAnnotationOverride(sectionBase, annotations["fill"]);
  }
  if (annotations["overflow"]) sectionBase["overflow"] = annotations["overflow"];
  if (annotations["hidden"] === "true") sectionBase["hidden"] = true;

  // -------------------------------------------------------------------------
  // Trigger / effect / behavioural props
  // -------------------------------------------------------------------------
  const triggerProps = parseSectionTriggerProps(annotations);
  const mergedEffects = [
    ...figmaEffects,
    ...(Array.isArray(triggerProps.effects) ? triggerProps.effects : []),
  ];
  if (mergedEffects.length > 0) triggerProps.effects = mergedEffects;
  Object.assign(sectionBase, triggerProps);

  // -------------------------------------------------------------------------
  // Motion shorthand — entrance/exit/trigger/duration/delay/viewportAmount
  // -------------------------------------------------------------------------
  const motionTiming = buildMotionTiming(annotations);
  if (motionTiming) sectionBase["motionTiming"] = motionTiming;

  return section;
}

function stripPaddingProps(layout: Record<string, unknown>): Record<string, unknown> {
  const {
    paddingTop: _paddingTop,
    paddingRight: _paddingRight,
    paddingBottom: _paddingBottom,
    paddingLeft: _paddingLeft,
    padding: _padding,
    ...rest
  } = layout;
  void _paddingTop;
  void _paddingRight;
  void _paddingBottom;
  void _paddingLeft;
  void _padding;
  return rest;
}
