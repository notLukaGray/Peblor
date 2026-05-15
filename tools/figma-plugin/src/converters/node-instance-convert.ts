/**
 * Converts INSTANCE nodes to ElementBlocks.
 * Handles component-set variant instances, image-fill instances, button instances,
 * and generic group instances.
 */

import type { ElementBlock } from "../types/peblor";
import type { ConversionContext } from "../types/figma-plugin";
import { slugify, ensureUniqueId } from "../utils/slugify";
import { extractImageFill } from "./fills-image";
import { convertImageNode } from "./image";
import { isLikelyButton, convertButtonNode, inferButtonInferenceMeta } from "./button";
import { extractComponentProps } from "./component-props";
import { buildVariantElement, VARIANT_STATE_MAP } from "./component-variants";
import { convertVariantChildren, extractVariantNodeProps } from "./variant-child-helpers";
import { convertGroupNode } from "./node-element-group";
import {
  inferNodeId,
  applyElementAnnotationProps,
  applyAbsPos,
  mergeElementMetaFigma,
  type GroupNodeParentCtx,
} from "./node-element-helpers";
import { reconcileElementOrderWithDefinitions } from "./element-order-reconcile";
import { toPx } from "../utils/css";
import { stripAnnotations } from "./annotations-parse";
import { isLikelyScrollProgressBarNode, isLikelyRiveComponentName } from "./element-media-detect";
import { convertElementInputFromInstance } from "./element-input-convert";
import { inferElementInputInferenceMeta, isInputLikeInstance } from "./section-routing-detect";

type ConvertNodeFn = (
  node: SceneNode,
  ctx: ConversionContext,
  parentCtx?: GroupNodeParentCtx
) => Promise<ElementBlock | null>;

function normalizeVariantPropertyValue(value: unknown): string | undefined {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value).toLowerCase();
  return undefined;
}

function normalizeVariantProperties(variantProps: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(variantProps)) {
    const normalizedValue = normalizeVariantPropertyValue(value);
    if (normalizedValue === undefined) continue;
    normalized[key] = normalizedValue;
  }
  return normalized;
}

