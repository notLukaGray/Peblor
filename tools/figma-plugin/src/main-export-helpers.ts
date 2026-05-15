/**
 * Export helper utilities: element counting, severity classification,
 * frame pre-scan, and result bucket assignment.
 */

import type {
  ConversionContext,
  ExportResult,
  ExportTrace,
  ExportTraceIssue,
  ExportTarget,
  FrameIssue,
} from "./types/figma-plugin";
import type { ParityTraceSnapshot } from "./export-parity-types";
import {
  ELEMENT_SUPPORTED_ANNOTATION_KEYS,
  SECTION_SUPPORTED_ANNOTATION_FAMILIES,
  SECTION_SUPPORTED_ANNOTATION_KEYS,
  findUnsupportedAnnotationKeys,
  parseNodeAnnotations,
} from "./converters/annotations-parse";
import { ensureUniqueId, slugify } from "./utils/slugify";
import { autoPromotePresetsInSection } from "./converters/auto-presets";
import { promotePageBackgroundFromSection } from "./main-page-background";

// ---------------------------------------------------------------------------
// Element counting
// ---------------------------------------------------------------------------

function countElementsRecursive(definitions: Record<string, unknown>): number {
  let count = Object.keys(definitions).length;
  for (const el of Object.values(definitions)) {
    if (el && typeof el === "object") {
      const group = el as { section?: { definitions?: Record<string, unknown> } };
      if (group.section?.definitions) {
        count += countElementsRecursive(group.section.definitions);
      }
    }
  }
  return count;
}

function countElementsFromArray(elements: unknown[]): number {
  let count = 0;
  for (const el of elements) {
    count += 1;
    if (el && typeof el === "object") {
      const group = el as { section?: { definitions?: Record<string, unknown> } };
      if (group.section?.definitions) {
        count += countElementsRecursive(group.section.definitions);
      }
    }
  }
  return count;
}

function countElementsInSectionLike(section: unknown): number {
  if (!section || typeof section !== "object") return 0;
  const rec = section as {
    elements?: unknown[];
    collapsedElements?: unknown[];
    revealedElements?: unknown[];
  };
  let count = 0;
  if (Array.isArray(rec.elements)) count += countElementsFromArray(rec.elements);
  if (Array.isArray(rec.collapsedElements)) count += countElementsFromArray(rec.collapsedElements);
  if (Array.isArray(rec.revealedElements)) count += countElementsFromArray(rec.revealedElements);
  return count;
}

