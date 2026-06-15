import type { ElementBlock, SectionBlock, bgBlock } from "@pb/contracts/types";
import type { BackgroundTransitionEffect, PageScrollConfig } from "@pb/contracts/types";

export type BlockCapabilityClassification = "static" | "client" | "mixed";

export type BlockCapabilityReason =
  | "ancestor-client"
  | "client-background"
  | "client-only-type"
  | "client-prop"
  | "client-child"
  | "page-runtime"
  | "store-read"
  | "static-capable";

export type BlockHydrationPriority = "critical" | "approaching" | "idle";

export type BlockCapabilityNode = {
  id?: string;
  type: string;
  kind: "section" | "element" | "background" | "page";
  classification: BlockCapabilityClassification;
  reasons: BlockCapabilityReason[];
  block?: SectionBlock | ElementBlock | bgBlock;
  children: BlockCapabilityNode[];
  priority?: BlockHydrationPriority;
};

export type AnalyzeBlockCapabilitiesInput = {
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  overlaySections?: SectionBlock[];
  transitions?: BackgroundTransitionEffect | BackgroundTransitionEffect[];
  scroll?: PageScrollConfig;
  variableBindings?: Iterable<string>;
};

export type AnalyzeBlockCapabilitiesResult = {
  classification: BlockCapabilityClassification;
  hasClientBlocks: boolean;
  hasMixedBlocks: boolean;
  usesPageRuntime: boolean;
  tree: BlockCapabilityNode;
};

export const STATIC_ELEMENT_TYPES = new Set([
  "elementHeading",
  "elementBody",
  "elementRichText",
  "elementLink",
  "elementImage",
  "elementSpacer",
  "elementDivider",
  "elementGroup",
  "elementVector",
  "elementCounter",
  "elementEmbed",
  "elementList",
  "elementBlockquote",
  "elementTable",
  "elementCode",
  "elementButton",
]);

export const STATIC_SECTION_TYPES = new Set(["divider", "contentBlock", "sectionColumn"]);

const ALWAYS_CLIENT_ELEMENT_TYPES = new Set([
  "elementVideo",
  "elementAudio",
  "elementModel3D",
  "elementRive",
  "elementInfiniteScroll",
  "elementRange",
  "elementInput",
  "elementVideoTime",
  "elementVideoQualitySelect",
  "elementScrollProgressBar",
  "elementLottie",
  "elementMarquee",
  "elementImageCompare",
  "elementTabs",
  "elementTooltip",
  "elementFormField",
]);

const ALWAYS_CLIENT_SECTION_TYPES = new Set(["formBlock", "sectionTrigger", "revealSection"]);

const CLIENT_PROP_KEYS = new Set([
  "action",
  "actions",
  "cursorTriggers",
  "disclosure",
  "dragAxis",
  "fixed",
  "dragBehavior",
  "dragUnit",
  "exitPreset",
  "interactions",
  "keyboardTriggers",
  // "motion" and "motionTiming" are intentionally absent here for elements.
  // Entrance and gesture animations are applied as a thin "use client" wrapper
  // (ElementEntranceWrapper) in ServerElementRenderer — they never force the
  // element's content into a ClientElementIsland with zero SSR.
  // Exceptions (onTrigger, staggerChildren) are re-added in ownReasonsForElement.
  // Sections still treat motionTiming as a client prop (handled via analyzeSection).
  "motion", // kept for SECTION classification only — removed from element check below
  "motionTiming", // kept for SECTION classification only — removed from element check below
  "onInvisible",
  "onPageProgress",
  "onProgress",
  "onViewportProgress",
  "onVisible",
  "reorderable",
  "scrollDirectionTriggers",
  "scrollOpacityRange",
  "scrollProgressTrigger",
  "scrollProgressTriggerId",
  // scrollSpeed intentionally omitted — default value (1) must not force client classification.
  // Checked explicitly in ownReasonsForSection below.
  "timerTriggers",
  "visibleWhen",
  // New element client-only props
  "trigger", // element.counter scroll/visible trigger
  // Removed: showWaveform, hoverActivate, followCursor, interactivity, pauseOnHover, pauseOnFocus.
  // These only appear on types already in ALWAYS_CLIENT_ELEMENT_TYPES so they never change
  // classification — including them adds a spurious "client-prop" reason.
]);

/**
 * Animation keys that get a thin "use client" wrapper in ServerElementRenderer
 * rather than a full ClientElementIsland. Excluded from element client-prop checks
 * (except for onTrigger / staggerChildren exceptions handled in ownReasonsForElement).
 */
const ELEMENT_ANIMATION_WRAPPER_KEYS = new Set(["motion", "motionTiming"]);

