/**
 * buildVariantElement — converts a COMPONENT_SET to an interactive elementGroup.
 */

import type { ElementBlock, ElementInteractions, TriggerAction } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { stripAnnotations, parseAnnotations } from "./annotations-parse";
import { parseElementInteractionAnnotations } from "./annotations-interactions";
import { buildMotionTiming } from "./motion";
import { toPx } from "../utils/css";
import { extractVariantGroup, getStateVariableKey } from "./variant-state-map";
import {
  isSameStructure,
  extractVisualDiff,
  extractTextColorDiff,
  inspectTweenDiffTargets,
} from "./variant-structure-diff";
import {
  convertVariantChildren,
  extractVariantNodeProps,
  makeSetVariable,
} from "./variant-child-helpers";
import {
  applyChildGestureDiffs,
  buildOuterGestureMotion,
  type ChildDiffEntry,
} from "./variant-gesture-motion";
import { ensureElementId } from "./node-element-helpers";

function isHardSwap(componentSet: ComponentSetNode): boolean {
  const annotations = parseAnnotations(componentSet.name);
  return annotations["hardswap"] === "true" || "hardswap" in annotations;
}

/**
 * Converts a COMPONENT_SET to an elementGroup that wraps all interactive states.
 *
 * Gesture states (hover / press) use a tween-first approach when structures match.
 * Non-gesture states always use show/hide.
 * `[pb: hardSwap]` skips all tween logic.
 */