export function countElementsInResult(result: ExportResult): number {
  let count = 0;

  for (const pageValue of Object.values(result.pages)) {
    const page = pageValue as {
      sections?: unknown[];
      sectionOrder?: unknown[];
      definitions?: Record<string, unknown>;
    };

    if (
      Array.isArray(page.sectionOrder) &&
      page.definitions &&
      typeof page.definitions === "object"
    ) {
      for (const key of page.sectionOrder) {
        if (typeof key !== "string") continue;
        count += countElementsInSectionLike(page.definitions[key]);
      }
      continue;
    }

    if (Array.isArray(page.sections)) {
      for (const section of page.sections) {
        count += countElementsInSectionLike(section);
      }
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Severity classification
// ---------------------------------------------------------------------------

/**
 * Categorises a raw warning string into a severity bucket.
 */
export function getIssueSeverity(w: string): "error" | "warn" | "info" {
  if (w.startsWith("[error]")) return "error";
  if (w.startsWith("[info]") || w.startsWith("[docs]")) return "info";
  return "warn";
}

export function formatFrameIssueWarning(frameName: string, issue: FrameIssue): string {
  return `[preflight:${issue.category ?? "general"}] "${frameName}": ${issue.message}`;
}

function pushIssue(
  issues: FrameIssue[],
  severity: FrameIssue["severity"],
  category: string,
  message: string
): void {
  issues.push({ severity, category, message });
}

function siblingStructureSignature(node: SceneNode): string {
  const childCount = "children" in node ? node.children.length : 0;
  const width = "width" in node ? Math.round((node.width ?? 0) / 8) : 0;
  const height = "height" in node ? Math.round((node.height ?? 0) / 8) : 0;
  const layoutMode = "layoutMode" in node ? String(node.layoutMode ?? "NONE") : "NONE";
  return `${node.type}|${layoutMode}|${childCount}|${width}x${height}`;
}

// ---------------------------------------------------------------------------
// Frame pre-scan
// ---------------------------------------------------------------------------

/**
 * Runs a quick pre-scan of a frame's children to produce a list of FrameIssues
 * without modifying shared context. Used to populate preview data.
 */
export function quickScanFrame(
  frame: FrameNode,
  options?: { suppressStructure?: boolean }
): FrameIssue[] {
  const issues: FrameIssue[] = [];

  const AUTO_NAME_RE =
    /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Section|Component|Boolean Operation)\s+\d+$/i;
  const SLOT_LIKE_RE =
    /\b(slot|slots|collapsed|revealed|header|trigger|peek|content|expanded|body)\b/i;

  function scan(node: SceneNode, depth: number): void {
    if (!node.visible) return;
    const name = node.name?.trim() ?? "";
    if (AUTO_NAME_RE.test(name) && depth > 0) {
      pushIssue(
        issues,
        "info",
        "naming",
        `"${name}" has an auto-generated layer name — ID will be inferred from content`
      );
    }

    const annotations = parseNodeAnnotations(
      node as unknown as { name?: string } & Record<string, unknown>
    );
    if (Object.keys(annotations).length > 0) {
      const supportedKeys =
        depth === 0 ? SECTION_SUPPORTED_ANNOTATION_KEYS : ELEMENT_SUPPORTED_ANNOTATION_KEYS;
      const supportedFamilies = depth === 0 ? SECTION_SUPPORTED_ANNOTATION_FAMILIES : [];
      const unsupported = findUnsupportedAnnotationKeys(
        annotations,
        supportedKeys,
        supportedFamilies
      );
      if (unsupported.length > 0) {
        pushIssue(
          issues,
          "warn",
          "annotations",
          `"${name || "unnamed"}" has unsupported annotation key(s): ${unsupported.join(", ")}`
        );
      }
    }

    if ("children" in node) {
      const children = (node as unknown as { children: SceneNode[] }).children;
      const visibleChildren = children.filter((child) => child.visible !== false);
      if (depth > 0 && visibleChildren.length === 0 && SLOT_LIKE_RE.test(name)) {
        pushIssue(issues, "warn", "slots", `"${name || "unnamed"}" is an empty slot/container`);
      }
      if (!options?.suppressStructure && depth <= 1 && visibleChildren.length >= 2) {
        const buckets = new Map<string, { count: number; names: string[] }>();
        for (const child of visibleChildren) {
          if (
            child.type === "INSTANCE" ||
            child.type === "COMPONENT" ||
            child.type === "COMPONENT_SET"
          ) {
            continue;
          }
          const key = siblingStructureSignature(child);
          const bucket = buckets.get(key) ?? { count: 0, names: [] };
          bucket.count += 1;
          if (child.name) bucket.names.push(child.name);
          buckets.set(key, bucket);
        }
        for (const { count, names } of buckets.values()) {
          if (count < 3) continue;
          const nameList = names.length > 0 ? ` (${names.join(", ")})` : "";
          pushIssue(
            issues,
            "warn",
            "structure",
            `"${name || "section"}" has ${count} repeated sibling structures${nameList} — consider promoting as a preset/section`
          );
        }
      }
      for (const child of children) {
        scan(child, depth + 1);
      }
    }
  }

  scan(frame, 0);

  return issues;
}

export function buildExportTrace(
  frames: Array<{ id: string; name: string; issues: FrameIssue[] }>,
  warnings: string[],
  parity?: ParityTraceSnapshot
): ExportTrace {
  const severity: ExportTrace["counts"]["severity"] = { error: 0, warn: 0, info: 0 };
  const category: Record<string, number> = {};
  const traceFrames = frames.map((frame) => ({
    id: frame.id,
    name: frame.name,
    issues: frame.issues.map((issue) => ({
      frameId: frame.id,
      frameName: frame.name,
      severity: issue.severity,
      category: issue.category ?? "general",
      message: issue.message,
    })) as ExportTraceIssue[],
  }));

  const bump = (key: string): void => {
    category[key] = (category[key] ?? 0) + 1;
  };

  for (const warning of warnings) {
    severity[getIssueSeverity(warning)]++;
    const match = /^\[([^\]]+)\]/.exec(warning);
    bump((match?.[1] ?? "general").toLowerCase());
  }

  return {
    counts: {
      severity,
      category,
      ...(parity !== undefined ? { parity } : {}),
    },
    frames: traceFrames,
  };
}

// ---------------------------------------------------------------------------
// Result bucket assignment
// ---------------------------------------------------------------------------

/**
 * Applies a converted section to the correct bucket of the result object.
 */
export function applyFrameToResult(
  frame: FrameNode | ComponentNode | ComponentSetNode,
  target: ExportTarget,
  section: unknown,
  result: ExportResult,
  ctx: ConversionContext
): void {
  const s = section as Record<string, unknown>;

  switch (target.type) {
    case "page": {
      // Contract-native page shape: slug + title + sectionOrder + definitions.
      const page = normalisePageRecord(result.pages[target.key], target);
      const normalizedSection = normaliseSectionRecord(section);
      const sectionId = ensureSectionIdForRecord(
        normalizedSection,
        target.key,
        page.sectionOrder.length,
        page.definitions,
        ctx,
        frame,
        "page"
      );
      const presetKeysBefore = new Set(Object.keys(result.presets));
      autoPromotePresetsInSection(normalizedSection, result, ctx);
      attachNewAutoPresetsToPage(page, result, presetKeysBefore);

      const promotion = promotePageBackgroundFromSection({
        page,
        section: normalizedSection,
        sectionId,
        frameName: frame.name,
        ctx,
      });
      if (!promotion.dropSection) {
        page.sectionOrder.push(sectionId);
        page.definitions[sectionId] = normalizedSection;
      }
      result.pages[target.key] = page;
      break;
    }

    case "preset": {
      const normalizedSection = normaliseSectionRecord(section);
      autoPromotePresetsInSection(normalizedSection, result, ctx);
      result.presets[target.key] = normalizedSection;
      ctx.usedPresetKeys?.add(target.key);
      break;
    }

    case "modal": {
      const modal = normaliseModalRecord(result.modals[target.key], target);
      const normalizedSection = normaliseSectionRecord(section);
      const sectionId = ensureSectionIdForRecord(
        normalizedSection,
        target.key,
        modal.sectionOrder.length,
        modal.definitions,
        ctx,
        frame,
        "modal"
      );

      autoPromotePresetsInSection(normalizedSection, result, ctx);

      modal.sectionOrder.push(sectionId);
      modal.definitions[sectionId] = normalizedSection;
      result.modals[target.key] = modal;
      break;
    }

    case "module": {
      const normalizedSection = normaliseSectionRecord(section);
      const moduleScaffold = inferModuleFromSection(normalizedSection);
      if (moduleScaffold.mainElementCount === 0) {
        ctx.warnings.push(
          `[module] "${frame.name}" exported with no module slot elements. Add children in Figma or annotate a valid container before exporting.`
        );
      } else {
        ctx.warnings.push(
          `[info] "${frame.name}" exported as module slot scaffold (contentSlot=${moduleScaffold.contentSlot}, slots=${moduleScaffold.slotCount}). Add additional behavior manually if needed.`
        );
      }
      result.modules[target.key] = {
        type: "module",
        contentSlot: moduleScaffold.contentSlot,
        slots: moduleScaffold.slots,
      };
      break;
    }

    case "global-button": {
      // Check if any component variants have descriptions
      if (frame.type === "COMPONENT_SET" || frame.type === "COMPONENT") {
        const desc = (frame as unknown as { description?: string }).description;
        if (desc?.trim()) {
          ctx.warnings.push(`[docs] "${frame.name}": ${desc.trim()}`);
        }
      }
      const btnElements = "elements" in s && Array.isArray(s.elements) ? s.elements : [];
      result.globals.buttons ??= {};
      result.globals.buttons[target.key] =
        btnElements.length === 1 ? btnElements[0] : { elements: btnElements };
      break;
    }

    case "global-background": {
      const fill = "fill" in s && typeof s.fill === "string" ? s.fill : undefined;
      const src = "bgImage" in s && typeof s.bgImage === "string" ? s.bgImage : undefined;
      result.globals.backgrounds ??= {};
      let bgBlock: Record<string, unknown>;
      if (src) {
        bgBlock = { type: "backgroundImage", image: src };
      } else if (fill) {
        bgBlock = { type: "backgroundVariable", layers: [{ fill }] };
      } else {
        ctx.warnings.push(
          `[global-background] "${frame.name}" had no raster bgImage or fill — exported placeholder backgroundVariable; set fill or image in Figma or JSON.`
        );
        bgBlock = { type: "backgroundVariable", layers: [{ fill: "transparent" }] };
      }
      result.globals.backgrounds[target.key] = bgBlock;
      break;
    }

    case "global-element": {
      // Check if any component variants have descriptions
      if (frame.type === "COMPONENT_SET" || frame.type === "COMPONENT") {
        const desc = (frame as unknown as { description?: string }).description;
        if (desc?.trim()) {
          ctx.warnings.push(`[docs] "${frame.name}": ${desc.trim()}`);
        }
      }
      const globalElements = "elements" in s && Array.isArray(s.elements) ? s.elements : [];
      result.globals.elements ??= {};
      result.globals.elements[target.key] =
        globalElements.length === 1 ? globalElements[0] : { elements: globalElements };
      break;
    }

    case "skip":
      // Already handled before this function is called
      break;
  }
}

type ExportedPageRecord = {
  slug: string;
  title: string;
  sectionOrder: string[];
  definitions: Record<string, unknown>;
  bgKey?: string;
  preset?: Record<string, unknown>;
};

type ExportedModalRecord = {
  id: string;
  title: string;
  sectionOrder: string[];
  definitions: Record<string, unknown>;
};

function normalisePageRecord(existing: unknown, target: ExportTarget): ExportedPageRecord {
  const rec = existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
  const sections = Array.isArray(rec.sections) ? [...rec.sections] : [];
  const definitions =
    rec.definitions && typeof rec.definitions === "object" && !Array.isArray(rec.definitions)
      ? { ...(rec.definitions as Record<string, unknown>) }
      : {};
  const sectionOrder = Array.isArray(rec.sectionOrder)
    ? rec.sectionOrder.filter((v): v is string => typeof v === "string")
    : [];
  const inlinePreset =
    rec.preset && typeof rec.preset === "object" && !Array.isArray(rec.preset)
      ? { ...(rec.preset as Record<string, unknown>) }
      : undefined;

  if (sectionOrder.length === 0 && sections.length > 0) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section || typeof section !== "object") continue;
      const sectionRec = section as Record<string, unknown>;
      const fallbackId = slugify(`${target.key}-section-${i + 1}`);
      const id =
        typeof sectionRec.id === "string" && sectionRec.id.trim()
          ? sectionRec.id.trim()
          : fallbackId;
      sectionRec.id = id;
      sectionOrder.push(id);
      if (definitions[id] === undefined) definitions[id] = sectionRec;
    }
  }
  return {
    slug: typeof rec.slug === "string" && rec.slug.trim() ? rec.slug : target.key,
    title: typeof rec.title === "string" && rec.title.trim() ? rec.title : target.label,
    sectionOrder,
    definitions,
    ...(typeof rec.bgKey === "string" && rec.bgKey.trim() ? { bgKey: rec.bgKey } : {}),
    ...(inlinePreset ? { preset: inlinePreset } : {}),
  };
}

