/**
 * Split a merged page JSON (definitions inline) into `index.json` + `{sectionKey}.json`
 * compatible with `hydrateSectionFiles` in peblor-load-definitions.
 */

export interface SplitPageForContentDirResult {
  index: Record<string, unknown>;
  /** One file per sectionOrder key that had a definition block */
  sectionFiles: Record<string, Record<string, unknown>>;
}

export function splitPageForContentDir(
  page: Record<string, unknown>,
  slug: string
): SplitPageForContentDirResult {
  const sectionOrder = page.sectionOrder;
  const definitions = structuredClone(
    typeof page.definitions === "object" &&
      page.definitions !== null &&
      !Array.isArray(page.definitions)
      ? (page.definitions as Record<string, unknown>)
      : {}
  );
  const sectionFiles: Record<string, Record<string, unknown>> = {};

  if (Array.isArray(sectionOrder)) {
    for (const key of sectionOrder) {
      if (typeof key !== "string") continue;
      const block = definitions[key];
      if (block != null && typeof block === "object" && !Array.isArray(block)) {
        sectionFiles[key] = structuredClone(block) as Record<string, unknown>;
        delete definitions[key];
      }
    }
  }

  const index: Record<string, unknown> = {
    ...page,
    definitions,
    slug: typeof page.slug === "string" && page.slug.length > 0 ? page.slug : slug,
  };

  return { index, sectionFiles };
}
