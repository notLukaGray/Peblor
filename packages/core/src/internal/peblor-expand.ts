import { SECTION_TYPE_STRINGS, type Peblor, type SectionBlock, type bgBlock } from "@pb/contracts";
import {
  applyElementIdsAndModules,
  buildDisplayOrder,
  getElementOrder,
  resolveElements,
} from "./peblor-expand/element-resolution";
import { applyColumnNamespace } from "./peblor-expand/column-namespacing";
import { resolveSectionTriggerPayloads } from "./peblor-expand/trigger-payload-resolution";
import type { DefinitionsMap, SectionWithElements } from "./peblor-expand/section-shapes";
import { resolveTriggerPayloadUrls } from "./peblor-triggers";
import {
  DEFAULT_BREAKPOINTS,
  isMobileViewportWidth,
  resolveBreakpointDefinitions,
  type BreakpointDefinitions,
} from "./defaults/pb-breakpoint-defaults";

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

function warnExpandFallbacks(page: Peblor): void {
  if (process.env.NODE_ENV !== "development") return;
  const defs = page.definitions;
  const slug = page.slug ?? "(unknown)";

  // bgKey fallback
  if (!page.bgKey) {
    console.warn(
      `[peblor] ${slug}: bgKey not set — defaulting to "bg". Set bgKey explicitly to suppress this warning.`
    );
  }

  // section-order drops
  for (const key of page.sectionOrder ?? []) {
    const block = defs[key];
    if (block == null || typeof block !== "object" || !("type" in block)) {
      console.warn(
        `[peblor] ${slug}: sectionOrder key "${key}" has no matching definition — dropped.`
      );
      continue;
    }
    const type = (block as { type: string }).type;
    if (!SECTION_TYPE_STRINGS.has(type)) {
      console.warn(
        `[peblor] ${slug}: sectionOrder key "${key}" has type "${type}" which is not a section type — dropped.`
      );
    }
  }
}

/** Expand Peblor into bg + sections; section.elements are refs into definitions. */
export function expandPeblor(
  page: Peblor,
  options?: ExpandPeblorOptions
): {
  bg: bgBlock | null;
  sections: SectionBlock[];
} {
  const breakpoints = options?.breakpoints
    ? resolveBreakpointDefinitions(options.breakpoints)
    : DEFAULT_BREAKPOINTS;
  const responsiveIsMobile =
    typeof options?.viewportWidthPx === "number"
      ? isMobileViewportWidth(options.viewportWidthPx, breakpoints)
      : undefined;
  const defs = page.definitions;
  const displayOrder = buildDisplayOrder(page);
  const bgKey = page.bgKey ?? "bg";

  warnExpandFallbacks(page);

  const bg: bgBlock | null =
    defs[bgKey] != null && typeof defs[bgKey] === "object" && "type" in (defs[bgKey] as object)
      ? (defs[bgKey] as bgBlock)
      : null;

  const sections: SectionBlock[] = [];

  for (let i = 0; i < displayOrder.length; i++) {
    const key = displayOrder[i];
    if (!key) continue;
    const block = defs[key];
    if (block == null || typeof block !== "object" || !("type" in block)) continue;
    const type = (block as { type: string }).type;
    if (!SECTION_TYPE_STRINGS.has(type)) continue;

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
    const order = getElementOrder(section, responsiveIsMobile);
    if (order?.length) {
      const sectionDefs = (section as { definitions?: DefinitionsMap }).definitions;
      const defsForElements: DefinitionsMap =
        sectionDefs && typeof sectionDefs === "object" && !Array.isArray(sectionDefs)
          ? { ...sectionDefs, ...defs }
          : defs;
      section.elements = resolveElements(order, defsForElements);
    }

    const namespacePrefix =
      section.id && typeof section.id === "string" ? section.id : `${type}_${i}`;
    applyElementIdsAndModules(section, defs, namespacePrefix);
    applyColumnNamespace(section, namespacePrefix);
    resolveSectionTriggerPayloads(section, defs);

    sections.push(section as SectionBlock);
  }

  const finalSections =
    options?.assetBase !== undefined
      ? resolveTriggerPayloadUrls(sections, options.assetBase, page.definitions)
      : sections;

  return { bg, sections: finalSections };
}