function attachNewAutoPresetsToPage(
  page: ExportedPageRecord,
  result: ExportResult,
  presetKeysBefore: Set<string>
): void {
  const newKeys = Object.keys(result.presets).filter((key) => !presetKeysBefore.has(key));
  if (newKeys.length === 0) return;
  const inlinePreset = page.preset ?? {};
  for (const key of newKeys) {
    const presetBlock = result.presets[key];
    if (!presetBlock || typeof presetBlock !== "object") continue;
    inlinePreset[key] = clonePlainObject(presetBlock);
  }
  page.preset = inlinePreset;
}

function clonePlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normaliseModalRecord(existing: unknown, target: ExportTarget): ExportedModalRecord {
  const rec = existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
  const sections = Array.isArray(rec.sections) ? [...rec.sections] : [];
  const definitions =
    rec.definitions && typeof rec.definitions === "object" && !Array.isArray(rec.definitions)
      ? { ...(rec.definitions as Record<string, unknown>) }
      : {};
  const sectionOrder = Array.isArray(rec.sectionOrder)
    ? rec.sectionOrder.filter((v): v is string => typeof v === "string")
    : [];

  if (sectionOrder.length === 0 && sections.length > 0) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      if (!section || typeof section !== "object") continue;
      const sectionRec = section as Record<string, unknown>;
      const fallbackId = slugify(`${target.key}-section-${i + 1}`);
      const id =
        typeof sectionRec.id === "string" && sectionRec.id.trim()
          ? sectionRec.id.trim()
          : fallbackId;
      sectionRec.id = id;
      sectionOrder.push(id);
      if (definitions[id] === undefined) definitions[id] = sectionRec;
    }
  }
  return {
    id: typeof rec.id === "string" && rec.id.trim() ? rec.id : target.key,
    title: typeof rec.title === "string" && rec.title.trim() ? rec.title : target.label,
    sectionOrder,
    definitions,
  };
}

