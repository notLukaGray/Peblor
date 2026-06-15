import type { ElementBlock, SectionBlock } from "@pb/contracts";

// ---------------------------------------------------------------------------
// Input normaliser
// Accepts: full page object, sections array, single section, single element,
// plugin export payloads, module definitions
// Always returns { sections: SectionBlock[] }
// ---------------------------------------------------------------------------

export type NormaliseResult = { ok: true; sections: SectionBlock[] } | { ok: false; error: string };

const SECTION_TYPES = new Set([
  "contentBlock",
  "sectionColumn",
  "scrollContainer",
  "formBlock",
  "revealSection",
  "divider",
  "sectionTrigger",
]);

const ELEMENT_TYPES = new Set([
  "elementButton",
  "elementText",
  "elementImage",
  "elementVideo",
  "elementSpacer",
  "elementShape",
  "elementLottie",
  "elementRive",
  "elementModel3D",
  "elementIframe",
  "elementIcon",
  "elementForm",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getElementOrder(value: unknown): string[] | null {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value as string[];
  }
  if (isRecord(value)) {
    if (Array.isArray(value.desktop) && value.desktop.every((item) => typeof item === "string")) {
      return value.desktop as string[];
    }
    if (Array.isArray(value.mobile) && value.mobile.every((item) => typeof item === "string")) {
      return value.mobile as string[];
    }
  }
  return null;
}

function getDefinitionMap(value: unknown): Record<string, Record<string, unknown>> {
  if (!isRecord(value)) return {};
  const definitions: Record<string, Record<string, unknown>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isRecord(entry)) definitions[key] = entry;
  }
  return definitions;
}

function resolvePresetRefs(
  value: unknown,
  presetDefinitions: Record<string, Record<string, unknown>>,
  visited: Set<string> = new Set()
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolvePresetRefs(item, presetDefinitions, visited));
  }
  if (!isRecord(value)) return value;

  if (typeof value.preset === "string") {
    const presetKey = value.preset;
    const { preset: _ignored, ...local } = value;
    if (visited.has(presetKey)) {
      return resolvePresetRefs(local, presetDefinitions, visited) as Record<string, unknown>;
    }
    const preset = presetDefinitions[presetKey];
    if (!preset) {
      return resolvePresetRefs(local, presetDefinitions, visited) as Record<string, unknown>;
    }
    const merged = { ...preset, ...local };
    visited.add(presetKey);
    const resolved = resolvePresetRefs(merged, presetDefinitions, visited);
    visited.delete(presetKey);
    return resolved as Record<string, unknown>;
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = resolvePresetRefs(entry, presetDefinitions, visited);
  }
  return out;
}

function resolveDefinitionMapWithPresets(
  definitions: Record<string, Record<string, unknown>>,
  presetDefinitions: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  if (Object.keys(presetDefinitions).length === 0) return definitions;
  const resolved: Record<string, Record<string, unknown>> = {};
  for (const [key, entry] of Object.entries(definitions)) {
    const next = resolvePresetRefs(entry, presetDefinitions);
    if (isRecord(next)) {
      resolved[key] = next;
    }
  }
  return resolved;
}

function isElementLike(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    (ELEMENT_TYPES.has(value.type) || value.type.startsWith("element"))
  );
}

function isSectionLike(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.type === "string" && SECTION_TYPES.has(value.type);
}

function isModuleLike(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    isRecord(value.slots) &&
    (value.type === "module" || value.type == null || typeof value.type === "string")
  );
}

function pickStringField(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  key: string
): void {
  const value = source[key];
  if (typeof value === "string" && value.length > 0) {
    target[key] = value;
  }
}

function buildModuleSlotWrapperStyle(slot: Record<string, unknown>): Record<string, unknown> {
  const wrapperStyle: Record<string, unknown> = {};
  const slotStyle = slot.style;
  if (isRecord(slotStyle)) {
    Object.assign(wrapperStyle, slotStyle);
  }
  pickStringField(wrapperStyle, slot, "position");
  pickStringField(wrapperStyle, slot, "inset");
  pickStringField(wrapperStyle, slot, "top");
  pickStringField(wrapperStyle, slot, "left");
  pickStringField(wrapperStyle, slot, "right");
  pickStringField(wrapperStyle, slot, "bottom");
  if (typeof slot.layer === "number") {
    wrapperStyle.zIndex = slot.layer;
  }
  return wrapperStyle;
}

