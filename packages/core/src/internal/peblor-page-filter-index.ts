import type { FilterConfig, PageTags, ProjectGroupsMap } from "@pb/contracts";
import { getPageMetadataAsync } from "./peblor-load";
import type { PeblorPageFilterIndex } from "./peblor-filter-pass";

type FilterIndexPage = {
  slug?: string;
  filterConfig?: FilterConfig;
  projectGroups?: ProjectGroupsMap;
};

const isDev = process.env.NODE_ENV !== "production";
const pageFilterIndexCache = new Map<string, Promise<PeblorPageFilterIndex | null>>();

export async function getPeblorPageFilterIndex(
  page: FilterIndexPage | null
): Promise<PeblorPageFilterIndex | null> {
  if (!page) return null;

  const cacheKey =
    !isDev && typeof page.slug === "string" && page.slug.length > 0 ? page.slug : null;
  if (cacheKey) {
    const cached = pageFilterIndexCache.get(cacheKey);
    if (cached) return cached;
    const pending = buildPeblorPageFilterIndex(page);
    pageFilterIndexCache.set(cacheKey, pending);
    return pending;
  }

  return buildPeblorPageFilterIndex(page);
}

async function buildPeblorPageFilterIndex(
  page: FilterIndexPage
): Promise<PeblorPageFilterIndex | null> {
  const filterCategories = page.filterConfig?.categories
    .map((category) => category.key)
    .filter((key) => typeof key === "string" && key.length > 0);
  const projectGroups = page.projectGroups;
  if (!filterCategories || filterCategories.length === 0 || !projectGroups) {
    return null;
  }

  const elementKeysByProject: Record<string, string[]> = {};
  for (const group of Object.values(projectGroups)) {
    const projectSlug = group.projectSlug;
    if (typeof projectSlug !== "string" || projectSlug.length === 0) continue;
    const existing = elementKeysByProject[projectSlug] ?? [];
    for (const key of group.elements) {
      if (typeof key !== "string" || key.length === 0 || existing.includes(key)) continue;
      existing.push(key);
    }
    if (existing.length > 0) {
      elementKeysByProject[projectSlug] = existing;
    }
  }

  const projectSlugs = Object.keys(elementKeysByProject);
  if (projectSlugs.length === 0) return null;

  const projectTagsBySlug: Record<string, PageTags> = {};
  await Promise.all(
    projectSlugs.map(async (slug) => {
      try {
        const meta = await getPageMetadataAsync(slug);
        const tags = meta?.tags;
        if (!tags || typeof tags !== "object" || Array.isArray(tags)) return;
        projectTagsBySlug[slug] = tags as PageTags;
      } catch {
        // Isolate individual page metadata failure — other pages should still load.
      }
    })
  );

  return {
    filterCategories,
    elementKeysByProject,
    projectTagsBySlug,
  };
}