function normaliseSectionRecord(section: unknown): Record<string, unknown> {
  if (section && typeof section === "object") {
    return { ...(section as Record<string, unknown>) };
  }
  return { type: "contentBlock", elements: [] };
}

function ensureSectionIdForRecord(
  normalizedSection: Record<string, unknown>,
  targetKey: string,
  currentSectionCount: number,
  definitions: Record<string, unknown>,
  ctx: ConversionContext,
  frame: FrameNode | ComponentNode | ComponentSetNode,
  bucket: "page" | "modal"
): string {
  const fallbackBase = slugify(`${targetKey}-section-${currentSectionCount + 1}`);
  let sectionId =
    typeof normalizedSection.id === "string" && normalizedSection.id.trim()
      ? normalizedSection.id.trim()
      : ensureUniqueId(fallbackBase, ctx.usedIds);

  if (!normalizedSection.id || normalizedSection.id !== sectionId) {
    normalizedSection.id = sectionId;
  }

  if (definitions[sectionId] !== undefined) {
    // Seed usedIds with the conflicting id so ensureUniqueId cannot return it again.
    ctx.usedIds.add(sectionId);
    const dedupedSectionId = ensureUniqueId(sectionId, ctx.usedIds);
    if (dedupedSectionId !== sectionId) {
      ctx.warnings.push(
        `[${bucket}] "${frame.name}" produced duplicate section id "${sectionId}" for "${targetKey}". Using "${dedupedSectionId}" instead.`
      );
      sectionId = dedupedSectionId;
      normalizedSection.id = dedupedSectionId;
    }
  }

  ctx.usedIds.add(sectionId);
  return sectionId;
}

