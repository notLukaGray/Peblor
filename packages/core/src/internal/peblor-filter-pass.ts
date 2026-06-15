import type { ElementBlock, PageTags, ProjectGroupsMap, SectionBlock } from "@pb/contracts";
import {
  BREAKPOINT_TIER_NAMES,
  type BreakpointTierName,
} from "@pb/contracts/peblor/core/breakpoint-tiers";
import { NESTED_SECTION_ELEMENT_TYPES } from "@pb/contracts";

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

export type PeblorPageFilterIndex = {
  filterCategories: string[];
  elementKeysByProject: Record<string, string[]>;
  projectTagsBySlug: Record<string, PageTags>;
};

export type FilterIndexPassInput = {
  sections: SectionBlock[];
  filterIndex: PeblorPageFilterIndex;
  activeFilters: PageTags;
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

export function filterPageByFilterIndex(input: FilterIndexPassInput): FilterPassResult {
  const { sections, filterIndex, activeFilters } = input;

  if (!hasActiveFilters(activeFilters)) {
    return { sections, removedKeys: new Set() };
  }

  const activeCategoryKeys = new Set(filterIndex.filterCategories);
  const filteredActiveFilters = Object.fromEntries(
    Object.entries(activeFilters).filter(([category]) => activeCategoryKeys.has(category))
  ) as PageTags;
  if (!hasActiveFilters(filteredActiveFilters)) {
    return { sections, removedKeys: new Set() };
  }

  const removedKeys = new Set<string>();
  for (const [projectSlug, elementKeys] of Object.entries(filterIndex.elementKeysByProject)) {
    const tags = filterIndex.projectTagsBySlug[projectSlug];
    if (!projectMatchesFilters(tags, filteredActiveFilters)) {
      for (const key of elementKeys) removedKeys.add(key);
    }
  }

  if (removedKeys.size === 0) {
    return { sections, removedKeys };
  }

  return {
    sections: sections.map((section) => stripFromSection(section, removedKeys)),
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

type TierResponsiveOrder = {
  [K in BreakpointTierName]?: string[];
};
type ResponsiveLayoutMap = {
  [K in BreakpointTierName]?: Record<string, unknown>;
} & {
  "@container"?: Record<string, unknown>;
};

function filterElementOrder(
  order: unknown,
  removedKeys: ReadonlySet<string>
): string[] | TierResponsiveOrder | undefined {
  if (Array.isArray(order)) {
    return order.filter(
      (k): k is string => typeof k === "string" && !idMatchesRemovedKey(k, removedKeys)
    );
  }
  if (order && typeof order === "object") {
    const obj = order as Record<string, string[] | undefined>;
    const result: Record<string, string[] | undefined> = {};
    for (const tier of BREAKPOINT_TIER_NAMES) {
      const filtered = obj[tier]?.filter((k) => !idMatchesRemovedKey(k, removedKeys));
      if (filtered !== undefined) result[tier] = filtered;
    }
    return Object.keys(result).length > 0 ? (result as TierResponsiveOrder) : undefined;
  }
  return undefined;
}

function filterLayoutMap(map: unknown, removedKeys: ReadonlySet<string>): unknown {
  if (!map || typeof map !== "object") return map;
  if (Array.isArray(map)) return map;

  const obj = map as Record<string, unknown>;

  // Check if this is a responsive wrapper (tier-map or @container)
  const hasTierKeys = (BREAKPOINT_TIER_NAMES as readonly string[]).some((tier) => tier in obj);
  const hasContainerKey = "@container" in obj;
  const isResponsiveWrapper = hasTierKeys || hasContainerKey;

  if (isResponsiveWrapper) {
    const responsive = obj as ResponsiveLayoutMap;
    const result: Record<string, unknown> = {};

    // Handle tier-map branches
    for (const tier of BREAKPOINT_TIER_NAMES) {
      const tierValue = (responsive as Record<string, unknown>)[tier];
      if (tierValue) {
        result[tier] = filterLayoutMap(tierValue, removedKeys);
      }
    }

    // Handle @container branch
    if (responsive["@container"]) {
      result["@container"] = filterLayoutMap(responsive["@container"], removedKeys);
    }

    return result;
  }

  // This is an id → value map, filter by id
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
  if (
    !NESTED_SECTION_ELEMENT_TYPES.includes(el.type as (typeof NESTED_SECTION_ELEMENT_TYPES)[number])
  )
    return element;
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