export async function convertInstanceNode(
  node: InstanceNode,
  ctx: ConversionContext,
  annotations: Record<string, string>,
  parentCtx: GroupNodeParentCtx | undefined,
  convertNodeFn: ConvertNodeFn
): Promise<ElementBlock | null> {
  let mainComponent: ComponentNode | null = null;
  try {
    const getMainComponent = (
      node as InstanceNode & { getMainComponentAsync?: () => Promise<ComponentNode | null> }
    ).getMainComponentAsync;
    if (typeof getMainComponent === "function") {
      mainComponent = (await getMainComponent.call(node)) ?? null;
    }
  } catch (err) {
    ctx.warnings.push(
      `[component-variants] Instance "${node.name}" main component lookup failed (${String(err)}) — falling back to rendered child conversion`
    );
  }
  const componentSet = mainComponent?.parent;

  if (componentSet && componentSet.type === "COMPONENT_SET") {
    const variantPropsRaw = (node.variantProperties ?? {}) as Record<string, unknown>;
    const variantProps = normalizeVariantProperties(variantPropsRaw);

    let stateKey = Object.keys(variantProps).find((k) =>
      ["state", "mode", "status", "variant"].includes(k.toLowerCase())
    );
    if (!stateKey) {
      stateKey = Object.keys(variantProps).find(
        (k) => VARIANT_STATE_MAP[variantProps[k] ?? ""] !== undefined
      );
    }

    const stateValue = stateKey ? (variantProps[stateKey] ?? null) : null;
    const stateInfo = stateValue ? VARIANT_STATE_MAP[stateValue] : null;
    const isBaseOrUnknown = !stateInfo || stateInfo.isBase;

    if (isBaseOrUnknown) {
      const variantResult = await buildVariantElement(
        componentSet as ComponentSetNode,
        ctx,
        convertNodeFn,
        annotations,
        variantProps
      );
      await applyInstanceOverridesToVariantElement(variantResult, node, ctx, convertNodeFn);
      applyAbsPos(variantResult, node, parentCtx);
      applyElementAnnotationProps(variantResult, node, annotations, ctx.warnings);
      return variantResult;
    } else {
      const rawStateValue = stateKey ? variantPropsRaw[stateKey] : undefined;
      ctx.warnings.push(
        `[component-variants] Instance "${node.name}" is a non-default variant (${stateKey}=${String(rawStateValue)}) placed directly — place the Default variant instead`
      );
    }
  }

  const fills = "fills" in node ? (node.fills as Paint[]) : [];
  const imageFill = extractImageFill(fills);
  if (imageFill) {
    const result = await convertImageNode(node, ctx, parentCtx);
    if (result) {
      applyAbsPos(result, node, parentCtx);
      applyElementAnnotationProps(result, node, annotations, ctx.warnings);
      return result;
    }
    const fallbackId = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
    const fallback: ElementBlock = {
      type: "elementGroup",
      id: fallbackId,
      section: { elementOrder: [], definitions: {} },
      ...(typeof node.width === "number" ? { width: toPx(node.width) } : {}),
      ...(typeof node.height === "number" ? { height: toPx(node.height) } : {}),
    } as ElementBlock;
    mergeElementMetaFigma(fallback, {
      sourceType: node.type,
      sourceName: node.name,
      fallbackReason: "instance-image-export-failed",
    });
    applyAbsPos(fallback, node, parentCtx);
    applyElementAnnotationProps(fallback, node, annotations, ctx.warnings);
    return fallback;
  }

  if (isLikelyButton(node, annotations)) {
    const btn = await convertButtonNode(node, ctx, annotations);
    const btnInfer = inferButtonInferenceMeta(node, annotations);
    if (btnInfer) mergeElementMetaFigma(btn, { inference: btnInfer });
    const compProps = extractComponentProps(node);
    const btnR = btn as unknown as Record<string, unknown>;
    if (compProps.label && !btn.label) btnR.label = compProps.label;
    if (compProps.href && !btn.href) btnR.href = compProps.href;
    if (compProps.disabled !== undefined) btnR.disabled = compProps.disabled;
    if (compProps.variant && !btn.variant) btnR.variant = compProps.variant;
    if (compProps.size && !btn.size) btnR.size = compProps.size;
    applyAbsPos(btn, node, parentCtx);
    applyElementAnnotationProps(btn, node, annotations, ctx.warnings);
    return btn;
  }

  if (isLikelyScrollProgressBarNode(node)) {
    const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
    const height = node.height >= 2 && node.height <= 72 ? toPx(node.height) : undefined;
    const result: ElementBlock = {
      type: "elementScrollProgressBar",
      id,
      ...(height ? { height } : {}),
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  const mainForMedia = mainComponent?.name ?? "";
  if (mainForMedia && isLikelyRiveComponentName(mainForMedia)) {
    const id = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
    const src = `cdn/${slugify(stripAnnotations(node.name || "rive"))}.riv`;
    ctx.warnings.push(
      `[error] [rive] Instance "${node.name}" — placeholder src "${src}"; replace with your deployed .riv URL or set [pb: src=...].`
    );
    const result: ElementBlock = {
      type: "elementRive",
      id,
      src,
    };
    applyAbsPos(result, node, parentCtx);
    applyElementAnnotationProps(result, node, annotations, ctx.warnings);
    return result;
  }

  if (await isInputLikeInstance(node)) {
    const inputEl = await convertElementInputFromInstance(node, ctx);
    mergeElementMetaFigma(inputEl, { inference: inferElementInputInferenceMeta() });
    applyAbsPos(inputEl, node, parentCtx);
    applyElementAnnotationProps(inputEl, node, annotations, ctx.warnings);
    return inputEl;
  }

  const instanceGroupResult = await convertGroupNode(node, ctx, convertNodeFn, parentCtx);
  if (instanceGroupResult) {
    applyElementAnnotationProps(instanceGroupResult, node, annotations, ctx.warnings);
    return instanceGroupResult;
  }

  const fallbackId = ensureUniqueId(slugify(inferNodeId(node)), ctx.usedIds);
  ctx.warnings.push(
    `[warn] "${node.name}" (INSTANCE) — could not fully convert, emitting as fallback group`
  );
  const fallback: ElementBlock = {
    type: "elementGroup",
    id: fallbackId,
    section: { elementOrder: [], definitions: {} },
  } as ElementBlock;
  mergeElementMetaFigma(fallback, {
    sourceType: node.type,
    sourceName: node.name,
    fallbackReason: "instance-conversion-fallback",
  });
  applyAbsPos(fallback, node, parentCtx);
  applyElementAnnotationProps(fallback, node, annotations, ctx.warnings);
  return fallback;
}

async function applyInstanceOverridesToVariantElement(
  variantElement: ElementBlock,
  instanceNode: InstanceNode,
  ctx: ConversionContext,
  convertNodeFn: ConvertNodeFn
): Promise<void> {
  const variantRecord = variantElement as Record<string, unknown>;
  const section = asRecord(variantRecord.section);
  if (!section) return;
  const definitions = asRecord(section.definitions);
  if (!definitions) return;
  const elementOrder = Array.isArray(section.elementOrder)
    ? section.elementOrder.filter((entry): entry is string => typeof entry === "string")
    : [];
  if (elementOrder.length === 0) return;

  const defaultKey = elementOrder.find((key) => {
    const block = asRecord(definitions[key]);
    return block?.type === "elementGroup" && block.hidden !== true;
  });
  if (!defaultKey) return;

  const defaultState = asRecord(definitions[defaultKey]);
  if (!defaultState) return;

  const overriddenNodeProps = extractVariantNodeProps(instanceNode);
  for (const [key, value] of Object.entries(overriddenNodeProps)) {
    defaultState[key] = value;
  }

  const overriddenChildren = await convertVariantChildren(
    instanceNode,
    ctx,
    (sceneNode, localCtx) => convertNodeFn(sceneNode, localCtx)
  );
  const defaultSection = asRecord(defaultState.section);
  if (!defaultSection) {
    defaultState.section = {
      elementOrder: overriddenChildren.elementOrder,
      definitions: overriddenChildren.definitions,
    };
    applyComponentPropertyReferenceOverrides(defaultState, instanceNode);
    return;
  }
  defaultState.section = mergeSectionWithOverrides(defaultSection, {
    elementOrder: overriddenChildren.elementOrder,
    definitions: overriddenChildren.definitions as Record<string, unknown>,
  });
  applyComponentPropertyReferenceOverrides(defaultState, instanceNode);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mergeSectionWithOverrides(
  baseSection: Record<string, unknown>,
  overrideSection: { elementOrder: string[]; definitions: Record<string, unknown> }
): Record<string, unknown> {
  const baseDefinitions = asRecord(baseSection.definitions);
  const baseOrder = Array.isArray(baseSection.elementOrder)
    ? baseSection.elementOrder.filter((entry): entry is string => typeof entry === "string")
    : null;
  if (!baseDefinitions || !baseOrder) {
    return {
      ...baseSection,
      elementOrder: overrideSection.elementOrder,
      definitions: overrideSection.definitions,
    };
  }

  const overrideOrder = overrideSection.elementOrder;
  const overrideDefinitions = overrideSection.definitions;

  const mergedDefinitions: Record<string, unknown> = { ...baseDefinitions };
  const mergedOrder = [...baseOrder];
  for (let i = 0; i < baseOrder.length; i++) {
    const baseId = baseOrder[i];
    const overrideId = overrideOrder[i];
    if (!baseId || !overrideId) continue;
    const baseElement = asRecord(baseDefinitions[baseId]);
    const overrideElement = asRecord(overrideDefinitions[overrideId]);
    if (!baseElement || !overrideElement) continue;
    mergedDefinitions[baseId] = mergeElementWithOverrides(baseElement, overrideElement, baseId);
  }
  // Preserve generated variant structure/motion while still allowing instance-only
  // extra children to come through when the override has more entries.
  for (let i = baseOrder.length; i < overrideOrder.length; i++) {
    const overrideId = overrideOrder[i];
    if (!overrideId) continue;
    const overrideElement = asRecord(overrideDefinitions[overrideId]);
    if (!overrideElement) continue;
    if (!Object.prototype.hasOwnProperty.call(mergedDefinitions, overrideId)) {
      mergedDefinitions[overrideId] = overrideElement;
      mergedOrder.push(overrideId);
    }
  }

  return {
    ...baseSection,
    elementOrder: reconcileElementOrderWithDefinitions(mergedOrder, mergedDefinitions),
    definitions: mergedDefinitions,
  };
}

function mergeElementWithOverrides(
  baseElement: Record<string, unknown>,
  overrideElement: Record<string, unknown>,
  forcedId?: string
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...baseElement,
    ...overrideElement,
  };
  if (forcedId) merged.id = forcedId;

  const baseSection = asRecord(baseElement.section);
  const overrideSection = asRecord(overrideElement.section);
  if (baseSection && overrideSection) {
    const overrideOrder = Array.isArray(overrideSection.elementOrder)
      ? overrideSection.elementOrder.filter((entry): entry is string => typeof entry === "string")
      : [];
    const overrideDefinitions = asRecord(overrideSection.definitions) ?? {};
    merged.section = mergeSectionWithOverrides(baseSection, {
      elementOrder: overrideOrder,
      definitions: overrideDefinitions,
    });
  } else if (forcedId && merged.id !== forcedId) {
    merged.id = forcedId;
  }

  return merged;
}

function buildComponentPropertyLookup(instanceNode: InstanceNode): Map<string, string | boolean> {
  const lookup = new Map<string, string | boolean>();
  const props = instanceNode.componentProperties ?? {};
  for (const [rawKey, prop] of Object.entries(props)) {
    const value = prop.value;
    if (typeof value !== "string" && typeof value !== "boolean") continue;
    lookup.set(rawKey, value);
    const baseKey = rawKey.split("#")[0] ?? rawKey;
    if (!lookup.has(baseKey)) lookup.set(baseKey, value);
  }
  return lookup;
}

function resolveComponentPropertyValue(
  lookup: Map<string, string | boolean>,
  reference: string | undefined
): string | boolean | undefined {
  if (!reference) return undefined;
  if (lookup.has(reference)) return lookup.get(reference);
  const base = reference.split("#")[0] ?? reference;
  if (lookup.has(base)) return lookup.get(base);
  for (const [key, value] of lookup.entries()) {
    if (key === reference) return value;
    if (key.startsWith(`${base}#`)) return value;
  }
  return undefined;
}

function applyComponentPropertyReferenceOverrides(
  rootElement: Record<string, unknown>,
  rootNode: SceneNode
): void {
  if (rootNode.type !== "INSTANCE") return;
  const lookup = buildComponentPropertyLookup(rootNode);
  if (lookup.size === 0) return;
  applyReferenceOverridesRecursive(rootElement, rootNode, lookup);
}

function applyReferenceOverridesRecursive(
  element: Record<string, unknown>,
  node: SceneNode,
  lookup: Map<string, string | boolean>
): void {
  const references = (
    node as SceneNode & {
      componentPropertyReferences?: {
        visible?: string;
        characters?: string;
        mainComponent?: string;
      } | null;
    }
  ).componentPropertyReferences;
  if (references) {
    const visibleValue = resolveComponentPropertyValue(lookup, references.visible);
    if (typeof visibleValue === "boolean") {
      element.hidden = !visibleValue;
    }
    const charactersValue = resolveComponentPropertyValue(lookup, references.characters);
    if (typeof charactersValue === "string") {
      const type = String(element.type ?? "");
      if (type === "elementHeading" || type === "elementBody") element.text = charactersValue;
      if (type === "elementLink" || type === "elementButton") element.label = charactersValue;
      if (type === "elementRichText") element.content = charactersValue;
    }
  }

  const section = asRecord(element.section);
  const definitions = asRecord(section?.definitions);
  const elementOrder = Array.isArray(section?.elementOrder)
    ? section?.elementOrder.filter((entry): entry is string => typeof entry === "string")
    : [];
  const children = "children" in node ? node.children : [];
  if (!definitions || elementOrder.length === 0 || children.length === 0) return;

  const count = Math.min(elementOrder.length, children.length);
  for (let index = 0; index < count; index++) {
    const elementId = elementOrder[index];
    const childElement = asRecord(definitions[elementId]);
    const childNode = children[index];
    if (!childElement || !childNode) continue;
    applyReferenceOverridesRecursive(childElement, childNode, lookup);
  }
}