type ModuleSlotInference = {
  contentSlot: string;
  slots: Record<string, unknown>;
  slotCount: number;
  mainElementCount: number;
};

function inferModuleFromSection(section: Record<string, unknown>): ModuleSlotInference {
  const topLevelElements = extractTopLevelElements(section);
  const slots: Record<string, unknown> = {};
  const usedSlotKeys = new Set<string>();
  const mainDefinitions: Record<string, unknown> = {};
  const mainElementOrder: string[] = [];
  const usedMainElementIds = new Set<string>();

  let mainVisualConfig: Record<string, unknown> = {
    position: "absolute",
    inset: "0",
    zIndex: 0,
  };

  for (let i = 0; i < topLevelElements.length; i++) {
    const element = topLevelElements[i];
    if (isGroupSlotCandidate(element)) {
      const rawSlotKey = deriveSlotKeyFromElement(element.id as string);
      const slotPayload = buildSlotPayloadFromGroupElement(element);
      if (rawSlotKey === "main") {
        const sectionPayload = getSlotSectionPayload(slotPayload);
        mergeIntoDefinitions(
          sectionPayload.definitions,
          sectionPayload.elementOrder,
          mainDefinitions,
          mainElementOrder,
          usedMainElementIds
        );
        mainVisualConfig = mergeSlotVisualConfig(mainVisualConfig, slotPayload);
        continue;
      }

      const slotKey = ensureUniqueSlotKey(rawSlotKey, usedSlotKeys);
      slots[slotKey] = slotPayload;
      continue;
    }

    const rec = element;
    const fallbackId = slugify(`main-${i + 1}`);
    const baseId = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : fallbackId;
    const id = ensureUniqueLocalId(baseId, usedMainElementIds);
    mainDefinitions[id] = { ...rec, id };
    mainElementOrder.push(id);
  }

  const mainSection: Record<string, unknown> = {};
  if (mainElementOrder.length > 0) mainSection.elementOrder = mainElementOrder;
  if (Object.keys(mainDefinitions).length > 0) mainSection.definitions = mainDefinitions;

  slots.main = {
    ...mainVisualConfig,
    section: mainSection,
  };

  return {
    contentSlot: "main",
    slots,
    slotCount: Object.keys(slots).length,
    mainElementCount: mainElementOrder.length,
  };
}