const TEMPLATE_VARIABLE_PATTERN = /\{\s*[a-zA-Z_$][\w$-]*(?:\.[\w$-]+)+\s*\}/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function arrayHasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function reasonSet(reasons: BlockCapabilityReason[]): BlockCapabilityReason[] {
  return Array.from(new Set(reasons));
}

function getBlockId(block: unknown): string | undefined {
  return isRecord(block) && typeof block.id === "string" ? block.id : undefined;
}

function getBlockType(block: unknown): string {
  return isRecord(block) && typeof block.type === "string" ? block.type : "unknown";
}

function hasClientProp(block: unknown): boolean {
  if (!isRecord(block)) return false;

  for (const key of CLIENT_PROP_KEYS) {
    if (hasMeaningfulValue(block[key])) return true;
  }

  return false;
}

/**
 * Element-specific client-prop check. Excludes animation wrapper keys
 * (motion, motionTiming) unless they contain exceptions that genuinely
 * require a full client island:
 *   - motionTiming.trigger === "onTrigger" — needs the trigger store
 *   - motionTiming.staggerChildren on a group — needs MixedElementGroupIsland
 */
function hasClientPropForElement(block: unknown): boolean {
  if (!isRecord(block)) return false;

  for (const key of CLIENT_PROP_KEYS) {
    if (ELEMENT_ANIMATION_WRAPPER_KEYS.has(key)) continue; // handled by thin wrapper
    if (hasMeaningfulValue(block[key])) return true;
  }

  // Exception 1: onTrigger requires the trigger store — stays full client
  const mt = block.motionTiming;
  if (isRecord(mt) && mt.trigger === "onTrigger") return true;

  // Exception 2: staggerChildren requires MixedElementGroupIsland — stays full client
  if (
    getBlockType(block) === "elementGroup" &&
    isRecord(mt) &&
    hasMeaningfulValue(mt.staggerChildren)
  ) {
    return true;
  }

  return false;
}

function hasGlassEffect(block: unknown): boolean {
  if (!isRecord(block)) return false;
  const effects = block.effects;
  if (!Array.isArray(effects)) return false;
  return effects.some((effect) => isRecord(effect) && effect.type === "glass");
}

function omitKeys(value: unknown, keys: string[]): unknown {
  if (!isRecord(value)) return value;
  const omitted = new Set(keys);
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!omitted.has(key)) next[key] = child;
  }
  return next;
}

function hasVariableBindingString(value: string, variableBindings: Set<string>): boolean {
  if (TEMPLATE_VARIABLE_PATTERN.test(value)) return true;

  for (const binding of variableBindings) {
    if (binding !== "" && value.includes(binding)) return true;
  }

  return false;
}

function hasStoreRead(value: unknown, variableBindings: Set<string>, parentKey?: string): boolean {
  if (typeof value === "string") return hasVariableBindingString(value, variableBindings);
  if (Array.isArray(value))
    return value.some((item) => hasStoreRead(item, variableBindings, parentKey));
  if (!isRecord(value)) return false;

  for (const [key, child] of Object.entries(value)) {
    if (key === "variableKey" && typeof child === "string" && child !== "") return true;
    if (
      key === "variable" &&
      parentKey === "visibleWhen" &&
      typeof child === "string" &&
      child !== ""
    ) {
      return true;
    }
    if (
      key === "conditions" &&
      parentKey === "visibleWhen" &&
      hasStoreRead(child, variableBindings, parentKey)
    ) {
      return true;
    }
    if (hasStoreRead(child, variableBindings, key)) return true;
  }

  return false;
}

function elementGroupChildren(block: ElementBlock): ElementBlock[] {
  if (getBlockType(block) !== "elementGroup" || !isRecord(block)) return [];
  const section = (block as Record<string, unknown>).section;
  if (!isRecord(section) || !isRecord(section.definitions)) return [];
  const order = Array.isArray(section.elementOrder)
    ? section.elementOrder
    : Object.keys(section.definitions);
  return order
    .map((key) => (section.definitions as Record<string, unknown>)[String(key)])
    .filter((child): child is ElementBlock => isRecord(child) && typeof child.type === "string");
}

function sectionChildElements(section: SectionBlock): ElementBlock[] {
  const record = section as SectionBlock & {
    elements?: ElementBlock[];
    collapsedElements?: ElementBlock[];
    revealedElements?: ElementBlock[];
    definitions?: Record<string, unknown>;
  };
  const definitionElements = isRecord(record.definitions)
    ? Object.values(record.definitions).filter(
        (child): child is ElementBlock => isRecord(child) && typeof child.type === "string"
      )
    : [];
  return [
    ...(Array.isArray(record.elements) ? record.elements : []),
    ...(Array.isArray(record.collapsedElements) ? record.collapsedElements : []),
    ...(Array.isArray(record.revealedElements) ? record.revealedElements : []),
    ...definitionElements,
  ];
}

