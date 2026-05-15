/**
 * Shared helper functions for element conversion:
 * ID inference, annotation prop application, absolute positioning.
 */

import type { ElementBlock, ElementInteractions } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { ensureUniqueId, slugify } from "../utils/slugify";
import {
  extractAbsolutePositionStyle,
  extractConstraintPosition,
  isAbsolutePositioned,
} from "./layout-auto-props";
import { extractChildAutoLayoutOverrides } from "./layout-frame-props";
import { extractPrototypeInteractions } from "./prototype-interactions";
import { parseElementInteractionAnnotations } from "./annotations-interactions";
import { parseAnnotationValue, annotationFlag } from "./annotations-parse";
import { buildMotionTiming } from "./motion";

function isTextNodeSafe(node: SceneNode): node is TextNode {
  return node.type === "TEXT";
}

function hasChildrenSafe(node: SceneNode): node is SceneNode & { children: readonly SceneNode[] } {
  return "children" in node && Array.isArray((node as { children?: unknown }).children);
}

// ---------------------------------------------------------------------------
// inferNodeId
// ---------------------------------------------------------------------------

const AUTO_NAME_RE =
  /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Section|Component|Boolean Operation)\s+\d+$/i;

/**
 * Infers a meaningful ID for a node even when the layer name is an
 * auto-generated Figma default.
 *
 * Priority: 1. Clean layer name, 2. First text child, 3. Type + index
 */
export function inferNodeId(node: SceneNode, fallbackIndex?: number): string {
  const rawName = node.name?.trim() ?? "";
  const cleanName = rawName.replace(/\[pb:[^\]]*\]/g, "").trim();

  if (cleanName && !AUTO_NAME_RE.test(cleanName)) {
    return cleanName;
  }

  if (hasChildrenSafe(node)) {
    const children = node.children as SceneNode[];
    for (const child of children) {
      if (isTextNodeSafe(child)) {
        const text = (child as unknown as { characters: string }).characters?.trim();
        if (text && text.length > 0 && text.length <= 60) {
          return text.slice(0, 40);
        }
      }
    }
  }

  const typeName = node.type.toLowerCase().replace(/_/g, "-");
  return fallbackIndex !== undefined ? `${typeName}-${fallbackIndex}` : typeName;
}

// ---------------------------------------------------------------------------
// Parent context
// ---------------------------------------------------------------------------

export interface GroupNodeParentCtx {
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
  parentWidth?: number;
  parentHeight?: number;
  /** True when the parent frame clips content (exported as overflow hidden). */
  parentClipsContent?: boolean;
  /**
   * GROUP nodes report children's x/y in the parent frame's coordinate space, not
   * relative to the group itself. Set these to the GROUP's own x/y so applyAbsPos
   * can subtract them to recover group-local coordinates.
   */
  originX?: number;
  originY?: number;
}

// ---------------------------------------------------------------------------
// meta.figma (exporter contract)
// ---------------------------------------------------------------------------

/** Inferred mapping from Figma structure when annotations are absent or partial. */
export type FigmaInferenceMeta = {
  kind: string;
  confidence?: "high" | "medium" | "low";
  detail?: string;
};