function buildElementDefinitionsFromSection(section: Record<string, unknown>): {
  elementOrder: string[];
  definitions: Record<string, unknown>;
} {
  const existingDefinitions =
    section.definitions &&
    typeof section.definitions === "object" &&
    !Array.isArray(section.definitions)
      ? (section.definitions as Record<string, unknown>)
      : null;
  const explicitOrder = Array.isArray(section.elementOrder)
    ? section.elementOrder.filter((v): v is string => typeof v === "string")
    : [];

  if (existingDefinitions && Object.keys(existingDefinitions).length > 0) {
    const definitions: Record<string, unknown> = {};
    const elementOrder: string[] = [];
    const usedIds = new Set<string>();
    const orderedKeys =
      explicitOrder.length > 0 ? [...explicitOrder] : Object.keys(existingDefinitions);
    for (const key of Object.keys(existingDefinitions)) {
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
    }
    for (const key of orderedKeys) {
      const value = existingDefinitions[key];
      if (!value || typeof value !== "object") continue;
      const rec = value as Record<string, unknown>;
      const baseId = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : key;
      const id = ensureUniqueLocalId(baseId, usedIds);
      definitions[id] = { ...rec, id };
      elementOrder.push(id);
    }
    return { elementOrder, definitions };
  }

  const elements = Array.isArray(section.elements) ? section.elements : [];
  const definitions: Record<string, unknown> = {};
  const elementOrder: string[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!element || typeof element !== "object") continue;
    const rec = element as Record<string, unknown>;
    const fallbackId = slugify(`element-${i + 1}`);
    const baseId = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : fallbackId;
    const id = ensureUniqueLocalId(baseId, usedIds);
    definitions[id] = { ...rec, id };
    elementOrder.push(id);
  }

  return { elementOrder, definitions };
}

function extractTopLevelElements(section: Record<string, unknown>): Record<string, unknown>[] {
  const { elementOrder, definitions } = buildElementDefinitionsFromSection(section);
  const out: Record<string, unknown>[] = [];
  for (const id of elementOrder) {
    const value = definitions[id];
    if (!value || typeof value !== "object") continue;
    out.push({ ...(value as Record<string, unknown>), id });
  }
  return out;
}

function isGroupSlotCandidate(element: Record<string, unknown>): boolean {
  if (element.type !== "elementGroup") return false;
  const sectionValue = element.section;
  if (!sectionValue || typeof sectionValue !== "object") return false;
  const defs = (sectionValue as { definitions?: unknown }).definitions;
  return !!defs && typeof defs === "object" && !Array.isArray(defs) && Object.keys(defs).length > 0;
}

