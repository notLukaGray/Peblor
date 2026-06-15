import { SECTION_TYPE_STRINGS, type Peblor, type SectionBlock, type bgBlock } from "@pb/contracts";
import {
  applyElementIdsAndModules,
  buildDisplayOrder,
  getUnionElementOrder,
  resolveElements,
} from "./peblor-expand/element-resolution";
import { applyColumnNamespace } from "./peblor-expand/column-namespacing";
import { resolveSectionTriggerPayloads } from "./peblor-expand/trigger-payload-resolution";
import type { DefinitionsMap, SectionWithElements } from "./peblor-expand/section-shapes";
import { resolveTriggerPayloadUrls } from "./peblor-triggers";
import type { BreakpointDefinitions } from "./defaults/pb-breakpoint-defaults";

export type ExpandPeblorOptions = {
  /** When set, trigger payloads get asset URLs resolved in the same pass (avoids second walk in getPage). */
  assetBase?: string;
  /**
   * Breakpoint thresholds used when responsive object values are resolved during expansion.
   * Defaults to DEFAULT_BREAKPOINTS when omitted.
   */
  breakpoints?: Partial<BreakpointDefinitions>;
  /**
   * When provided, expansion resolves responsive object orders (`elementOrder.mobile/desktop`)
   * using this viewport width and `breakpoints.desktop`.
   */
  viewportWidthPx?: number;
};

/** Expand Peblor into bg + sections; section.elements are refs into definitions. */
export function expandPeblor(
  page: Peblor,
  options?: ExpandPeblorOptions
): {
  bg: bgBlock | null;
  sections: SectionBlock[];
} {
  const defs = page.definitions;
  const displayOrder = buildDisplayOrder(page);
  const sectionKeys = new Set(page.sectionOrder ?? []);
  const slug = page.slug ?? "(unknown)";

  // bgKey is optional (z.string().optional() in the schema). When unset, no background
  // is resolved. The old `?? "bg"` default was removed per K-10 — callers that want a
  // background must set bgKey explicitly in the page data.
  const bgKey = page.bgKey;

  const bg: bgBlock | null =
    bgKey != null &&
    defs[bgKey] != null &&
    typeof defs[bgKey] === "object" &&
    "type" in (defs[bgKey] as object)
      ? (defs[bgKey] as bgBlock)
      : null;

  const sections: SectionBlock[] = [];

  for (let i = 0; i < displayOrder.length; i++) {
    const key = displayOrder[i];
    if (key == null) continue;
    const block = defs[key];
    if (block == null || typeof block !== "object" || !("type" in block)) {
      if (sectionKeys.has(key)) {
        throw new Error(
          `[peblor] ${slug}: sectionOrder key "${key}" has no matching definition — fail (K-11).`
        );
      }
      continue;
    }
    const type = (block as { type: string }).type;
    if (!SECTION_TYPE_STRINGS.has(type)) {
      if (sectionKeys.has(key)) {
        throw new Error(
          `[peblor] ${slug}: sectionOrder key "${key}" has type "${type}" which is not a section type — fail (K-11).`
        );
      }
      continue;
    }

    const section = { ...block } as SectionWithElements;
    if (
      Array.isArray(section.elements) &&
      section.elements.length > 0 &&
      typeof section.elements[0] === "object"
    ) {
      section.elements = section.elements.map((element) =>
        element && typeof element === "object"
          ? ({ ...(element as Record<string, unknown>) } as typeof element)
          : element
      ) as typeof section.elements;
    }
    const order = getUnionElementOrder(section);
    if (order?.length) {
      const sectionDefs = (section as { definitions?: DefinitionsMap }).definitions;
      const defsForElements: DefinitionsMap =
        sectionDefs && typeof sectionDefs === "object" && !Array.isArray(sectionDefs)
          ? { ...defs, ...sectionDefs }
          : defs;
      section.elements = resolveElements(order, defsForElements);
    }

    const namespacePrefix =
      section.id && typeof section.id === "string" ? section.id : `${type}_${i}`;
    applyElementIdsAndModules(section, defs, namespacePrefix);
    applyColumnNamespace(section, namespacePrefix);
    sections.push(resolveSectionTriggerPayloads(section, defs) as SectionBlock);
  }

  const finalSections =
    options?.assetBase !== undefined
      ? resolveTriggerPayloadUrls(sections, options.assetBase, page.definitions)
      : sections;

  return { bg, sections: finalSections };
}
