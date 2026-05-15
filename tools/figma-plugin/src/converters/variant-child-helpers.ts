/**
 * Variant child conversion helpers, node prop extraction, and transition building.
 */

import type { ElementBlock, TriggerAction } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { extractLayoutProps, extractAutoLayoutProps, extractBorderProps } from "./layout";
import { extractFill } from "./fills-image";
import { extractGradientFill } from "./fills";
import { extractBoxShadow, extractFilter, extractBackdropFilter } from "./effects";
import { toPx } from "../utils/css";
import { annotationNumber } from "./annotations-parse";
import { warnRepeatedStructuralSignatures } from "./structure-hints";
import { ensureElementId } from "./node-element-helpers";

function extractGradientStroke(
  node: ComponentNode | InstanceNode
): { stroke: string; width: string } | undefined {
  const strokes = node.strokes as readonly Paint[] | typeof figma.mixed;
  if (!Array.isArray(strokes) || strokes.length === 0) return undefined;

  const hasGradientStroke = strokes.some(
    (stroke) =>
      stroke.visible !== false &&
      (stroke.type === "GRADIENT_LINEAR" ||
        stroke.type === "GRADIENT_RADIAL" ||
        stroke.type === "GRADIENT_ANGULAR" ||
        stroke.type === "GRADIENT_DIAMOND")
  );
  if (!hasGradientStroke) return undefined;
  if (node.strokeAlign === "OUTSIDE") return undefined;

  const definedSideWeights = [
    node.strokeTopWeight,
    node.strokeRightWeight,
    node.strokeBottomWeight,
    node.strokeLeftWeight,
  ].filter((value): value is number => typeof value === "number");

  let strokeWeight = 0;
  if (definedSideWeights.length > 0) {
    const first = definedSideWeights[0];
    const uniformSides = definedSideWeights.every((value) => Math.abs(value - first) < 1e-6);
    if (!uniformSides) return undefined;
    strokeWeight = first;
  } else {
    strokeWeight = typeof node.strokeWeight === "number" ? node.strokeWeight : 0;
  }
  if (strokeWeight <= 0) return undefined;

  const stroke = extractGradientFill(strokes, { width: node.width, height: node.height });
  if (!stroke || !stroke.includes("gradient")) return undefined;
  return { stroke, width: toPx(strokeWeight) };
}

// ---------------------------------------------------------------------------
// convertVariantChildren
// ---------------------------------------------------------------------------

export async function convertVariantChildren(
  variantNode: ComponentNode | InstanceNode,
  ctx: ConversionContext,
  convertNodeFn: (node: SceneNode, ctx: ConversionContext) => Promise<ElementBlock | null>
): Promise<{ definitions: Record<string, ElementBlock>; elementOrder: string[] }> {
  const definitions: Record<string, ElementBlock> = {};
  const elementOrder: string[] = [];
  const convertedChildren: ElementBlock[] = [];

  const children = "children" in variantNode ? variantNode.children : [];
  for (const child of children) {
    try {
      const converted = await convertNodeFn(child, ctx);
      if (converted) {
        const childId = ensureElementId(converted, child.name || child.type, ctx, ctx.warnings);
        definitions[childId] = converted;
        elementOrder.push(childId);
        convertedChildren.push(converted);
      }
    } catch (err) {
      ctx.warnings.push(
        `[component-variants] Failed converting child "${child.name}" of variant "${variantNode.name}": ${String(err)}`
      );
    }
  }

  warnRepeatedStructuralSignatures(
    variantNode.name,
    convertedChildren,
    ctx.warnings,
    "variant children",
    {
      suppress: ctx.autoPresets,
    }
  );

  return { definitions, elementOrder };
}

// ---------------------------------------------------------------------------
// extractVariantNodeProps
// ---------------------------------------------------------------------------