function buildSlotPayloadFromGroupElement(
  element: Record<string, unknown>
): Record<string, unknown> {
  const sectionValue =
    element.section && typeof element.section === "object"
      ? (element.section as Record<string, unknown>)
      : {};
  const sectionPayload = normaliseSlotSection(sectionValue);

  const slot: Record<string, unknown> = {
    section: {
      ...(sectionPayload.elementOrder.length > 0
        ? { elementOrder: sectionPayload.elementOrder }
        : {}),
      ...(Object.keys(sectionPayload.definitions).length > 0
        ? { definitions: sectionPayload.definitions }
        : {}),
    },
  };

  const fromElementString = (key: string): string | undefined => {
    const value = element[key];
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  };

  const wrapperStyle =
    element.wrapperStyle && typeof element.wrapperStyle === "object"
      ? (element.wrapperStyle as Record<string, unknown>)
      : {};
  const fromWrapperString = (key: string): string | undefined => {
    const value = wrapperStyle[key];
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  };
  const fromWrapperNumber = (key: string): number | undefined => {
    const value = wrapperStyle[key];
    return typeof value === "number" ? value : undefined;
  };

  const position = fromWrapperString("position");
  const inset = fromWrapperString("inset");
  const top = fromWrapperString("top");
  const left = fromWrapperString("left");
  const right = fromWrapperString("right");
  const bottom = fromWrapperString("bottom");
  const zIndex =
    (typeof element.zIndex === "number" ? element.zIndex : undefined) ??
    fromWrapperNumber("zIndex");
  const display = fromElementString("display") ?? fromWrapperString("display");
  const flexDirection = fromElementString("flexDirection") ?? fromWrapperString("flexDirection");
  const alignItems = fromElementString("alignItems") ?? fromWrapperString("alignItems");
  const justifyContent = fromElementString("justifyContent") ?? fromWrapperString("justifyContent");
  const gap = fromElementString("gap") ?? fromWrapperString("gap");
  const padding = fromElementString("padding") ?? fromWrapperString("padding");

  if (position) slot.position = position;
  if (inset) slot.inset = inset;
  if (top) slot.top = top;
  if (left) slot.left = left;
  if (right) slot.right = right;
  if (bottom) slot.bottom = bottom;
  if (typeof zIndex === "number") slot.zIndex = zIndex;
  if (display) slot.display = display;
  if (flexDirection) slot.flexDirection = flexDirection;
  if (alignItems) slot.alignItems = alignItems;
  if (justifyContent) slot.justifyContent = justifyContent;
  if (gap) slot.gap = gap;
  if (padding) slot.padding = padding;

  const style = sanitizeInlineStyle(
    omitKeys(wrapperStyle, [
      "position",
      "inset",
      "top",
      "left",
      "right",
      "bottom",
      "zIndex",
      "display",
      "flexDirection",
      "alignItems",
      "justifyContent",
      "gap",
      "padding",
    ])
  );
  if (Object.keys(style).length > 0) slot.style = style;

  if (!slot.position) slot.position = "absolute";

  return slot;
}

function normaliseSlotSection(sectionValue: Record<string, unknown>): {
  elementOrder: string[];
  definitions: Record<string, unknown>;
} {
  const defsRaw =
    sectionValue.definitions &&
    typeof sectionValue.definitions === "object" &&
    !Array.isArray(sectionValue.definitions)
      ? (sectionValue.definitions as Record<string, unknown>)
      : {};
  const explicitOrder = Array.isArray(sectionValue.elementOrder)
    ? sectionValue.elementOrder.filter((v): v is string => typeof v === "string")
    : [];

  const orderedKeys = explicitOrder.length > 0 ? [...explicitOrder] : Object.keys(defsRaw);
  for (const key of Object.keys(defsRaw)) {
    if (!orderedKeys.includes(key)) orderedKeys.push(key);
  }

  const definitions: Record<string, unknown> = {};
  const elementOrder: string[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < orderedKeys.length; i++) {
    const key = orderedKeys[i];
    const value = defsRaw[key];
    if (!value || typeof value !== "object") continue;
    const rec = value as Record<string, unknown>;
    const fallbackId = slugify(key || `slot-element-${i + 1}`);
    const baseId = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : fallbackId;
    const id = ensureUniqueLocalId(baseId, usedIds);
    definitions[id] = { ...rec, id };
    elementOrder.push(id);
  }

  return { elementOrder, definitions };
}