function ownReasonsForElement(
  block: ElementBlock,
  variableBindings: Set<string>
): BlockCapabilityReason[] {
  const type = getBlockType(block);
  const reasons: BlockCapabilityReason[] = [];

  // STATIC_* and ALWAYS_CLIENT_* sets must remain disjoint: a type in both would be
  // incorrectly forced to client even if fully statically renderable.
  if (!STATIC_ELEMENT_TYPES.has(type) || ALWAYS_CLIENT_ELEMENT_TYPES.has(type)) {
    reasons.push("client-only-type");
  }
  // Use element-specific check: excludes motion/motionTiming unless onTrigger/stagger exceptions apply
  if (hasClientPropForElement(block) || hasGlassEffect(block)) reasons.push("client-prop");
  if (hasStoreRead(omitKeys(block, ["section", "elements", "definitions"]), variableBindings)) {
    reasons.push("store-read");
  }

  // Button-specific: vectorRef and fill/stroke refs require definitions context
  // (not available in server components). Only force client when there's no fallback
  // literal value — e.g. wrapperFillRef without wrapperFill needs definitions.
  if (type === "elementButton" && isRecord(block)) {
    const btnBlock = block as Record<string, unknown>;
    if (typeof btnBlock.vectorRef === "string" && btnBlock.vectorRef !== "") {
      reasons.push("client-prop");
    }
    if (
      typeof btnBlock.wrapperFillRef === "string" &&
      btnBlock.wrapperFillRef !== "" &&
      (btnBlock.wrapperFill == null || btnBlock.wrapperFill === "")
    ) {
      reasons.push("client-prop");
    }
    if (
      typeof btnBlock.wrapperStrokeRef === "string" &&
      btnBlock.wrapperStrokeRef !== "" &&
      (btnBlock.wrapperStroke == null || btnBlock.wrapperStroke === "")
    ) {
      reasons.push("client-prop");
    }
  }

  return reasons.length > 0 ? reasonSet(reasons) : ["static-capable"];
}

function ownReasonsForSection(
  block: SectionBlock,
  variableBindings: Set<string>
): BlockCapabilityReason[] {
  const type = getBlockType(block);
  const reasons: BlockCapabilityReason[] = [];

  if (!STATIC_SECTION_TYPES.has(type) || ALWAYS_CLIENT_SECTION_TYPES.has(type)) {
    reasons.push("client-only-type");
  }
  if (hasClientProp(block) || hasGlassEffect(block)) reasons.push("client-prop");
  // scrollSpeed: only client if it differs from the default (1). A section with the explicit
  // default value scrollSpeed:1 must not be forced to a client island for no reason.
  if (isRecord(block) && block.scrollSpeed != null && block.scrollSpeed !== 1) {
    reasons.push("client-prop");
  }
  if (
    hasStoreRead(
      omitKeys(block, ["elements", "definitions", "collapsedElements", "revealedElements"]),
      variableBindings
    )
  ) {
    reasons.push("store-read");
  }

  // sectionColumn with advanced layout props that require the client island.
  // columnWidths, columnStyles, and gridAutoRows are pure CSS resolved by ServerSectionColumn
  // at build/render time — they do NOT force client classification.
  // The remaining props (gridMode, itemStyles, itemLayout, contentWidth, contentHeight, columnSpan)
  // are resolved through useColumnLayout which depends on useDeviceType() — genuinely client.
  if (type === "sectionColumn") {
    const col = block as Record<string, unknown>;
    if (
      col.gridMode != null ||
      col.itemStyles != null ||
      col.itemLayout != null ||
      col.contentWidth != null ||
      col.contentHeight != null ||
      col.columnSpan != null
    ) {
      if (!reasons.includes("client-prop")) reasons.push("client-prop");
    }
  }

  return reasons.length > 0 ? reasonSet(reasons) : ["static-capable"];
}

function analyzeElement(
  block: ElementBlock,
  variableBindings: Set<string>,
  ancestorClient: boolean
): BlockCapabilityNode {
  const ownReasons = ownReasonsForElement(block, variableBindings);
  const forcedClient = ancestorClient || !ownReasons.includes("static-capable");
  const children = elementGroupChildren(block).map((element) =>
    analyzeElement(element, variableBindings, forcedClient)
  );
  const hasClientChild = children.some((child) => child.classification !== "static");
  const classification = forcedClient ? "client" : hasClientChild ? "mixed" : "static";
  const reasons = ancestorClient
    ? reasonSet(["ancestor-client", ...ownReasons])
    : hasClientChild
      ? reasonSet([...ownReasons, "client-child"])
      : ownReasons;

  return {
    id: getBlockId(block),
    type: getBlockType(block),
    kind: "element",
    classification,
    reasons,
    block,
    children,
  };
}