export type FigmaExporterMetaPatch = {
  sourceType?: string;
  sourceName?: string;
  fallbackReason?: string;
  originalLayers?: Array<{ fill?: string; blendMode?: string; opacity?: number }>;
  inference?: FigmaInferenceMeta;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Merges fields into `element.meta.figma` without dropping other meta namespaces. */
export function mergeElementMetaFigma(elementInput: unknown, patch: FigmaExporterMetaPatch): void {
  const element = elementInput as Record<string, unknown>;
  const metaIn = element["meta"];
  const meta: Record<string, unknown> = isPlainRecord(metaIn) ? { ...metaIn } : {};
  const figmaIn = meta["figma"];
  const figma: Record<string, unknown> = isPlainRecord(figmaIn) ? { ...figmaIn } : {};

  if (patch.sourceType !== undefined) figma["sourceType"] = patch.sourceType;
  if (patch.sourceName !== undefined) figma["sourceName"] = patch.sourceName;
  if (patch.fallbackReason !== undefined) figma["fallbackReason"] = patch.fallbackReason;
  if (patch.originalLayers !== undefined) figma["originalLayers"] = patch.originalLayers;

  if (patch.inference !== undefined) {
    const existing = figma["inference"];
    figma["inference"] = isPlainRecord(existing)
      ? { ...existing, ...patch.inference }
      : { ...patch.inference };
  }

  meta["figma"] = figma;
  element["meta"] = meta;
}

// ---------------------------------------------------------------------------
// mergeInteractions
// ---------------------------------------------------------------------------

export function mergeInteractions(
  proto: ElementInteractions | undefined,
  annotated: ElementInteractions | undefined
): ElementInteractions | undefined {
  if (!proto && !annotated) return undefined;
  return { ...proto, ...annotated };
}

// ---------------------------------------------------------------------------
// applyAbsPos
// ---------------------------------------------------------------------------

export function applyAbsPos(
  result: ElementBlock,
  node: SceneNode,
  parentCtx?: GroupNodeParentCtx
): void {
  if (parentCtx?.layoutMode === "NONE" && "x" in node && "y" in node) {
    const raw = node as SceneNode & { x: number; y: number; width: number; height: number };
    // GROUP children report x/y in the parent frame's coordinate space; subtract the
    // group's own origin to recover coordinates relative to the group.
    const corrected = {
      ...raw,
      x: raw.x - (parentCtx.originX ?? 0),
      y: raw.y - (parentCtx.originY ?? 0),
    };
    const { figmaConstraints } = extractAbsolutePositionStyle(
      corrected,
      parentCtx?.parentWidth,
      parentCtx?.parentHeight
    );
    result.figmaConstraints = figmaConstraints;
  } else if (isAbsolutePositioned(node) && "x" in node && "y" in node) {
    const raw = node as SceneNode & { x: number; y: number; width: number; height: number };
    const corrected = {
      ...raw,
      x: raw.x - (parentCtx?.originX ?? 0),
      y: raw.y - (parentCtx?.originY ?? 0),
    };
    const { figmaConstraints } = extractConstraintPosition(
      corrected,
      parentCtx?.parentWidth,
      parentCtx?.parentHeight
    );
    result.figmaConstraints = figmaConstraints;
  }
}

// ---------------------------------------------------------------------------
// ensureElementId
// ---------------------------------------------------------------------------

/**
 * Ensures the element has a non-empty `id`. If missing, assigns a generated fallback id
 * and records a warning so the exported JSON keeps structure instead of dropping nodes.
 */
export function ensureElementId(
  element: ElementBlock,
  fallbackSeed: string,
  ctx: ConversionContext,
  warnings?: string[]
): string {
  const record = element as Record<string, unknown>;
  const existing = typeof record.id === "string" ? record.id.trim() : "";
  if (existing.length > 0) return existing;

  const seed =
    fallbackSeed.trim().length > 0
      ? fallbackSeed
      : typeof record.type === "string"
        ? String(record.type)
        : "element";
  const generated = ensureUniqueId(slugify(seed), ctx.usedIds);
  record.id = generated;
  warnings?.push(`[ids] assigned fallback id "${generated}" to converted "${seed}" node`);
  return generated;
}

// ---------------------------------------------------------------------------
// applyElementAnnotationProps
// ---------------------------------------------------------------------------

/**
 * Applies all annotation-driven and Figma-node-driven supplemental fields to a
 * converted element block in-place. Covers interactions, visibleWhen, opacity,
 * hidden, blendMode, overflow, rotate, flipHorizontal/Vertical, aria, and zIndex.
 */
export function applyElementAnnotationProps(
  elementInput: unknown,
  node: SceneNode,
  annotations: Record<string, string>,
  warnings?: string[]
): void {
  const element = elementInput as Record<string, unknown>;

  // 1. Interactions
  const existingInteractions = element.interactions as ElementInteractions | undefined;
  const protoInteractions = extractPrototypeInteractions(node, warnings);
  const annotationInteractions = parseElementInteractionAnnotations(annotations);
  const interactions = mergeInteractions(
    mergeInteractions(existingInteractions, protoInteractions),
    annotationInteractions
  );
  if (interactions && Object.keys(interactions).length > 0) {
    element.interactions = interactions;
    if (interactions.cursor) element.cursor = interactions.cursor;
  }

  // 2. visibleWhen
  if (annotations.visiblewhen) {
    const parts = annotations.visiblewhen.split(":");
    if (parts.length >= 3) {
      element.visibleWhen = {
        variable: parts[0],
        operator: parts[1],
        value: parseAnnotationValue(parts[2]),
      };
    }
  }

  // 3. opacity
  if (annotations.opacity !== undefined) {
    const op = parseFloat(annotations.opacity);
    if (!isNaN(op)) element.opacity = op;
  }

  // 4. hidden
  if ((node as SceneNode & { visible?: boolean }).visible === false) element.hidden = true;
  if (annotationFlag(annotations, "hidden")) element.hidden = true;

  // 5. blendMode
  if (annotations.blendmode) element.blendMode = annotations.blendmode;

  // 6. overflow
  if ((node as SceneNode & { clipsContent?: boolean }).clipsContent === true) {
    element.overflow = "hidden";
  }
  if (annotations.overflow) element.overflow = annotations.overflow;

  // 7. rotate (only fill when converter did not already set it via extractLayoutProps)
  if (element.rotate == null && element.type !== "elementSVG") {
    const nodeWithRotation = node as SceneNode & { rotation?: number };
    if (typeof nodeWithRotation.rotation === "number") {
      const deg = nodeWithRotation.rotation;
      if (Math.abs(deg) > 0.01) element.rotate = Math.round(deg * 100) / 100;
    }
  }

  // 8. flipHorizontal / flipVertical
  if (annotationFlag(annotations, "fliph")) element.flipHorizontal = true;
  if (annotationFlag(annotations, "flipv")) element.flipVertical = true;

  // 9. aria
  const ariaObj: Record<string, string | boolean> = {};
  if (annotations.arialabel) ariaObj.label = annotations.arialabel;
  if (annotations.ariarole) ariaObj.role = annotations.ariarole;
  if (annotations.ariahidden) ariaObj.hidden = annotationFlag(annotations, "ariahidden");
  if (Object.keys(ariaObj).length > 0) element.aria = ariaObj;

  // 10. zIndex
  if (annotations.zindex !== undefined) {
    const z = parseInt(annotations.zindex, 10);
    if (!isNaN(z)) element.zIndex = z;
  }

  // 11. Per-child auto-layout cross-axis overrides
  const childLayout = extractChildAutoLayoutOverrides(node);
  if (childLayout?.align && element.align == null) {
    element.align = childLayout.align;
  }
  if (childLayout?.alignY && element.alignY == null) {
    element.alignY = childLayout.alignY;
  }
  if (childLayout?.wrapperStyle) {
    element.wrapperStyle = {
      ...(childLayout.wrapperStyle as Record<string, string | number>),
      ...((element.wrapperStyle as Record<string, string | number> | undefined) ?? {}),
    };
  }

  // 12. Motion shorthand
  const motionTiming = buildMotionTiming(annotations);
  if (motionTiming) element.motionTiming = motionTiming;
}