export function extractVariantNodeProps(
  variantNode: ComponentNode | InstanceNode
): Record<string, unknown> {
  const layout = extractLayoutProps(variantNode) as Record<string, unknown>;

  const effects = "effects" in variantNode ? variantNode.effects : [];
  const boxShadow = extractBoxShadow(effects as readonly Effect[]);
  const filter = extractFilter(effects as readonly Effect[]);
  const backdropFilter = extractBackdropFilter(effects as readonly Effect[]);

  const wrapperStyleExtras: Record<string, unknown> = {};
  if (layout.borderRadius) {
    wrapperStyleExtras.borderRadius = layout.borderRadius;
    delete layout.borderRadius;
  }
  if (layout.blendMode) {
    wrapperStyleExtras.mixBlendMode = layout.blendMode;
    delete layout.blendMode;
  }
  if (layout.opacity !== undefined) {
    wrapperStyleExtras.opacity = layout.opacity;
    delete layout.opacity;
  }
  if (boxShadow) wrapperStyleExtras.boxShadow = boxShadow;
  if (filter) wrapperStyleExtras.filter = filter;
  if (backdropFilter) {
    wrapperStyleExtras.backdropFilter = backdropFilter;
    wrapperStyleExtras.WebkitBackdropFilter = backdropFilter;
  }

  const fills = "fills" in variantNode ? (variantNode.fills as Paint[]) : [];
  const fill = extractFill(fills, { width: variantNode.width, height: variantNode.height });
  const gradientStroke = extractGradientStroke(variantNode);
  const borderProps = extractBorderProps(variantNode as SceneNode & { strokes?: readonly Paint[] });
  if (gradientStroke) {
    layout.borderGradient = gradientStroke;
  } else if (fill) {
    wrapperStyleExtras.background = fill;
  }
  if (!gradientStroke) {
    if (borderProps.border) wrapperStyleExtras.border = borderProps.border;
    if (borderProps.borderTop) wrapperStyleExtras.borderTop = borderProps.borderTop;
    if (borderProps.borderRight) wrapperStyleExtras.borderRight = borderProps.borderRight;
    if (borderProps.borderBottom) wrapperStyleExtras.borderBottom = borderProps.borderBottom;
    if (borderProps.borderLeft) wrapperStyleExtras.borderLeft = borderProps.borderLeft;
    if (borderProps.outline) wrapperStyleExtras.outline = borderProps.outline;
  }

  if (Object.keys(wrapperStyleExtras).length > 0) {
    layout.wrapperStyle = {
      ...((layout.wrapperStyle as Record<string, unknown>) ?? {}),
      ...wrapperStyleExtras,
    };
  }

  const autoLayout = extractAutoLayoutProps(variantNode);
  layout.width = toPx(variantNode.width);
  layout.height = toPx(variantNode.height);

  return { ...autoLayout, ...layout };
}

// ---------------------------------------------------------------------------
// makeSetVariable
// ---------------------------------------------------------------------------

export function makeSetVariable(key: string, value: unknown): TriggerAction {
  return { type: "setVariable", payload: { key, value } };
}

// ---------------------------------------------------------------------------
// buildVariantTransition
// ---------------------------------------------------------------------------

/** Spring transition shape — no duration/ease, physics-driven. */
interface VariantTransitionSpring {
  type: "spring";
  delay?: number;
  stiffness?: number;
  damping?: number;
}

/** Tween transition shape — duration/ease driven. */
interface VariantTransitionTween {
  duration?: number;
  delay?: number;
  ease?: string;
}

export type VariantTransition = VariantTransitionSpring | VariantTransitionTween;

/**
 * Builds a transition object from annotation key/value pairs.
 * Returns `undefined` when no transition-relevant annotations are present.
 */
export function buildVariantTransition(
  annotations: Record<string, string>
): VariantTransition | undefined {
  const easeRaw = annotations["ease"];
  const duration = annotationNumber(annotations, "duration");
  const delay = annotationNumber(annotations, "delay");
  const stiffness = annotationNumber(annotations, "stiffness");
  const damping = annotationNumber(annotations, "damping");

  const isSpring = easeRaw === "spring";

  if (isSpring) {
    const t: VariantTransitionSpring = { type: "spring" };
    if (delay !== undefined) t.delay = delay;
    if (stiffness !== undefined) t.stiffness = stiffness;
    if (damping !== undefined) t.damping = damping;
    return t;
  }

  const t: VariantTransitionTween = {};
  if (duration !== undefined) t.duration = duration;
  if (delay !== undefined) t.delay = delay;
  if (easeRaw) t.ease = easeRaw;

  return Object.keys(t).length > 0 ? t : undefined;
}
