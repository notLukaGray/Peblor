/**
 * Variant structure comparison and visual diff extraction.
 */

import { extractSolidFill } from "./fills-solid";
import { extractBoxShadow, extractFilter, extractBackdropFilter } from "./effects";
import { toPx } from "../utils/css";

const SUPPORTED_TWEEN_EFFECT_TYPES = new Set<Effect["type"]>([
  "DROP_SHADOW",
  "INNER_SHADOW",
  "LAYER_BLUR",
  "BACKGROUND_BLUR",
]);

const TEXT_UNSUPPORTED_TWEEN_PROPS = [
  "x",
  "y",
  "rotation",
  "opacity",
  "blendMode",
  "visible",
  "fontName",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlignHorizontal",
  "textAlignVertical",
  "paragraphSpacing",
  "textCase",
  "textDecoration",
  "textAutoResize",
  "maxLines",
] as const;

const VISUAL_UNSUPPORTED_TWEEN_PROPS = [
  "x",
  "y",
  "rotation",
  "blendMode",
  "visible",
  "clipsContent",
  "strokeWeight",
  "strokeAlign",
  "strokeCap",
  "strokeJoin",
  "dashPattern",
  "cornerSmoothing",
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
] as const;

const LAYOUT_UNSUPPORTED_TWEEN_PROPS = [
  "layoutMode",
  "primaryAxisAlignItems",
  "counterAxisAlignItems",
  "primaryAxisSizingMode",
  "counterAxisSizingMode",
  "itemSpacing",
  "counterAxisSpacing",
  "layoutGrow",
  "layoutAlign",
] as const;

export interface TweenDiffDiagnostics {
  hasSupportedTargets: boolean;
  hasUnsupportedTargets: boolean;
  /** The Figma node property names that changed but cannot be expressed as CSS tween targets. */
  unsupportedProps: string[];
}