function mergeIntoDefinitions(
  sourceDefs: Record<string, unknown>,
  sourceOrder: string[],
  targetDefs: Record<string, unknown>,
  targetOrder: string[],
  usedIds: Set<string>
): void {
  for (const sourceId of sourceOrder) {
    const value = sourceDefs[sourceId];
    if (!value || typeof value !== "object") continue;
    const rec = value as Record<string, unknown>;
    const baseId = typeof rec.id === "string" && rec.id.trim() ? rec.id.trim() : sourceId;
    const id = ensureUniqueLocalId(baseId, usedIds);
    targetDefs[id] = { ...rec, id };
    targetOrder.push(id);
  }
}

function getSlotSectionPayload(slotPayload: Record<string, unknown>): {
  elementOrder: string[];
  definitions: Record<string, unknown>;
} {
  const sectionValue =
    slotPayload.section && typeof slotPayload.section === "object"
      ? (slotPayload.section as Record<string, unknown>)
      : {};
  const defs =
    sectionValue.definitions &&
    typeof sectionValue.definitions === "object" &&
    !Array.isArray(sectionValue.definitions)
      ? (sectionValue.definitions as Record<string, unknown>)
      : {};
  const order = Array.isArray(sectionValue.elementOrder)
    ? sectionValue.elementOrder.filter((v): v is string => typeof v === "string")
    : Object.keys(defs);
  return { elementOrder: order, definitions: defs };
}

function mergeSlotVisualConfig(
  baseConfig: Record<string, unknown>,
  candidateConfig: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...baseConfig };
  for (const [key, value] of Object.entries(candidateConfig)) {
    if (key === "section") continue;
    if (key === "style") {
      const baseStyle =
        merged.style && typeof merged.style === "object" && !Array.isArray(merged.style)
          ? (merged.style as Record<string, unknown>)
          : {};
      const candidateStyle =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const combined = { ...baseStyle, ...candidateStyle };
      if (Object.keys(combined).length > 0) merged.style = combined;
      continue;
    }
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function deriveSlotKeyFromElement(elementId: string): string {
  const lower = elementId.toLowerCase();
  if (/(^|[-_ ])(main|content|media|video|image|canvas)([-_ ]|$)/.test(lower)) return "main";
  if (/(^|[-_ ])(bottom[-_ ]?bar|controls?)([-_ ]|$)/.test(lower)) return "bottomBar";
  if (/(^|[-_ ])top[-_ ]?bar([-_ ]|$)/.test(lower)) return "topBar";
  if (/(^|[-_ ])left[-_ ]?controls?([-_ ]|$)/.test(lower)) return "leftControls";
  if (/(^|[-_ ])right[-_ ]?controls?([-_ ]|$)/.test(lower)) return "rightControls";
  return toCamelCaseKey(lower);
}

function toCamelCaseKey(value: string): string {
  const cleaned = value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!cleaned) return "slot";
  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length === 0) return "slot";
  return parts
    .map((part, index) => (index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join("");
}

function ensureUniqueSlotKey(baseKey: string, usedSlotKeys: Set<string>): string {
  const safeBase = baseKey.trim() ? baseKey : "slot";
  if (!usedSlotKeys.has(safeBase)) {
    usedSlotKeys.add(safeBase);
    return safeBase;
  }
  let n = 2;
  while (usedSlotKeys.has(`${safeBase}${n}`)) n++;
  const next = `${safeBase}${n}`;
  usedSlotKeys.add(next);
  return next;
}

function ensureUniqueLocalId(baseId: string, usedIds: Set<string>): string {
  const safeBase = slugify(baseId) || "item";
  if (!usedIds.has(safeBase)) {
    usedIds.add(safeBase);
    return safeBase;
  }
  let n = 2;
  while (usedIds.has(`${safeBase}-${n}`)) n++;
  const next = `${safeBase}-${n}`;
  usedIds.add(next);
  return next;
}

function sanitizeInlineStyle(
  input: Record<string, unknown>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

function omitKeys(input: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keySet = new Set(keys);
  for (const [key, value] of Object.entries(input)) {
    if (keySet.has(key)) continue;
    out[key] = value;
  }
  return out;
}