function buildModulePreviewSections(
  modules: Record<string, Record<string, unknown>>,
  presetDefinitions: Record<string, Record<string, unknown>>
): SectionBlock[] {
  const sections: SectionBlock[] = [];

  for (const [moduleKey, moduleDef] of Object.entries(modules)) {
    if (!isModuleLike(moduleDef)) continue;

    const slotsObj = moduleDef.slots as Record<string, unknown>;
    const contentSlotKey =
      typeof moduleDef.contentSlot === "string" && moduleDef.contentSlot.length > 0
        ? moduleDef.contentSlot
        : "main";
    const moduleStyle = isRecord(moduleDef.style)
      ? (moduleDef.style as Record<string, unknown>)
      : null;

    const slotEntries = Object.entries(slotsObj).filter(([, slot]) => isRecord(slot)) as Array<
      [string, Record<string, unknown>]
    >;
    if (slotEntries.length === 0) continue;

    const orderedSlotEntries = slotEntries.sort(([a], [b]) => {
      if (a === contentSlotKey && b !== contentSlotKey) return -1;
      if (b === contentSlotKey && a !== contentSlotKey) return 1;
      return 0;
    });

    const slotDefinitions: Record<string, Record<string, unknown>> = {};
    const slotOrder: string[] = [];

    for (const [slotKey, slot] of orderedSlotEntries) {
      const slotSection = isRecord(slot.section) ? slot.section : {};
      const definitions = resolveDefinitionMapWithPresets(
        getDefinitionMap(slotSection.definitions),
        presetDefinitions
      );
      const elementOrder = getElementOrder(slotSection.elementOrder) ?? Object.keys(definitions);

      const slotWrapperStyle = buildModuleSlotWrapperStyle(slot);
      const hasShell =
        Object.keys(slotWrapperStyle).length > 0 ||
        typeof slot.display === "string" ||
        typeof slot.flexDirection === "string" ||
        typeof slot.alignItems === "string" ||
        typeof slot.justifyContent === "string" ||
        typeof slot.gap === "string" ||
        typeof slot.padding === "string";
      if (elementOrder.length === 0 && !hasShell) continue;

      const slotId = `${moduleKey}--slot-${slotKey}`;
      const slotElement: Record<string, unknown> = {
        type: "elementGroup",
        id: slotId,
        section: {
          definitions,
          ...(elementOrder.length > 0 ? { elementOrder } : {}),
        },
      };
      pickStringField(slotElement, slot, "display");
      pickStringField(slotElement, slot, "flexDirection");
      pickStringField(slotElement, slot, "alignItems");
      pickStringField(slotElement, slot, "justifyContent");
      pickStringField(slotElement, slot, "gap");
      pickStringField(slotElement, slot, "padding");
      if (Object.keys(slotWrapperStyle).length > 0) {
        slotElement.wrapperStyle = slotWrapperStyle;
      }

      slotDefinitions[slotId] = slotElement;
      slotOrder.push(slotId);
    }

    if (slotOrder.length === 0) continue;

    const wrapperId = `${moduleKey}--preview`;
    const wrapperStyle: Record<string, unknown> = {
      position: "relative",
      ...(moduleStyle ?? {}),
    };

    const wrapperElement: Record<string, unknown> = {
      type: "elementGroup",
      id: wrapperId,
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "flex-start",
      width: "100%",
      wrapperStyle,
      section: {
        elementOrder: slotOrder,
        definitions: slotDefinitions,
      },
    };

    sections.push({
      type: "contentBlock",
      id: `playground-module-${moduleKey}`,
      elements: [wrapperElement as ElementBlock],
    } as unknown as SectionBlock);
  }

  return sections;
}

function expandSectionDefinitions(
  section: Record<string, unknown>,
  inheritedDefinitions?: Record<string, Record<string, unknown>>,
  presetDefinitions?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const resolvedSection =
    Object.keys(presetDefinitions ?? {}).length > 0
      ? (resolvePresetRefs(section, presetDefinitions ?? {}) as Record<string, unknown>)
      : section;

  if (
    Array.isArray(resolvedSection.elements) &&
    !resolvedSection.elements.some((item) => typeof item === "string")
  ) {
    return resolvedSection;
  }

  const order =
    getElementOrder(resolvedSection.elementOrder) ??
    (Array.isArray(resolvedSection.elements) &&
    resolvedSection.elements.every((item) => typeof item === "string")
      ? (resolvedSection.elements as string[])
      : null);
  if (!order?.length) return resolvedSection;

  const definitions = {
    ...(inheritedDefinitions ?? {}),
    ...getDefinitionMap(resolvedSection.definitions),
  };
  const resolvedDefinitions = resolveDefinitionMapWithPresets(definitions, presetDefinitions ?? {});
  const idCounts = new Map<string, number>();

  const elements = order
    .map((key) => {
      const definition = resolvedDefinitions[key];
      if (!definition || typeof definition.type !== "string") return null;
      const baseId =
        typeof definition.id === "string" && definition.id.trim().length > 0 ? definition.id : key;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...definition, id: uniqueId };
    })
    .filter((value): value is Record<string, unknown> & { id: string } => value != null);

  if (elements.length === 0) return resolvedSection;
  return { ...resolvedSection, elements };
}

function expandSections(
  sections: unknown[],
  inheritedDefinitions?: Record<string, Record<string, unknown>>,
  presetDefinitions?: Record<string, Record<string, unknown>>
): SectionBlock[] {
  return sections.map((section) =>
    isRecord(section)
      ? (expandSectionDefinitions(section, inheritedDefinitions, presetDefinitions) as SectionBlock)
      : (section as SectionBlock)
  );
}

