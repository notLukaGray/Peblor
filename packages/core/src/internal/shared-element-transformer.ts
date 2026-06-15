/**
 * Shared element-tree walker used by the DEFAULTS, MOTION, and RICH-TEXT
 * pipeline stages. Each stage provides a per-element transform; this utility
 * handles the recursion into elementGroup / elementInfiniteScroll section
 * definitions, moduleConfig slots, and revealSection branches.
 *
 * Every tree walk in the pipeline should use this utility so that new nested
 * element types only need to be added in one place.
 */
import { isRecord } from "../lib/type-guards";
import type { SectionBlock, ElementBlock } from "@pb/contracts";
import { NESTED_SECTION_ELEMENT_TYPES } from "@pb/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ElementTransformFn = (el: Record<string, unknown>) => Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk a flat definitions map, applying `transform` to each element-shaped entry.
 *  Returns the original map reference if nothing changed. */
function walkDefinitions(
  defs: Record<string, unknown>,
  transform: ElementTransformFn
): { nextDefs: Record<string, unknown>; changed: boolean } {
  const nextDefs: Record<string, unknown> = {};
  let changed = false;
  for (const [k, def] of Object.entries(defs)) {
    if (!def || typeof def !== "object") {
      nextDefs[k] = def;
      continue;
    }
    const next = walkElement(def as Record<string, unknown>, transform);
    if (next !== def) changed = true;
    nextDefs[k] = next;
  }
  return { nextDefs, changed };
}

// ---------------------------------------------------------------------------
// Element-level walker
// ---------------------------------------------------------------------------

/**
 * Walk an element record, applying `transform` to this element and recursively
 * to any nested definitions inside elementGroup / elementInfiniteScroll sections
 * and moduleConfig slots.
 *
 * Returns the element unchanged if no nested content was modified.
 */
function walkElement(
  el: Record<string, unknown>,
  transform: ElementTransformFn
): Record<string, unknown> {
  // 1. Apply the caller's transform to this element.
  let result = transform(el);

  // 2. Recurse into elementGroup / elementInfiniteScroll → section.definitions
  //    and direct elements children.
  if (
    NESTED_SECTION_ELEMENT_TYPES.includes(
      result.type as (typeof NESTED_SECTION_ELEMENT_TYPES)[number]
    )
  ) {
    const section = result.section as { definitions?: Record<string, unknown> } | undefined;
    if (section?.definitions && typeof section.definitions === "object") {
      const { nextDefs, changed } = walkDefinitions(section.definitions, transform);
      if (changed) {
        result = { ...result, section: { ...section, definitions: nextDefs } };
      }
    }

    // Also recurse into the group's direct elements children (if any).
    if (Array.isArray(result.elements) && result.elements.length > 0) {
      const elements = result.elements as Record<string, unknown>[];
      const nextElements = elements.map((child) =>
        child && typeof child === "object" ? walkElement(child, transform) : child
      );
      if (nextElements.some((e, i) => e !== elements[i])) {
        result = { ...result, elements: nextElements };
      }
    }
  }

  // 3. Recurse into moduleConfig.slots[*].section.definitions.
  const moduleConfig = result.moduleConfig as
    | { slots?: Record<string, { section?: { definitions?: Record<string, unknown> } }> }
    | undefined;
  if (moduleConfig?.slots && typeof moduleConfig.slots === "object") {
    const nextSlots: Record<string, unknown> = {};
    let slotsChanged = false;
    for (const [slotKey, slot] of Object.entries(moduleConfig.slots)) {
      const slotSection = (slot as { section?: { definitions?: Record<string, unknown> } })
        ?.section;
      if (!slotSection?.definitions || typeof slotSection.definitions !== "object") {
        nextSlots[slotKey] = slot;
        continue;
      }
      const { nextDefs, changed } = walkDefinitions(slotSection.definitions, transform);
      nextSlots[slotKey] = changed
        ? {
            ...(slot as Record<string, unknown>),
            section: { ...slotSection, definitions: nextDefs },
          }
        : slot;
      if (changed) slotsChanged = true;
    }
    if (slotsChanged) {
      result = {
        ...result,
        moduleConfig: { ...(moduleConfig as Record<string, unknown>), slots: nextSlots },
      };
    }
  }

  return result === el ? el : result;
}