export async function buildVariantElement(
  componentSet: ComponentSetNode,
  ctx: ConversionContext,
  convertNodeFn: (node: SceneNode, ctx: ConversionContext) => Promise<ElementBlock | null>,
  annotationOverrides?: Record<string, string>,
  selectorVariantProperties?: Record<string, string> | null
): Promise<ElementBlock> {
  const group = extractVariantGroup(componentSet, selectorVariantProperties);

  if (!group) {
    ctx.warnings.push(
      `[component-variants] COMPONENT_SET "${componentSet.name}" has no recognized State/Mode/Status/Variant property — converted as plain group`
    );
    return buildFallbackGroup(componentSet, ctx, convertNodeFn);
  }

  if (
    selectorVariantProperties &&
    Object.keys(selectorVariantProperties).length > 0 &&
    !group.matchedFamily
  ) {
    ctx.warnings.push(
      `[component-variants] COMPONENT_SET "${componentSet.name}" had no variant family matching instance properties ${JSON.stringify(selectorVariantProperties)} — falling back to the first family`
    );
  }

  const setAnnotations = parseAnnotations(componentSet.name);
  const mergedAnnotations = { ...setAnnotations, ...annotationOverrides };
  const hardSwap = isHardSwap(componentSet);

  const groupId = ensureUniqueId(slugify(stripAnnotations(componentSet.name)), ctx.usedIds);
  const stateVarKey = getStateVariableKey(groupId);
  const innerUsedIds = new Set<string>(ctx.usedIds);
  const outerDefinitions: Record<string, ElementBlock> = {};
  const outerElementOrder: string[] = [];
  const interactions: ElementInteractions = {};
  let needsPointerCursor = false;
  const gestureMotion: Record<string, Record<string, unknown>> = {};
  const childDiffs = new Map<string, ChildDiffEntry>();

  // Default state
  const defaultStateId = ensureUniqueId(`${groupId}--default`, innerUsedIds);
  ctx.usedIds.add(defaultStateId);

  const defaultNodeProps = extractVariantNodeProps(group.defaultVariant);
  const defaultChildren = await convertVariantChildren(group.defaultVariant, ctx, convertNodeFn);

  const defaultInner: ElementBlock = {
    type: "elementGroup",
    id: defaultStateId,
    ...defaultNodeProps,
    section: {
      elementOrder: defaultChildren.elementOrder,
      definitions: defaultChildren.definitions,
    },
  };

  outerDefinitions[defaultStateId] = defaultInner;
  outerElementOrder.push(defaultStateId);

  // Interactive states
  for (const [stateValue, { node: variantNode, info }] of group.states) {
    const isGestureState = !hardSwap && !!info.gesture && !!info.gestureProp;

    if (isGestureState) {
      const sameStructure = isSameStructure(group.defaultVariant, variantNode);

      if (sameStructure) {
        const tweenDiagnostics = inspectTweenDiffTargets(group.defaultVariant, variantNode);
        const diff = extractVisualDiff(group.defaultVariant, variantNode);

        if (Object.keys(diff).length > 0) {
          gestureMotion[info.gestureProp!] = diff;
          ctx.warnings.push(
            `[info] [component-variants] "${groupId}" state "${stateValue}" tweens via ${info.gestureProp}: ${JSON.stringify(diff)}`
          );
        } else if (
          !tweenDiagnostics.hasSupportedTargets &&
          !tweenDiagnostics.hasUnsupportedTargets
        ) {
          ctx.warnings.push(
            `[info] [component-variants] "${groupId}" state "${stateValue}" is structurally identical with no visual diff — skipping ${info.gestureProp}`
          );
        }

        // Intentionally suppress "ignored" tween diagnostics in UI/JSON to avoid noisy warnings.

        const baseKids =
          "children" in group.defaultVariant
            ? (group.defaultVariant.children as readonly SceneNode[])
            : [];
        const varKids =
          "children" in variantNode ? (variantNode.children as readonly SceneNode[]) : [];
        for (let ki = 0; ki < Math.min(baseKids.length, varKids.length); ki++) {
          const bc = baseKids[ki];
          const vc = varKids[ki];
          // Bug 2 fix: strip keys already captured by the parent gestureMotion for
          // this prop — avoids redundant width/height animation at both levels.
          const parentDiff = gestureMotion[info.gestureProp!] ?? {};
          if (bc.type === "TEXT" && vc.type === "TEXT") {
            const cDiff = extractTextColorDiff(bc as TextNode, vc as TextNode);
            const filteredCDiff: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(cDiff)) {
              if (!(k in parentDiff)) filteredCDiff[k] = v;
            }
            if (Object.keys(filteredCDiff).length === 0) continue;
            const childId = defaultChildren.elementOrder[ki];
            if (!childId) continue;
            let entry = childDiffs.get(childId);
            if (!entry) {
              entry = { diffs: new Map(), hadOwnWidth: false };
              childDiffs.set(childId, entry);
            }
            entry.diffs.set(info.gestureProp!, filteredCDiff);
            continue;
          }
          if (!("fills" in bc)) continue;
          const cDiff = extractVisualDiff(bc as ComponentNode, vc as ComponentNode);
          // Capture hadOwnWidth from the UNFILTERED diff (before Gap 6 deduplication
          // removes width keys that the parent already animates). This preserves the
          // intent of Fix B (variant-gesture-motion.ts) which must know whether the
          // child originally had its own width diff, not whether it survived filtering.
          const hadOwnWidth = "width" in cDiff;
          const filteredCDiff: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(cDiff)) {
            if (!(k in parentDiff)) filteredCDiff[k] = v;
          }
          if (Object.keys(filteredCDiff).length === 0) continue;
          const childId = defaultChildren.elementOrder[ki];
          if (!childId) continue;
          let entry = childDiffs.get(childId);
          if (!entry) {
            entry = { diffs: new Map(), hadOwnWidth };
            childDiffs.set(childId, entry);
          } else if (hadOwnWidth) {
            entry.hadOwnWidth = true;
          }
          entry.diffs.set(info.gestureProp!, filteredCDiff);
        }

        needsPointerCursor = true;
        continue;
      }

      ctx.warnings.push(
        `[component-variants] "${groupId}" state "${stateValue}" has differing structure — falling back to show/hide`
      );
    }

    // Show/hide path
    const stateId = ensureUniqueId(`${groupId}--${stateValue}`, innerUsedIds);
    ctx.usedIds.add(stateId);

    const nodeProps = extractVariantNodeProps(variantNode);
    const children = await convertVariantChildren(variantNode, ctx, convertNodeFn);

    const stateInner: ElementBlock = {
      type: "elementGroup",
      id: stateId,
      ...nodeProps,
      hidden: true,
      visibleWhen: { variable: stateVarKey, operator: "equals", value: stateValue },
      section: { elementOrder: children.elementOrder, definitions: children.definitions },
    };

    outerDefinitions[stateId] = stateInner;
    outerElementOrder.push(stateId);

    if (info.trigger) {
      (interactions as Record<string, TriggerAction>)[info.trigger] = makeSetVariable(
        stateVarKey,
        stateValue
      );
      needsPointerCursor = true;
    }
    if (info.release) {
      (interactions as Record<string, TriggerAction>)[info.release] = makeSetVariable(
        stateVarKey,
        "default"
      );
    }

    if (info.toggle && !info.release) {
      ctx.warnings.push(
        `[component-variants] "${groupId}" state "${stateValue}" is a toggle — second click resets to base via setVariable on the SAME onClick. ` +
          `Use [pb: onClick=elementToggle:${stateId}] if you need explicit toggle semantics.`
      );
    }
  }

  // Terminal states
  for (const [stateValue, { node: variantNode }] of group.terminals) {
    const terminalId = ensureUniqueId(`${groupId}--${stateValue}`, innerUsedIds);
    ctx.usedIds.add(terminalId);

    const nodeProps = extractVariantNodeProps(variantNode);
    const children = await convertVariantChildren(variantNode, ctx, convertNodeFn);

    const terminalInner: ElementBlock = {
      type: "elementGroup",
      id: terminalId,
      ...nodeProps,
      hidden: true,
      visibleWhen: { variable: stateVarKey, operator: "equals", value: stateValue },
      section: { elementOrder: children.elementOrder, definitions: children.definitions },
    };

    outerDefinitions[terminalId] = terminalInner;
    outerElementOrder.push(terminalId);
  }

  const hasGestureMotion = Object.keys(gestureMotion).length > 0;
  const defaultWrapperStyle = ((defaultInner as Record<string, unknown>).wrapperStyle ??
    {}) as Record<string, unknown>;
  const defaultHasRoundedMask =
    (defaultInner as Record<string, unknown>).borderRadius !== undefined ||
    defaultWrapperStyle.borderRadius !== undefined;

  // Apply child-level gesture diffs
  applyChildGestureDiffs(childDiffs, defaultChildren, setAnnotations);

  // Build outer gesture motion and assign to default state inner
  const outerMotion = buildOuterGestureMotion(gestureMotion, setAnnotations);
  if (outerMotion) {
    (defaultInner as Record<string, unknown>).motion = outerMotion;
  }
  // Bug 1 fix: overflow: "visible" belongs on the animated inner element so that
  // Framer Motion can render gesture transforms outside its own box, but NOT on
  // the outer group where it would defeat border-radius clipping (e.g. pill buttons).
  if (hasGestureMotion && !defaultHasRoundedMask) {
    (defaultInner as Record<string, unknown>).overflow = "visible";
  }

  if (needsPointerCursor) {
    const ws = ((defaultInner as Record<string, unknown>).wrapperStyle ?? {}) as Record<
      string,
      unknown
    >;
    ws.cursor = "pointer";
    (defaultInner as Record<string, unknown>).wrapperStyle = ws;
  }

  // Other (non-state) variant properties
  const extraProps: Record<string, unknown> = {};
  for (const [propKey, propValue] of group.otherProperties) {
    const normalized = propKey.toLowerCase();
    if (normalized === "size") {
      extraProps.size = propValue.toLowerCase();
    } else if (normalized === "theme" || normalized === "color" || normalized === "style") {
      if (!extraProps.variant) extraProps.variant = propValue.toLowerCase();
    } else {
      ctx.warnings.push(
        `[component-variants] "${groupId}" has non-state variant property "${propKey}=${propValue}" — not mapped to a peblor prop`
      );
    }
  }

  // Build motionTiming
  const annotationInteractions = parseElementInteractionAnnotations(mergedAnnotations);
  const combinedInteractions =
    annotationInteractions && Object.keys(annotationInteractions).length > 0
      ? { ...interactions, ...annotationInteractions }
      : interactions;
  const motionTiming = buildMotionTiming(mergedAnnotations);

  const hasDimensionGestureOuter =
    hasGestureMotion && Object.values(gestureMotion).some((t) => "width" in t || "height" in t);
  const outerOverflowForDimensionGesture = hasDimensionGestureOuter
    ? defaultHasRoundedMask
      ? "hidden"
      : "visible"
    : undefined;

  const outerGroup: ElementBlock = {
    type: "elementGroup",
    id: groupId,
    ...extraProps,
    ...(Object.keys(combinedInteractions).length > 0 ? { interactions: combinedInteractions } : {}),
    ...(motionTiming ? { motionTiming } : {}),
    ...(outerOverflowForDimensionGesture ? { overflow: outerOverflowForDimensionGesture } : {}),
    ...(hasDimensionGestureOuter ? { layoutChildren: true } : {}),
    ...(hasDimensionGestureOuter
      ? { motion: { layout: true } as Record<string, unknown> }
      : {
          width: toPx(group.defaultVariant.width),
          height: toPx(group.defaultVariant.height),
        }),
    section: { elementOrder: outerElementOrder, definitions: outerDefinitions },
  };

  return outerGroup;
}