function analyzeSection(
  block: SectionBlock,
  variableBindings: Set<string>,
  ancestorClient: boolean
): BlockCapabilityNode {
  const ownReasons = ownReasonsForSection(block, variableBindings);
  const ownClient = !ownReasons.includes("static-capable");
  const forcedClient = ancestorClient || ownClient;
  const children = sectionChildElements(block).map((element) =>
    analyzeElement(element, variableBindings, forcedClient)
  );
  const hasClientChild = children.some((child) => child.classification !== "static");

  let classification: BlockCapabilityClassification;
  let reasons = ancestorClient ? reasonSet(["ancestor-client", ...ownReasons]) : ownReasons;
  if (forcedClient) {
    classification = "client";
  } else if (hasClientChild) {
    classification = "mixed";
    reasons = reasonSet([...reasons, "client-child"]);
  } else {
    classification = "static";
  }

  return {
    id: getBlockId(block),
    type: getBlockType(block),
    kind: "section",
    classification,
    reasons,
    block,
    children,
  };
}

function analyzeBackground(
  bg: bgBlock | null,
  transitions: BackgroundTransitionEffect | BackgroundTransitionEffect[] | undefined,
  variableBindings: Set<string>
): BlockCapabilityNode | null {
  if (!bg) return null;
  const type = getBlockType(bg);
  const hasTransitions = arrayHasItems(
    Array.isArray(transitions) ? transitions : transitions ? [transitions] : []
  );
  // Only backgroundImage, backgroundPattern, and a layer-motion-free backgroundVariable are
  // statically renderable. backgroundTransition and backgroundVideo are always client —
  // they are not listed here, so staticCapable is false for them without a runtime check.
  const staticCapable =
    type === "backgroundImage" ||
    type === "backgroundPattern" ||
    (type === "backgroundVariable" &&
      isRecord(bg) &&
      Array.isArray((bg as Record<string, unknown>).layers) &&
      ((bg as Record<string, unknown>).layers as unknown[]).every(
        (layer) => isRecord(layer) && !arrayHasItems(layer.motion)
      ));
  const reasons: BlockCapabilityReason[] = [];

  if (!staticCapable || hasTransitions) reasons.push("client-background");
  if (hasStoreRead(bg, variableBindings)) reasons.push("store-read");

  return {
    id: getBlockId(bg),
    type,
    kind: "background",
    classification: reasons.length > 0 ? "client" : "static",
    reasons: reasons.length > 0 ? reasonSet(reasons) : ["static-capable"],
    block: bg,
    children: [],
  };
}

export function analyzeBlockCapabilities({
  resolvedBg,
  resolvedSections,
  overlaySections,
  transitions,
  scroll,
  variableBindings,
}: AnalyzeBlockCapabilitiesInput): AnalyzeBlockCapabilitiesResult {
  const bindingSet = new Set(variableBindings ?? []);
  const pageReasons: BlockCapabilityReason[] = [];
  if (scroll != null) pageReasons.push("page-runtime");
  if (arrayHasItems(Array.isArray(transitions) ? transitions : transitions ? [transitions] : [])) {
    pageReasons.push("page-runtime");
  }

  const background = analyzeBackground(resolvedBg, transitions, bindingSet);
  const contentSections = resolvedSections.map((section) =>
    analyzeSection(section, bindingSet, false)
  );
  const overlayNodes = (overlaySections ?? []).map((section) =>
    analyzeSection(section, bindingSet, false)
  );
  const children = [background, ...contentSections, ...overlayNodes].filter(
    (node): node is BlockCapabilityNode => node != null
  );
  const hasClientBlocks = children.some((node) => node.classification === "client");
  const hasMixedBlocks = children.some((node) => node.classification === "mixed");

  let classification: BlockCapabilityClassification;
  if (pageReasons.length > 0 || hasClientBlocks) classification = "client";
  else if (hasMixedBlocks) classification = "mixed";
  else classification = "static";

  const tree: BlockCapabilityNode = {
    type: "page",
    kind: "page",
    classification,
    reasons: pageReasons.length > 0 ? reasonSet(pageReasons) : ["static-capable"],
    children,
  };

  return {
    classification,
    hasClientBlocks,
    hasMixedBlocks,
    usesPageRuntime: pageReasons.length > 0,
    tree,
  };
}

/**
 * Assigns hydration priority to section nodes based on their position in the page.
 * First `criticalCount` sections are "critical" (hydrate immediately).
 * Next 3 are "approaching" (hydrate before entering viewport).
 * The rest are "idle" (defer until near viewport or requestIdleCallback).
 */
export function assignSectionHydrationPriorities(
  sectionNodes: BlockCapabilityNode[],
  criticalCount = 2
): BlockCapabilityNode[] {
  return sectionNodes.map((node, index) => ({
    ...node,
    priority:
      index < criticalCount ? "critical" : index < criticalCount + 3 ? "approaching" : "idle",
  }));
}
