/**
 * Converts a Figma frame with `[pb: type=revealSection]` annotation into a
 * `revealSection` peblor section block.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { convertNode } from "./node-to-element";
import { extractSectionFillPayload, exportImageFillAsset } from "./fills";
import {
  extractAutoLayoutProps,
  extractLayoutProps,
  extractBorderProps,
  extractSectionPlacementFromParent,
} from "./layout";
import {
  extractBoxShadow,
  extractFilter,
  extractBackdropFilter,
  extractGlassEffect,
} from "./effects";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { toPx } from "../utils/css";
import { stripAnnotations, annotationFlag, annotationNumber } from "./annotations";
import { parseNodeAnnotations } from "./annotations-parse";
import { parseSectionTriggerProps } from "./section-triggers";
import {
  getVisibleChildren,
  isContainerNode,
  warnRepeatedStructuralSignatures,
} from "./structure-hints";
import { getInspectableBackgroundAsync } from "./node-css";
import { applySectionFillAnnotationOverride } from "./section-annotation-fill-override";
import { mergeElementMetaFigma, type GroupNodeParentCtx } from "./node-element-helpers";
import { EXPORT_DROP_REASON, recordConverterDrop } from "../export-parity";

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the annotation map contains `type=revealSection` or the frame
 * has explicit reveal slot naming hints.
 */