function valueDiffers(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/** Returns "fill" if the fill delta cannot be expressed as a CSS backgroundColor tween, else null. */
function unsupportedFillProp(
  baseFills: readonly Paint[],
  variantFills: readonly Paint[]
): string | null {
  const baseSolid = extractSolidFill(baseFills);
  const variantSolid = extractSolidFill(variantFills);
  if (baseSolid !== variantSolid) {
    return baseSolid === undefined || variantSolid === undefined ? "fill (non-solid)" : null;
  }
  return valueDiffers(baseFills, variantFills) ? "fill" : null;
}

/** Returns "effects (unsupported type)" if a non-tweeneable effect type changed, else null. */
function unsupportedEffectProp(
  baseEffects: readonly Effect[],
  variantEffects: readonly Effect[]
): string | null {
  const baseUnsupported = baseEffects.filter(
    (effect) => effect.visible !== false && !SUPPORTED_TWEEN_EFFECT_TYPES.has(effect.type)
  );
  const variantUnsupported = variantEffects.filter(
    (effect) => effect.visible !== false && !SUPPORTED_TWEEN_EFFECT_TYPES.has(effect.type)
  );
  return valueDiffers(baseUnsupported, variantUnsupported) ? "effects (unsupported type)" : null;
}

/** Returns the Figma property names that changed on a TEXT node but cannot be CSS-tweened. */
function collectUnsupportedTextProps(base: TextNode, variant: TextNode): string[] {
  const baseRecord = base as unknown as Record<string, unknown>;
  const variantRecord = variant as unknown as Record<string, unknown>;
  const props: string[] = [];

  const fillProp = unsupportedFillProp(
    ("fills" in base ? (base.fills as Paint[]) : []) as readonly Paint[],
    ("fills" in variant ? (variant.fills as Paint[]) : []) as readonly Paint[]
  );
  if (fillProp) props.push(fillProp);

  for (const prop of TEXT_UNSUPPORTED_TWEEN_PROPS) {
    if (valueDiffers(baseRecord[prop], variantRecord[prop])) props.push(prop);
  }

  return props;
}

/** Returns the Figma property names that changed on a visual node but cannot be CSS-tweened. */
function collectUnsupportedVisualProps(base: SceneNode, variant: SceneNode): string[] {
  const baseRecord = base as unknown as Record<string, unknown>;
  const variantRecord = variant as unknown as Record<string, unknown>;
  const props: string[] = [];

  const baseW = baseRecord.width as number | undefined;
  const baseH = baseRecord.height as number | undefined;
  const variantW = variantRecord.width as number | undefined;
  const variantH = variantRecord.height as number | undefined;
  const sizeChanged =
    (typeof baseW === "number" &&
      typeof variantW === "number" &&
      Math.abs(variantW - baseW) > 0.5) ||
    (typeof baseH === "number" && typeof variantH === "number" && Math.abs(variantH - baseH) > 0.5);
  const baseLayoutPos = baseRecord.layoutPositioning as string | undefined;
  const variantLayoutPos = variantRecord.layoutPositioning as string | undefined;
  const isAutoLayoutChild = baseLayoutPos === "AUTO" || variantLayoutPos === "AUTO";

  const fillProp = unsupportedFillProp(
    ("fills" in base ? (base.fills as Paint[]) : []) as readonly Paint[],
    ("fills" in variant ? (variant.fills as Paint[]) : []) as readonly Paint[]
  );
  if (fillProp) props.push(fillProp);

  const baseEffects = "effects" in base ? (base.effects as readonly Effect[]) : [];
  const variantEffects = "effects" in variant ? (variant.effects as readonly Effect[]) : [];
  const effectProp = unsupportedEffectProp(baseEffects, variantEffects);
  if (effectProp) props.push(effectProp);

  for (const prop of VISUAL_UNSUPPORTED_TWEEN_PROPS) {
    if ((sizeChanged || isAutoLayoutChild) && (prop === "x" || prop === "y")) continue;
    if (valueDiffers(baseRecord[prop], variantRecord[prop])) props.push(prop);
  }

  const baseLayoutMode = (baseRecord.layoutMode as string | undefined) ?? "NONE";
  const variantLayoutMode = (variantRecord.layoutMode as string | undefined) ?? "NONE";
  const hasAutoLayout = baseLayoutMode !== "NONE" || variantLayoutMode !== "NONE";

  if (hasAutoLayout) {
    for (const prop of LAYOUT_UNSUPPORTED_TWEEN_PROPS) {
      if (!valueDiffers(baseRecord[prop], variantRecord[prop])) continue;
      // Suppress noisy auto-layout deltas when they're a side effect of size changes.
      if (prop !== "layoutMode" && sizeChanged) continue;
      props.push(prop);
    }
  }

  return props;
}

function inspectTweenDiffTargetsRecursive(
  base: SceneNode,
  variant: SceneNode,
  diagnostics: TweenDiffDiagnostics
): void {
  if (base.type === "TEXT" && variant.type === "TEXT") {
    if (Object.keys(extractTextColorDiff(base, variant)).length > 0) {
      diagnostics.hasSupportedTargets = true;
    }
    const unsupported = collectUnsupportedTextProps(base, variant);
    if (unsupported.length > 0) {
      diagnostics.hasUnsupportedTargets = true;
      for (const p of unsupported) {
        if (!diagnostics.unsupportedProps.includes(p)) diagnostics.unsupportedProps.push(p);
      }
    }
  } else {
    if (
      Object.keys(extractVisualDiff(base as ComponentNode, variant as ComponentNode)).length > 0
    ) {
      diagnostics.hasSupportedTargets = true;
    }
    const unsupported = collectUnsupportedVisualProps(base, variant);
    if (unsupported.length > 0) {
      diagnostics.hasUnsupportedTargets = true;
      for (const p of unsupported) {
        if (!diagnostics.unsupportedProps.includes(p)) diagnostics.unsupportedProps.push(p);
      }
    }
  }

  const baseChildren = "children" in base ? (base.children as readonly SceneNode[]) : [];
  const variantChildren = "children" in variant ? (variant.children as readonly SceneNode[]) : [];
  for (let i = 0; i < Math.min(baseChildren.length, variantChildren.length); i++) {
    inspectTweenDiffTargetsRecursive(baseChildren[i], variantChildren[i], diagnostics);
  }
}

/**
 * Summarizes tween-relevant deltas across a same-structure node pair.
 * Supported targets include the current visual diff surface; unsupported targets
 * are changes we do not serialize into tween motion.
 */
export function inspectTweenDiffTargets(base: SceneNode, variant: SceneNode): TweenDiffDiagnostics {
  const diagnostics: TweenDiffDiagnostics = {
    hasSupportedTargets: false,
    hasUnsupportedTargets: false,
    unsupportedProps: [],
  };

  inspectTweenDiffTargetsRecursive(base, variant, diagnostics);
  return diagnostics;
}

/**
 * Returns true when two scene nodes are structurally equivalent.
 * "Structurally equivalent" means same child count, types, and text content.
 */
export function isSameStructure(a: SceneNode, b: SceneNode): boolean {
  const aChildren = "children" in a ? (a.children as readonly SceneNode[]) : [];
  const bChildren = "children" in b ? (b.children as readonly SceneNode[]) : [];

  if (aChildren.length === 0 && bChildren.length === 0) return true;
  if (aChildren.length !== bChildren.length) return false;

  for (let i = 0; i < aChildren.length; i++) {
    const ac = aChildren[i];
    const bc = bChildren[i];

    if (ac.type !== bc.type) return false;

    if (ac.type === "TEXT" && bc.type === "TEXT") {
      const aText = (ac as TextNode).characters.trim();
      const bText = (bc as TextNode).characters.trim();
      if (aText !== bText) return false;
    }

    if (!isSameStructure(ac, bc)) return false;
  }

  return true;
}

/**
 * Extracts properties that differ between a base ComponentNode and a variant.
 * Only emits keys where the variant's value differs from the base.
 *
 * Emitted keys: backgroundColor, width, height, borderRadius, boxShadow,
 * opacity, filter, backdropFilter, padding(Left/Right/Top/Bottom).
 */
export function extractVisualDiff(
  base: ComponentNode,
  variant: ComponentNode
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};

  // backgroundColor
  const baseFills = "fills" in base ? (base.fills as Paint[]) : [];
  const variantFills = "fills" in variant ? (variant.fills as Paint[]) : [];
  const baseBg = extractSolidFill(baseFills);
  const variantBg = extractSolidFill(variantFills);
  if (variantBg !== baseBg) {
    diff.backgroundColor = variantBg ?? "transparent";
  }

  // width / height
  const xChanged = Math.abs(variant.width - base.width) > 0.5;
  const yChanged = Math.abs(variant.height - base.height) > 0.5;
  if (xChanged) diff.width = toPx(variant.width);
  if (yChanged) diff.height = toPx(variant.height);

  // borderRadius
  {
    const br = base.cornerRadius;
    const vr = variant.cornerRadius;
    const baseRadius = typeof br === "number" && br !== 0 ? toPx(br) : undefined;
    const variantRadius = typeof vr === "number" && vr !== 0 ? toPx(vr) : undefined;
    if (variantRadius !== baseRadius) {
      diff.borderRadius = variantRadius ?? "0px";
    }
  }

  // boxShadow
  const baseEffects = "effects" in base ? (base.effects as readonly Effect[]) : [];
  const variantEffects = "effects" in variant ? (variant.effects as readonly Effect[]) : [];
  const baseShadow = extractBoxShadow(baseEffects);
  const variantShadow = extractBoxShadow(variantEffects);
  if (variantShadow !== baseShadow) diff.boxShadow = variantShadow ?? "none";

  // opacity
  const baseOpacity = "opacity" in base ? (base.opacity as number) : 1;
  const variantOpacity = "opacity" in variant ? (variant.opacity as number) : 1;
  if (variantOpacity !== baseOpacity) diff.opacity = variantOpacity;

  // filter
  const baseFilter = extractFilter(baseEffects);
  const variantFilter = extractFilter(variantEffects);
  if (variantFilter !== baseFilter) diff.filter = variantFilter ?? "none";

  // backdropFilter
  const baseBackdrop = extractBackdropFilter(baseEffects);
  const variantBackdrop = extractBackdropFilter(variantEffects);
  if (variantBackdrop !== baseBackdrop) diff.backdropFilter = variantBackdrop ?? "none";

  // padding
  const basePL = "paddingLeft" in base ? (base.paddingLeft as number) : 0;
  const basePR = "paddingRight" in base ? (base.paddingRight as number) : 0;
  const basePT = "paddingTop" in base ? (base.paddingTop as number) : 0;
  const basePB = "paddingBottom" in base ? (base.paddingBottom as number) : 0;
  const varPL = "paddingLeft" in variant ? (variant.paddingLeft as number) : 0;
  const varPR = "paddingRight" in variant ? (variant.paddingRight as number) : 0;
  const varPT = "paddingTop" in variant ? (variant.paddingTop as number) : 0;
  const varPB = "paddingBottom" in variant ? (variant.paddingBottom as number) : 0;
  if (Math.abs(varPL - basePL) > 0.5) diff.paddingLeft = toPx(varPL);
  if (Math.abs(varPR - basePR) > 0.5) diff.paddingRight = toPx(varPR);
  if (Math.abs(varPT - basePT) > 0.5) diff.paddingTop = toPx(varPT);
  if (Math.abs(varPB - basePB) > 0.5) diff.paddingBottom = toPx(varPB);

  return diff;
}

/**
 * Extracts a CSS `color` diff for TEXT nodes whose fill changes between states.
 * Text fill maps to CSS `color`, not `backgroundColor`.
 * Returns `{ color: variantFill }` when the solid fill differs, or `{}` when unchanged.
 */
export function extractTextColorDiff(base: TextNode, variant: TextNode): Record<string, unknown> {
  const baseFills = "fills" in base ? (base.fills as Paint[]) : [];
  const variantFills = "fills" in variant ? (variant.fills as Paint[]) : [];
  const baseColor = extractSolidFill(baseFills);
  const variantColor = extractSolidFill(variantFills);
  if (variantColor === baseColor) return {};
  return { color: variantColor ?? "inherit" };
}
