import type { ElementBlock, PageTags, ProjectGroupsMap, SectionBlock } from "@pb/contracts";

export type FilterPassInput = {
  sections: SectionBlock[];
  projectGroups: ProjectGroupsMap;
  /** Active filters as parsed from query string. Values are slugified before matching. */
  activeFilters: PageTags;
  /** Lookup project tags by projectSlug. Returns undefined if the project page has no tags. */
  getProjectTags: (slug: string) => PageTags | undefined;
};

export type FilterPassResult = {
  sections: SectionBlock[];
  /** Element keys removed by the filter pass. Empty when filters are inactive or every project matched. */
  removedKeys: ReadonlySet<string>;
};

export function filterPageByActiveTags(input: FilterPassInput): FilterPassResult {
  const { sections, projectGroups, activeFilters, getProjectTags } = input;

  if (!hasActiveFilters(activeFilters)) {
    return { sections, removedKeys: new Set() };
  }

  const removedKeys = new Set<string>();
  for (const group of Object.values(projectGroups)) {
    const tags = getProjectTags(group.projectSlug);
    if (!projectMatchesFilters(tags, activeFilters)) {
      for (const key of group.elements) removedKeys.add(key);
    }
  }

  if (removedKeys.size === 0) {
    return { sections, removedKeys };
  }

  return {
    sections: sections.map((s) => stripFromSection(s, removedKeys)),
    removedKeys,
  };
}

export function slugifyTagValue(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function hasActiveFilters(filters: PageTags): boolean {
  for (const values of Object.values(filters)) {
    if (values.length > 0) return true;
  }
  return false;
}

function projectMatchesFilters(
  projectTags: PageTags | undefined,
  activeFilters: PageTags
): boolean {
  for (const [category, filterValues] of Object.entries(activeFilters)) {
    if (filterValues.length === 0) continue;
    const projectValues = projectTags?.[category] ?? [];
    const projectSlugs = new Set(projectValues.map(slugifyTagValue));
    const filterSlugs = filterValues
      .filter((v) => typeof v === "string" && v.length > 0)
      .map(slugifyTagValue);
    if (filterSlugs.length === 0) continue;
    const matchesAny = filterSlugs.some((v) => projectSlugs.has(v));
    if (!matchesAny) return false;
  }
  return true;
}

type ResponsiveOrder = { mobile?: string[]; desktop?: string[] };
type ResponsiveLayoutMap = { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> };

function filterElementOrder(
  order: unknown,
  removedKeys: ReadonlySet<string>
): string[] | ResponsiveOrder | undefined {
  if (Array.isArray(order)) {
    return order.filter(
      (k): k is string => typeof k === "string" && !idMatchesRemovedKey(k, removedKeys)
    );
  }
  if (order && typeof order === "object") {
    const obj = order as ResponsiveOrder;
    const mobile = obj.mobile?.filter((k) => !idMatchesRemovedKey(k, removedKeys));
    const desktop = obj.desktop?.filter((k) => !idMatchesRemovedKey(k, removedKeys));
    return {
      ...(mobile !== undefined ? { mobile } : {}),
      ...(desktop !== undefined ? { desktop } : {}),
    };
  }
  return undefined;
}

function filterLayoutMap(map: unknown, removedKeys: ReadonlySet<string>): unknown {
  if (!map || typeof map !== "object") return map;
  if (Array.isArray(map)) return map;

  const obj = map as Record<string, unknown>;
  const hasResponsiveKeys = "mobile" in obj || "desktop" in obj;
  if (hasResponsiveKeys) {
    const responsive = obj as ResponsiveLayoutMap;
    return {
      ...(responsive.mobile ? { mobile: filterLayoutMap(responsive.mobile, removedKeys) } : {}),
      ...(responsive.desktop ? { desktop: filterLayoutMap(responsive.desktop, removedKeys) } : {}),
    };
  }

  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !idMatchesRemovedKey(key, removedKeys))
  );
}

function idMatchesRemovedKey(id: string | undefined, removedKeys: ReadonlySet<string>): boolean {
  if (!id) return false;
  if (removedKeys.has(id)) return true;
  const namespaceIndex = id.lastIndexOf(":");
  return namespaceIndex >= 0 && removedKeys.has(id.slice(namespaceIndex + 1));
}

function stripFromSection(section: SectionBlock, removedKeys: ReadonlySet<string>): SectionBlock {
  const s = section as SectionBlock & {
    elements?: ElementBlock[];
    elementOrder?: unknown;
    columnAssignments?: unknown;
    columnSpan?: unknown;
    itemStyles?: unknown;
    itemLayout?: unknown;
  };
  const next = { ...s };

  if (Array.isArray(s.elements)) {
    next.elements = s.elements
      .filter((el) => !idMatchesRemovedKey((el as { id?: string }).id, removedKeys))
      .map((el) => stripFromElement(el, removedKeys));
  }

  if (s.elementOrder !== undefined) {
    const filtered = filterElementOrder(s.elementOrder, removedKeys);
    if (filtered !== undefined) next.elementOrder = filtered;
  }

  for (const mapKey of ["columnAssignments", "columnSpan", "itemStyles", "itemLayout"] as const) {
    if (s[mapKey] !== undefined) {
      next[mapKey] = filterLayoutMap(s[mapKey], removedKeys);
    }
  }

  return next as SectionBlock;
}

function stripFromElement(element: ElementBlock, removedKeys: ReadonlySet<string>): ElementBlock {
  const el = element as ElementBlock & {
    type: string;
    section?: { elementOrder?: unknown; definitions?: Record<string, unknown> };
  };
  if (el.type !== "elementGroup" && el.type !== "elementInfiniteScroll") return element;
  const nested = el.section;
  if (!nested) return element;

  const newSection: { elementOrder?: unknown; definitions?: Record<string, unknown> } = {
    ...nested,
  };

  if (nested.elementOrder !== undefined) {
    const filtered = filterElementOrder(nested.elementOrder, removedKeys);
    if (filtered !== undefined) newSection.elementOrder = filtered;
  }

  if (nested.definitions && typeof nested.definitions === "object") {
    const newDefs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(nested.definitions)) {
      if (removedKeys.has(key)) continue;
      if (value && typeof value === "object" && "type" in value) {
        newDefs[key] = stripFromElement(value as ElementBlock, removedKeys);
      } else {
        newDefs[key] = value;
      }
    }
    newSection.definitions = newDefs;
  }

  return { ...el, section: newSection } as ElementBlock;
}