export function normaliseInput(
  raw: unknown,
  inheritedPresetDefinitions: Record<string, Record<string, unknown>> = {}
): NormaliseResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    if (Array.isArray(raw)) {
      if (raw.every(isElementLike)) {
        return {
          ok: true,
          sections: [
            {
              type: "contentBlock",
              id: "playground-wrapper",
              overflow: "visible",
              elements: raw,
            } as unknown as SectionBlock,
          ],
        };
      }
      return { ok: true, sections: expandSections(raw) };
    }
    return { ok: false, error: "Expected an object or array at the root." };
  }

  const obj = raw as Record<string, unknown>;
  const inlinePresetDefinitions = getDefinitionMap(obj.preset);
  const localPresetDefinitions = {
    ...inheritedPresetDefinitions,
    ...inlinePresetDefinitions,
    ...(isRecord(obj.presets) ? getDefinitionMap(obj.presets) : {}),
  };
  const inheritedDefinitions = resolveDefinitionMapWithPresets(
    getDefinitionMap(obj.definitions),
    localPresetDefinitions
  );

  // Full page: { sections: [...] }
  if (Array.isArray(obj.sections)) {
    return {
      ok: true,
      sections: expandSections(obj.sections, inheritedDefinitions, localPresetDefinitions),
    };
  }

  // Page builder page: { sectionOrder: [...], definitions: { ... } }
  if (Array.isArray(obj.sectionOrder)) {
    const sections = obj.sectionOrder
      .map((key) => (typeof key === "string" ? inheritedDefinitions[key] : null))
      .filter((section): section is Record<string, unknown> => isSectionLike(section))
      .map(
        (section) =>
          expandSectionDefinitions(
            section,
            inheritedDefinitions,
            localPresetDefinitions
          ) as SectionBlock
      );
    if (sections.length > 0) {
      return { ok: true, sections };
    }
  }

  // Plugin ExportResult: { pages: { slug: { sections: [...] } }, presets: {}, ... }
  // Flatten all pages into one sections list, or just take the first page.
  if (obj.pages && typeof obj.pages === "object" && !Array.isArray(obj.pages)) {
    const exportPresetDefinitions = getDefinitionMap(obj.presets);
    const allSections: SectionBlock[] = [];
    for (const page of Object.values(obj.pages as Record<string, unknown>)) {
      const normalisedPage = normaliseInput(page, exportPresetDefinitions);
      if (normalisedPage.ok) {
        allSections.push(...normalisedPage.sections);
      }
    }
    if (allSections.length > 0) return { ok: true, sections: allSections };
  }

  // Plugin payload wrapper: { payload: ExportResult, type: "result", ... }
  if (obj.payload && typeof obj.payload === "object") {
    return normaliseInput(obj.payload, inheritedPresetDefinitions);
  }

  // Module exports / module-only payloads:
  // { modules: { myModule: { type: "module", ... } } }
  if (isRecord(obj.modules)) {
    const moduleSections = buildModulePreviewSections(
      getDefinitionMap(obj.modules),
      localPresetDefinitions
    );
    if (moduleSections.length > 0) {
      return { ok: true, sections: moduleSections };
    }
  }

  // Single module object
  if (isModuleLike(obj)) {
    const moduleSections = buildModulePreviewSections({ preview: obj }, localPresetDefinitions);
    if (moduleSections.length > 0) {
      return { ok: true, sections: moduleSections };
    }
  }

  // Sections array at root level (array case handled above, but also handle
  // the case where someone pastes an object with numeric keys — unlikely,
  // just return an error for that).

  // Single section — has a "type" field that matches known section types
  if (typeof obj.type === "string" && SECTION_TYPES.has(obj.type)) {
    return {
      ok: true,
      sections: [
        expandSectionDefinitions(obj, inheritedDefinitions, localPresetDefinitions) as SectionBlock,
      ],
    };
  }

  // Single element — has a "type" field starting with "element" or is a known element type
  if (
    typeof obj.type === "string" &&
    (ELEMENT_TYPES.has(obj.type) || obj.type.startsWith("element"))
  ) {
    const wrappedSection = {
      type: "contentBlock",
      id: "playground-wrapper",
      overflow: "visible",
      elements: [obj],
    } as unknown as SectionBlock;
    return { ok: true, sections: [wrappedSection] };
  }

  // No recognised shape — try treating it as a single section anyway
  // (user might have a custom type or a non-standard field)
  if (typeof obj.type === "string") {
    return {
      ok: true,
      sections: [expandSectionDefinitions(obj, inheritedDefinitions) as SectionBlock],
    };
  }

  return {
    ok: false,
    error:
      'Could not recognise the input shape. Expected { "sections": [...] }, a sections array, a page object, module exports, a single section object, or a single element object.',
  };
}
