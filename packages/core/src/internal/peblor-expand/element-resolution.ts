import type { ElementBlock, Peblor } from "@pb/contracts";
import type { DefinitionsMap, SectionWithElements } from "./section-shapes";
import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";
import { resolveResponsiveValue } from "../../lib/responsive-value";
import { pruneModuleSlotElements, getFilledSlotIds } from "./prune-unfilled-slots";

export function buildDisplayOrder(page: Peblor): string[] {
  return [...(page.sectionOrder ?? []), ...(page.triggers ?? [])];
}

/**
 * Returns the union of all element order keys across viewport breakpoints.
 *
 * During the EXPAND phase, we don't know the client's viewport width, so we need
 * ALL possible elements to be inlined. This function takes the deduplicated union
 * of all tier orders so that no element gets dropped during expansion.
 *
 * Viewport-specific filtering happens later, in the RESOLVE phase (responsive image
 * sizing, breakpoint-aware container widths) and at RENDER time (CSS media queries
 * or JS breakpoint checks for responsive element orders).
 *
 * @see getElementOrder for the viewport-specific variant used in rendering.
 */
export function getUnionElementOrder(section: SectionWithElements): string[] | null {
  if (Array.isArray(section.elementOrder)) return section.elementOrder;
  const eo = section.elementOrder;
  if (eo && typeof eo === "object") {
    const seen = new Set<string>();
    const union: string[] = [];
    for (const tier of BREAKPOINT_TIER_NAMES) {
      const order = (eo as Record<string, string[] | undefined>)[tier];
      if (Array.isArray(order)) {
        for (const ref of order) {
          if (!seen.has(ref)) {
            seen.add(ref);
            union.push(ref);
          }
        }
      }
    }
    return union.length > 0 ? union : null;
  }
  if (
    Array.isArray(section.elements) &&
    section.elements.length > 0 &&
    typeof section.elements[0] === "string"
  ) {
    return section.elements as string[];
  }
  return null;
}

export function getElementOrder(
  section: SectionWithElements,
  isMobile: boolean | undefined
): string[] | null {
  if (Array.isArray(section.elementOrder)) return section.elementOrder;
  const eo = section.elementOrder;
  if (eo && typeof eo === "object") {
    // If it's a tier map, resolve via mobile-first cascade
    const hasTierKey = BREAKPOINT_TIER_NAMES.some(
      (tier) => tier in (eo as Record<string, unknown>)
    );
    if (hasTierKey) {
      return (
        (resolveResponsiveValue(eo as Record<string, string[]>, isMobile ?? false) as
          | string[]
          | undefined) ?? null
      );
    }
  }
  if (
    Array.isArray(section.elements) &&
    section.elements.length > 0 &&
    typeof section.elements[0] === "string"
  ) {
    return section.elements as string[];
  }
  return null;
}

export function resolveElements(
  order: string[],
  defs: DefinitionsMap,
  context?: string
): ElementBlock[] {
  const idCounts = new Map<string, number>();
  return order.map((k) => {
    const element = defs[k];
    if (element && typeof element === "object" && "type" in element) {
      const candidate = element as ElementBlock & { id?: unknown };
      const baseId =
        typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : k;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...candidate, id: uniqueId } as ElementBlock;
    }
    throw new Error(
      `[peblor] ElementOrder key "${k}" has no matching definition${context ? ` (in ${context})` : ""} — fail (K-13).`
    );
  });
}

export function applyElementIdsAndModules(
  section: SectionWithElements,
  defs: DefinitionsMap,
  namespacePrefix: string
): void {
  if (!Array.isArray(section.elements)) return;
  for (const element of section.elements) {
    applyElementIdAndModule(element, defs, namespacePrefix);
  }
}

function applyElementIdAndModule(
  element: unknown,
  defs: DefinitionsMap,
  namespacePrefix: string
): void {
  if (!element || typeof element !== "object") return;

  const el = element as ElementBlock & { module?: string; moduleConfig?: unknown };

  if ("id" in el && typeof el.id === "string" && el.id) {
    el.id = `${namespacePrefix}:${el.id}`;
  }

  if (el.module && typeof el.module === "string") {
    const moduleBlock = defs[el.module];
    if (
      moduleBlock &&
      typeof moduleBlock === "object" &&
      "type" in moduleBlock &&
      (moduleBlock as { type: string }).type === "module"
    ) {
      // Deep-clone to prevent pruneModuleSlotElements from mutating
      // the shared module definition when multiple elements reference the
      // same module — without the clone, the second expansion sees a
      // corrupted slots.elementOrder from the first (BUG-1).
      const config = JSON.parse(JSON.stringify(moduleBlock)) as Record<string, unknown>;
      const callsiteBlock = el as Record<string, unknown>;
      if (callsiteBlock.slots && typeof callsiteBlock.slots === "object") {
        const filledSlotIds = getFilledSlotIds(callsiteBlock);
        if (filledSlotIds.size > 0 && typeof config.slots === "object" && config.slots !== null) {
          pruneModuleSlotElements(config.slots as Record<string, unknown>, filledSlotIds);
        }
      }
      el.moduleConfig = config;
    }
  }

  const nestedSection = (el as { section?: unknown }).section;
  if (nestedSection && typeof nestedSection === "object" && !Array.isArray(nestedSection)) {
    const nested = { ...(nestedSection as Record<string, unknown>) } as SectionWithElements;
    if (Array.isArray(nested.elements))
      nested.elements = [...nested.elements] as typeof nested.elements;
    (el as { section?: SectionWithElements }).section = nested;
    const nestedDefsSource = (nested as { definitions?: DefinitionsMap }).definitions;
    const nestedDefs =
      nestedDefsSource && typeof nestedDefsSource === "object" && !Array.isArray(nestedDefsSource)
        ? { ...nestedDefsSource }
        : undefined;
    if (nestedDefs) (nested as { definitions?: DefinitionsMap }).definitions = nestedDefs;
    const order = getUnionElementOrder(nested);

    if (
      order?.length &&
      nestedDefs &&
      typeof nestedDefs === "object" &&
      !Array.isArray(nestedDefs)
    ) {
      // Local nestedDefs must win over page-level defs — a key defined inside this nested
      // section (e.g. "player-surface") must NOT be overridden by a same-named resolved preset
      // sitting at the page level, or we create a self-referencing cycle.
      nested.elements = resolveElements(order, { ...defs, ...nestedDefs });

      // Update nestedDefs (= nested.definitions, the renderer's source of truth for nested
      // elementGroup sections) with processed clones so IDs and moduleConfigs are applied.
      for (const key of order) {
        const child = nestedDefs[key];
        if (!child || typeof child !== "object") continue;
        const clonedChild = { ...(child as Record<string, unknown>) } as ElementBlock;
        applyElementIdAndModule(clonedChild, defs, namespacePrefix);
        nestedDefs[key] = clonedChild;
      }
    }

    if (Array.isArray(nested.elements)) {
      for (const child of nested.elements) {
        applyElementIdAndModule(child, defs, namespacePrefix);
      }
    }
  }
}
