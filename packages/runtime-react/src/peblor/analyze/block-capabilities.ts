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

export type BlockCapabilityNode = {
  id?: string;
  type: string;
  kind: "section" | "element" | "background" | "page";
  classification: BlockCapabilityClassification;
  reasons: BlockCapabilityReason[];
  block?: SectionBlock | ElementBlock | bgBlock;
  children: BlockCapabilityNode[];
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
  "elementLink",
  "elementImage",
  "elementSpacer",
  "elementDivider",
  "elementGroup",
  "elementVector",
  "elementCounter",
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
  "elementButton",
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
  "dragAxis",
  "dragBehavior",
  "dragUnit",
  "exitPreset",
  "interactions",
  "keyboardTriggers",
  "motion",
  "motionTiming",
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
  "scrollSpeed",
  "timerTriggers",
  "visibleWhen",
  // New element client-only props
  "trigger", // element.counter scroll/visible trigger
  "showWaveform", // element.audio waveform needs JS audio context
  "hoverActivate", // element.imageCompare hover follow needs JS
  "followCursor", // element.tooltip cursor tracking needs JS
  "interactivity", // element.lottie/rive interactive event bindings
  "pauseOnHover", // element.marquee JS hover pause
  "pauseOnFocus", // element.marquee JS focus pause
]);

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

  if (!STATIC_ELEMENT_TYPES.has(type) || ALWAYS_CLIENT_ELEMENT_TYPES.has(type)) {
    reasons.push("client-only-type");
  }
  if (hasClientProp(block) || hasGlassEffect(block)) reasons.push("client-prop");
  if (hasStoreRead(omitKeys(block, ["section", "elements", "definitions"]), variableBindings)) {
    reasons.push("store-read");
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
  if (
    hasStoreRead(
      omitKeys(block, ["elements", "definitions", "collapsedElements", "revealedElements"]),
      variableBindings
    )
  ) {
    reasons.push("store-read");
  }

  // sectionColumn with advanced layout props can't be rendered by the simplified static server renderer
  if (type === "sectionColumn") {
    const col = block as Record<string, unknown>;
    if (
      col.gridMode != null ||
      col.columnWidths != null ||
      col.columnStyles != null ||
      col.itemStyles != null ||
      col.itemLayout != null ||
      col.contentWidth != null ||
      col.contentHeight != null ||
      col.gridAutoRows != null ||
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