export function isRevealLayout(frame: FrameNode, annotations: Record<string, string>): boolean {
  if (annotations["type"]?.toLowerCase() === "revealsection") return true;
  if (frame.layoutMode !== "VERTICAL" || !frame.clipsContent) return false;

  const children = ("children" in frame ? frame.children : []) as readonly SceneNode[];
  const visibleChildren = getVisibleChildren(children);
  if (visibleChildren.length < 2) return false;

  // Auto-detection is intentionally conservative: only infer revealSection when
  // top-level child names explicitly indicate collapsed/revealed slots. Generic
  // clipped vertical frames (e.g. full page artboards) should remain contentBlock.
  let collapsedNamedCount = 0;
  let revealedNamedCount = 0;
  for (const child of children) {
    const childName = child.name || "";
    if (matchesNames(childName, COLLAPSED_NAMES)) collapsedNamedCount++;
    if (matchesNames(childName, REVEALED_NAMES)) revealedNamedCount++;
  }

  if (collapsedNamedCount > 0 && revealedNamedCount > 0) return true;
  if (collapsedNamedCount === 0 && revealedNamedCount === 0) return false;

  // If only one side is named, still allow reveal detection when the structure
  // has enough visible container children to reasonably represent both states.
  return visibleChildren.filter(isContainerNode).length >= 2;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Name patterns that map to the "collapsed" (peek) slot. */
const COLLAPSED_NAMES = ["collapsed", "header", "trigger", "peek"];

/** Name patterns that map to the "revealed" (expanded) slot. */
const REVEALED_NAMES = ["revealed", "content", "expanded", "body"];

function matchesNames(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase().trim();
  return patterns.some((p) => lower === p || lower.startsWith(p + " ") || lower.endsWith(" " + p));
}

function hasVisibleFigmaEffects(node: SceneNode): boolean {
  if (!("effects" in node) || !Array.isArray(node.effects)) return false;
  return node.effects.some((e: Effect) => e.visible !== false);
}

function hasVisibleStrokes(node: SceneNode): boolean {
  if (!("strokes" in node)) return false;
  const strokes = node.strokes as readonly Paint[] | typeof figma.mixed;
  if (!Array.isArray(strokes)) return false;
  return strokes.some((s) => s.visible !== false);
}

function hasNonTrivialAutoLayout(node: SceneNode): boolean {
  if (!("layoutMode" in node)) return false;
  if (node.layoutMode === "NONE") return false;
  const f = node as FrameNode | ComponentNode | InstanceNode;
  const pad =
    (f.paddingLeft ?? 0) + (f.paddingRight ?? 0) + (f.paddingTop ?? 0) + (f.paddingBottom ?? 0);
  const spacing = f.itemSpacing ?? 0;
  const counter =
    "counterAxisSpacing" in f && typeof f.counterAxisSpacing === "number"
      ? f.counterAxisSpacing
      : 0;
  return pad > 0 || spacing > 0 || counter > 0;
}

function hasVisibleContainerFills(node: SceneNode): boolean {
  if (!("fills" in node)) return false;
  const fills = node.fills as readonly Paint[];
  if (!Array.isArray(fills)) return false;
  return fills.some((f) => {
    if (f.visible === false) return false;
    if (f.type === "SOLID") {
      const op = "opacity" in f ? (f.opacity ?? 1) : 1;
      return op > 0.001;
    }
    return true;
  });
}

function nodeClipsContent(node: SceneNode): boolean {
  return "clipsContent" in node && node.clipsContent === true;
}

function hasMeaningfulRotation(node: SceneNode): boolean {
  return "rotation" in node && typeof node.rotation === "number" && Math.abs(node.rotation) > 0.01;
}

function hasMeaningfulOpacity(node: SceneNode): boolean {
  return "opacity" in node && typeof node.opacity === "number" && node.opacity < 0.999;
}

/**
 * Flatten named reveal-slot containers into their children only when the wrapper is a
 * pass-through (no clip, effects, strokes, auto-layout spacing, fills, rotation, or opacity).
 */
export function isRevealSlotChildFlattenSafe(container: SceneNode): boolean {
  if (nodeClipsContent(container)) return false;
  if (hasVisibleFigmaEffects(container)) return false;
  if (hasVisibleStrokes(container)) return false;
  if (hasNonTrivialAutoLayout(container)) return false;
  if (hasVisibleContainerFills(container)) return false;
  if (hasMeaningfulRotation(container)) return false;
  if (hasMeaningfulOpacity(container)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

/**
 * Converts a Figma frame annotated with `[pb: type=revealSection]` into a
 * `revealSection` section block.
 *
 * Child frames are slotted by name:
 * - "collapsed" | "header" | "trigger" | "peek" → collapsedElements
 * - "revealed" | "content" | "expanded" | "body" → revealedElements
 * - If neither slot is found, ALL children go to revealedElements.
 *
 * Annotation keys supported:
 * - `triggerMode` — hover | click | button | external | combined (default: click)
 * - `expandAxis` — vertical | horizontal | both (default: vertical)
 * - `initialRevealed` — true | false (default: false)
 * - `revealPreset` — e.g. fadeUp, slideDown
 * - `expandDurationMs` — number in ms
 * - `externalTriggerKey` — string key for button-driven reveal
 */
export async function convertFrameToRevealSection(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<Record<string, unknown>> {
  const annotations = parseNodeAnnotations(
    frame as unknown as { name?: string } & Record<string, unknown>
  );
  const rawName = stripAnnotations(frame.name || "section");
  const sectionId = ensureUniqueId(slugify(rawName), ctx.usedIds);

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

  // Strip padding from autoLayout
  const { paddingTop, paddingRight, paddingBottom, paddingLeft, padding, ...autoLayoutNoPadding } =
    autoLayout as Record<string, unknown>;
  void paddingTop;
  void paddingRight;
  void paddingBottom;
  void paddingLeft;
  void padding;

  // Slot children into collapsed / revealed
  const collapsedElements: ElementBlock[] = [];
  const revealedElements: ElementBlock[] = [];

  let hasNamedSlots = false;
  let fallbackSlotCount = 0;

  const children = "children" in frame ? (frame.children as readonly SceneNode[]) : [];
  const frameParentCtx: GroupNodeParentCtx = {
    layoutMode: frame.layoutMode ?? "NONE",
    parentWidth: typeof frame.width === "number" ? frame.width : undefined,
    parentHeight: typeof frame.height === "number" ? frame.height : undefined,
  };
  const visibleChildren = getVisibleChildren(children);
  const layoutFallback =
    frame.layoutMode === "VERTICAL" && frame.clipsContent && visibleChildren.length >= 2;
  const inferredCollapsedChild = layoutFallback ? visibleChildren[0] : undefined;
  let inferredSlotCount = 0;

  for (const child of children) {
    const childName = child.name || "";
    const isCollapsed = matchesNames(childName, COLLAPSED_NAMES);
    const isRevealed = matchesNames(childName, REVEALED_NAMES);
    const isHidden = child.visible === false;

    if (isCollapsed || isRevealed) hasNamedSlots = true;

    // Convert the child frame's OWN children as elements if it's a container,
    // or convert the child itself as a single element
    const isContainer = isContainerNode(child);

    if (isContainer && (isCollapsed || isRevealed)) {
      const containerFrame = child as FrameNode | ComponentNode | InstanceNode;
      const containerParentCtx: GroupNodeParentCtx = {
        layoutMode:
          "layoutMode" in containerFrame
            ? (containerFrame.layoutMode as GroupNodeParentCtx["layoutMode"])
            : "NONE",
        parentWidth: typeof containerFrame.width === "number" ? containerFrame.width : undefined,
        parentHeight: typeof containerFrame.height === "number" ? containerFrame.height : undefined,
      };
      if (!isRevealSlotChildFlattenSafe(containerFrame)) {
        try {
          const converted = await convertNode(containerFrame, ctx, frameParentCtx);
          if (converted !== null) {
            mergeElementMetaFigma(converted, {
              inference: {
                kind: "revealSlotWrapper",
                confidence: "high",
                detail: "preserved-slot-container",
              },
            });
            if (isCollapsed) collapsedElements.push(converted);
            else revealedElements.push(converted);
          }
        } catch (err) {
          recordConverterDrop(ctx, EXPORT_DROP_REASON.REVEAL_SLOT_ERROR, {
            nodeName: childName,
            nodeType: containerFrame.type,
          });
          ctx.warnings.push(
            `section-reveal: error converting slot container "${childName}": ${String(err)}`
          );
        }
        continue;
      }

      const subChildren = "children" in containerFrame ? containerFrame.children : [];
      for (const sub of subChildren as SceneNode[]) {
        try {
          const converted = await convertNode(sub, ctx, containerParentCtx);
          if (converted !== null) {
            if (isCollapsed) collapsedElements.push(converted);
            else revealedElements.push(converted);
          }
        } catch (err) {
          recordConverterDrop(ctx, EXPORT_DROP_REASON.REVEAL_SLOT_ERROR, {
            nodeName: sub.name,
            nodeType: sub.type,
          });
          ctx.warnings.push(
            `section-reveal: error converting "${sub.name}" in "${childName}": ${String(err)}`
          );
        }
      }
    } else {
      try {
        const converted = await convertNode(child, ctx, frameParentCtx);
        if (converted !== null) {
          if (isCollapsed) collapsedElements.push(converted);
          else if (isRevealed) revealedElements.push(converted);
          else if (isHidden) {
            collapsedElements.push(converted);
            if (!hasNamedSlots) inferredSlotCount++;
          } else if (layoutFallback && child === inferredCollapsedChild) {
            collapsedElements.push(converted);
            inferredSlotCount++;
          } else if (layoutFallback) {
            revealedElements.push(converted);
            inferredSlotCount++;
          } else {
            revealedElements.push(converted);
            fallbackSlotCount++;
          }
        }
      } catch (err) {
        recordConverterDrop(ctx, EXPORT_DROP_REASON.REVEAL_SLOT_ERROR, {
          nodeName: childName,
          nodeType: child.type,
        });
        ctx.warnings.push(`section-reveal: error converting "${childName}": ${String(err)}`);
      }
    }
  }

  if (hasNamedSlots && fallbackSlotCount > 0) {
    ctx.warnings.push(
      `section-reveal: frame "${frame.name || rawName}" used fallback slotting for ${fallbackSlotCount} unslotted child${fallbackSlotCount === 1 ? "" : "ren"}; placed in revealedElements`
    );
  }

  if (inferredSlotCount > 0) {
    ctx.warnings.push(
      `section-reveal: frame "${frame.name || rawName}" inferred collapsed/revealed slotting from clipped vertical layout; add child names or [pb: type=revealSection] to pin the structure`
    );
  }

  // Parse trigger/layout annotation props
  const triggerMode = annotations["triggermode"] ?? "click";
  const expandAxis = annotations["expandaxis"] ?? "vertical";
  const initialRevealed = annotationFlag(annotations, "initialrevealed");
  const revealPreset = annotations["revealpreset"];
  const expandDurationMs = annotationNumber(annotations, "expanddurationms");
  const externalTriggerKey = annotations["externaltriggerkey"];

  // Build section
  const section: Record<string, unknown> = {
    type: "revealSection",
    id: sectionId,
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
    ...autoLayoutNoPadding,
    overflow: frame.clipsContent ? "hidden" : undefined,
    borderRadius: layout.borderRadius,
    opacity: layout.opacity,
    blendMode: layout.blendMode,
    triggerMode,
    expandAxis,
    initialRevealed,
    ...(collapsedElements.length > 0 ? { collapsedElements } : {}),
    ...(revealedElements.length > 0 ? { revealedElements } : {}),
    ...(revealPreset !== undefined ? { revealPreset } : {}),
    ...(expandDurationMs !== undefined ? { expandDurationMs } : {}),
    ...(externalTriggerKey !== undefined ? { externalTriggerKey } : {}),
    ...(figmaEffects.length > 0 ? { effects: figmaEffects } : {}),
  };

  // Apply annotation overrides
  if (annotations["fill"]) {
    applySectionFillAnnotationOverride(section, annotations["fill"]);
  }
  if (annotations["overflow"]) section["overflow"] = annotations["overflow"];
  if (annotations["hidden"] === "true") section["hidden"] = true;

  // Apply trigger/effect props
  const triggerProps = parseSectionTriggerProps(annotations);
  const mergedEffects = [
    ...figmaEffects,
    ...(Array.isArray(triggerProps.effects) ? triggerProps.effects : []),
  ];
  if (mergedEffects.length > 0) triggerProps.effects = mergedEffects;
  Object.assign(section, triggerProps);

  warnRepeatedStructuralSignatures(
    frame.name || rawName,
    [...collapsedElements, ...revealedElements],
    ctx.warnings,
    "children",
    { suppress: ctx.autoPresets }
  );

  return section;
}