// ---------------------------------------------------------------------------
// Section-level walker
// ---------------------------------------------------------------------------

function walkSection(
  section: Record<string, unknown>,
  transform: ElementTransformFn
): Record<string, unknown> {
  let result: Record<string, unknown> = section;

  // elements array (contentBlock, scrollContainer, sectionColumn, etc.)
  if (Array.isArray(section.elements)) {
    const elements = section.elements as Record<string, unknown>[];
    const nextElements = elements.map((el) =>
      el && typeof el === "object" ? walkElement(el, transform) : el
    );
    if (nextElements.some((e, i) => e !== elements[i])) {
      result = { ...result, elements: nextElements };
    }
  }

  // section-level definitions (walked by entrance-motion resolution for
  // definition blocks bound directly to the section, outside any element).
  if (result.definitions && typeof result.definitions === "object") {
    const { nextDefs, changed } = walkDefinitions(
      result.definitions as Record<string, unknown>,
      transform
    );
    if (changed) result = { ...result, definitions: nextDefs };
  }

  // revealSection branches
  if (result.type === "revealSection") {
    for (const branch of ["collapsedElements", "revealedElements"] as const) {
      if (Array.isArray(result[branch]) && (result[branch] as unknown[]).length > 0) {
        const items = result[branch] as Record<string, unknown>[];
        const nextItems = items.map((el) =>
          el && typeof el === "object" ? walkElement(el, transform) : el
        );
        if (nextItems.some((e, i) => e !== items[i])) {
          result = { ...result, [branch]: nextItems };
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a per-element transform across every element in `sections`, handling
 * all nested definitions (elementGroup / elementInfiniteScroll / module slots /
 * revealSection branches).
 *
 * The caller provides a single function that transforms ONE flat element record.
 * This utility handles the tree traversal.
 */
export function transformElementsInSections(
  sections: SectionBlock[],
  transformElement: (el: ElementBlock) => ElementBlock
): SectionBlock[] {
  // Wrap the caller's typed transform for the internal walker.
  const transform = buildInternalTransform(transformElement);

  return sections.map((section) => {
    const result = walkSection(section as Record<string, unknown>, transform);
    return result === section ? section : (result as SectionBlock);
  });
}

/**
 * Apply a sequence of per-element transforms across every element in `sections`
 * using a SINGLE tree walk instead of N sequential walks.
 *
 * Each transform in the array is applied in order to each element during the
 * same traversal. This replaces the common pattern of:
 *   transformElementsInSections(sections, fn1)
 *   transformElementsInSections(sections, fn2)
 * with:
 *   transformElementsInSectionsCombined(sections, [fn1, fn2])
 *
 * The transforms are applied in array order — later transforms see the results
 * of earlier transforms (e.g. defaults first, then entrance motions, then
 * rich-text precompilation).
 */
export function transformElementsInSectionsCombined(
  sections: SectionBlock[],
  transforms: Array<(el: ElementBlock) => ElementBlock>
): SectionBlock[] {
  if (transforms.length === 0) return sections;
  if (transforms.length === 1) return transformElementsInSections(sections, transforms[0]!);

  const combinedTransform = (el: ElementBlock): ElementBlock => {
    let current: ElementBlock = el;
    for (const fn of transforms) {
      current = fn(current);
    }
    return current;
  };

  return transformElementsInSections(sections, combinedTransform);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildInternalTransform(
  transformElement: (el: ElementBlock) => ElementBlock
): ElementTransformFn {
  return (el: Record<string, unknown>): Record<string, unknown> => {
    if (!isRecord(el) || typeof el.type !== "string") return el;
    if (el.type === "cssGradient") return el; // never a peblor element
    const transformed = transformElement(el as ElementBlock);
    return transformed as Record<string, unknown>;
  };
}