async function buildFallbackGroup(
  componentSet: ComponentSetNode,
  ctx: ConversionContext,
  convertNodeFn: (node: SceneNode, ctx: ConversionContext) => Promise<ElementBlock | null>
): Promise<ElementBlock> {
  const id = ensureUniqueId(slugify(stripAnnotations(componentSet.name)), ctx.usedIds);

  const definitions: Record<string, ElementBlock> = {};
  const elementOrder: string[] = [];

  const children = componentSet.children.filter((n): n is ComponentNode => n.type === "COMPONENT");
  const firstChild = children[0];
  if (firstChild) {
    const childChildren = "children" in firstChild ? firstChild.children : [];
    for (const child of childChildren) {
      try {
        const converted = await convertNodeFn(child, ctx);
        if (converted) {
          const childId = ensureElementId(converted, child.name || child.type, ctx, ctx.warnings);
          definitions[childId] = converted;
          elementOrder.push(childId);
        }
      } catch (err) {
        ctx.warnings.push(
          `[component-variants] Fallback: failed converting child "${child.name}": ${String(err)}`
        );
      }
    }
  }

  return {
    type: "elementGroup",
    id,
    width: toPx(componentSet.width),
    height: toPx(componentSet.height),
    section: { elementOrder, definitions },
  };
}
