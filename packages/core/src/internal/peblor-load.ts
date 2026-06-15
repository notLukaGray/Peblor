import fs from "fs";
import { isSafePathSegment } from "./peblor-paths";
import type { Peblor } from "@pb/contracts";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { peblorSchema, buttonActionSchema, validatePageReferences } from "@pb/contracts";
import type { ZodIssue } from "zod";
import { readPageJsonByPath, PAGE_DATA_DIR, parseJsonSafe } from "./load/peblor-load-io";
import { getCoreConfig } from "../types";
import { validateSlugSegments } from "./load/peblor-validate-slug";
import { discoverAllPages, resolvePagePath } from "./load/peblor-discover-pages";
import { buildPresetsAsync } from "./load/peblor-load-presets";
import {
  getDefinitionsForPageAsync,
  mergeGlobalModulesIntoDefinitionsAsync,
  hydrateSectionFilesBySegmentsAsync,
  resolveDefinitionPresets,
} from "./load/peblor-load-definitions";
import { deepFreezeForDev } from "./load/freeze-page-definitions";
import { PageContentValidationError } from "./peblor-validation-error";

export { readJsonFileSafe, coercePresetMap } from "./load/peblor-load-io";
export { PAGE_DATA_DIR, PAGE_IGNORE } from "./load/peblor-load-io";

export function isPeblor(data: Record<string, unknown>): data is Peblor {
  return (
    Array.isArray(data.sectionOrder) &&
    (data.definitions == null || typeof data.definitions === "object")
  );
}

const knownButtonActions = new Set(buttonActionSchema.options);

function warnUnknownButtonActions(peblor: Peblor, slug: string): void {
  if (process.env.NODE_ENV !== "development") return;
  const definitions = peblor.definitions ?? {};
  for (const [defKey, block] of Object.entries(definitions)) {
    const elements =
      block != null && typeof block === "object" && "elements" in block
        ? (block as { elements?: unknown[] }).elements
        : undefined;
    if (!Array.isArray(elements)) continue;
    for (const el of elements) {
      if (
        el != null &&
        typeof el === "object" &&
        (el as Record<string, unknown>).type === "elementButton"
      ) {
        const action = (el as Record<string, unknown>).action;
        if (typeof action === "string" && !knownButtonActions.has(action as never)) {
          console.warn(
            `[peblor] ${slug}/${defKey}: unknown button action "${action}" — ` +
              `will fail strict validation. Update to a known action or remove.`
          );
        }
      }
    }
  }
}

export type ValidationResult = { success: true } | { success: false; issues: ZodIssue[] };

export function validatePeblor(peblor: Peblor, slug: string): ValidationResult {
  warnUnknownButtonActions(peblor, slug);
  const validationResult = peblorSchema.safeParse(peblor);
  if (validationResult.success) return { success: true };
  return { success: false, issues: validationResult.error.issues };
}

function enforceValidation(slug: string, result: ValidationResult): void {
  if (result.success) return;
  const issues = (result as { success: false; issues: ZodIssue[] }).issues;
  throw new PageContentValidationError(slug, issues);
}

/**
 * Promote presets into definitions for sectionOrder keys that have no explicit definition.
 * Fails with a diagnostic if any sectionOrder key is missing from BOTH definitions and presets.
 *
 * ⚠️ MUTATES `definitions` in-place. Callers must pass a clone if they need to preserve
 * the original definitions map. Both current callers (buildPageForExpansion in shared.ts
 * and loadPeblorInternal) intentionally pass modifiable clones.
 */
function promotePresetsIntoDefinitions(
  definitions: Record<string, PeblorDefinitionBlock>,
  presets: Record<string, PeblorDefinitionBlock>,
  sectionOrder: string[],
  slug: string
): void {
  const missing: string[] = [];
  for (const key of sectionOrder) {
    if (definitions[key] != null) continue;
    if (presets[key] != null) {
      definitions[key] = presets[key];
    } else {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new PageContentValidationError(
      slug,
      missing.map(
        (key): ZodIssue => ({
          code: "custom",
          message: `sectionOrder key "${key}" has no matching definition or preset`,
          path: ["sectionOrder", key],
        })
      )
    );
  }
}

export { promotePresetsIntoDefinitions };

function finalizeLoadedPeblor(
  withSlug: Record<string, unknown>,
  definitions: Record<string, PeblorDefinitionBlock>,
  slug: string
): Peblor | null {
  const peblor = {
    ...withSlug,
    definitions,
  } as Peblor;
  const validation = validatePeblor(peblor, slug);
  enforceValidation(slug, validation);

  // Post-hydration cross-reference check: sectionOrder, bgKey, and triggers must resolve
  const refCheck = validatePageReferences(peblor);
  if (!refCheck.valid) {
    const errors = "errors" in refCheck ? refCheck.errors : [];
    throw new PageContentValidationError(
      slug,
      errors.map((msg, i): ZodIssue => ({ code: "custom", message: msg, path: ["$refs", i] }))
    );
  }

  deepFreezeForDev(peblor.definitions);
  return peblor;
}

async function loadPeblorInternal(slugSegments: string[]): Promise<Peblor | null> {
  validateSlugSegments(slugSegments);
  const slug = slugSegments.join("/");
  const absolutePath = await resolvePagePath(slugSegments);
  if (!absolutePath) return null;
  const withSlug = await readPageJsonByPath(absolutePath, slug);
  if (withSlug == null || !Array.isArray(withSlug.sectionOrder)) return null;

  const sectionOrder = withSlug.sectionOrder as string[];
  const definitions = await getDefinitionsForPageAsync(withSlug, slug);

  // Parallelize section hydration and preset loading — they are independent I/O operations.
  const [hydratedDefinitions, presets] = await Promise.all([
    hydrateSectionFilesBySegmentsAsync(definitions, slugSegments, sectionOrder),
    buildPresetsAsync(withSlug),
  ]);

  // Resolve presets first so module refs inside preset definitions are visible.
  const resolvedForModules = resolveDefinitionPresets(hydratedDefinitions, presets);
  const mergedWithModules = await mergeGlobalModulesIntoDefinitionsAsync(resolvedForModules);

  // Promote sectionOrder preset entries into definitions before the final resolution pass,
  // so they are resolved in the same pass as module definitions.
  promotePresetsIntoDefinitions(mergedWithModules, presets, sectionOrder, slug);

  // Single final resolution covering module defs and promoted preset entries.
  const mergedDefinitions = resolveDefinitionPresets(mergedWithModules, presets);

  return finalizeLoadedPeblor(withSlug, mergedDefinitions, slug);
}

/** Async load with parallel I/O — modules and presets load in parallel: page json, definitions, modules, section files, presets. */
export async function loadPeblorAsync(slug: string): Promise<Peblor | null> {
  if (!isSafePathSegment(slug)) return null;
  return loadPeblorInternal([slug]);
}

/**
 * Async load by slug segments with parallel I/O.
 */
export async function loadPeblorByPathAsync(slugSegments: string[]): Promise<Peblor | null> {
  return loadPeblorInternal(slugSegments);
}

export async function loadPageMeta(
  slugSegments: string[]
): Promise<{ visibility?: string; passwordProtected?: boolean } | null> {
  const pagePath = await resolvePagePath(slugSegments);
  if (!pagePath) return null;
  try {
    const raw = JSON.parse(await fs.promises.readFile(pagePath, "utf8")) as {
      visibility?: string;
      passwordProtected?: boolean;
    };
    return {
      visibility: raw.visibility,
      ...(raw.passwordProtected === true ? { passwordProtected: true } : {}),
    };
  } catch (err) {
    console.warn("[pb-core] Failed to load page meta", slugSegments, err);
    return null;
  }
}

export async function loadPageVisibilityOnly(
  slugSegments: string[]
): Promise<{ visibility?: string; passwordProtected?: boolean; slugSegments: string[] } | null> {
  const meta = await loadPageMeta(slugSegments);
  if (!meta) return null;
  return { ...meta, slugSegments };
}

export type PageMetadata = {
  title: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
  keywords?: string;
  filterConfig?: Record<string, unknown>;
  tags?: Record<string, string[]>;
  passwordProtected?: boolean;
  visibility?: string;
};

export async function getPageMetadataAsync(slug: string): Promise<PageMetadata | null> {
  const segments = slug.split("/").filter(Boolean);
  const pagePath = await resolvePagePath(segments);
  if (!pagePath) return null;
  const raw = await readPageJsonByPath(pagePath, slug);
  if (!raw) return null;
  const tags: Record<string, string[]> | undefined =
    raw.tags && typeof raw.tags === "object" && !Array.isArray(raw.tags)
      ? (raw.tags as Record<string, string[]>)
      : undefined;
  return {
    title: typeof raw.title === "string" ? raw.title : slug,
    ...(typeof raw.description === "string" ? { description: raw.description } : {}),
    ...(typeof raw.ogImage === "string" ? { ogImage: raw.ogImage } : {}),
    ...(typeof raw.canonicalUrl === "string" ? { canonicalUrl: raw.canonicalUrl } : {}),
    ...(typeof raw.robots === "string" ? { robots: raw.robots } : {}),
    ...(typeof raw.keywords === "string" ? { keywords: raw.keywords } : {}),
    ...(raw.filterConfig && typeof raw.filterConfig === "object" && !Array.isArray(raw.filterConfig)
      ? { filterConfig: raw.filterConfig as Record<string, unknown> }
      : {}),
    ...(tags ? { tags } : {}),
    ...(raw.passwordProtected === true ? { passwordProtected: true } : {}),
    ...(typeof raw.visibility === "string" ? { visibility: raw.visibility } : {}),
  };
}

/**
 * Fallback grouping key used when a page has no `assetBaseUrl`.
 *
 * NOTE: this reuses the `assetBaseUrl` field (a CDN/storage URL) as a route-grouping
 * concept (`basePath`). These are semantically different — asset URL tells the CDN where
 * to find files, while basePath groups pages by route prefix. They happen to overlap for
 * this site's convention (pages under "/work" have assetBaseUrl "/work"), but this
 * conflation should be split when the content model adds an explicit `routeGroup` or
 * similar field.
 */
const config = getCoreConfig();
const fallbackSlugBase = config.fallbackSlugBase ?? "/work";

async function getPageSlugBasesUncached(): Promise<{ slug: string; basePath: string }[]> {
  try {
    await fs.promises.access(PAGE_DATA_DIR);
  } catch (err) {
    console.warn("[pb-core] PAGE_DATA_DIR not accessible", PAGE_DATA_DIR, err);
    return [];
  }
  const result: { slug: string; basePath: string }[] = [];
  const pages = await discoverAllPages();
  const records = (
    await Promise.all(
      pages.map(async (page) => {
        try {
          const raw = await fs.promises.readFile(page.contentPath, "utf-8");
          return { page, raw };
        } catch (err) {
          // Tests (and editors) can remove index.json between discovery and read; skip vanished pages.
          if (
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as NodeJS.ErrnoException).code === "ENOENT"
          ) {
            return null;
          }
          throw err;
        }
      })
    )
  ).filter((r): r is { page: (typeof pages)[number]; raw: string } => r !== null);
  for (const { page, raw } of records) {
    if (page.slugSegments.length === 0) continue;
    if (!page.slugSegments.every((segment) => isSafePathSegment(segment))) continue;
    const slug = page.slugSegments.join("/");
    const parsed = parseJsonSafe<Record<string, unknown>>(raw);
    if (!parsed.ok || parsed.data == null || typeof parsed.data !== "object") continue;
    const assetBaseUrl = (parsed.data as { assetBaseUrl?: unknown }).assetBaseUrl;
    // NOTE: assetBaseUrl is reused here as a grouping key (route prefix). This is a known
    // conflation — see fallbackSlugBase docs for details.
    const basePath = typeof assetBaseUrl === "string" ? assetBaseUrl : fallbackSlugBase;
    validateSlugSegments(page.slugSegments);
    result.push({ slug, basePath });
  }
  result.sort((a, b) => a.slug.localeCompare(b.slug));
  return result;
}

const isDev = process.env.NODE_ENV !== "production";
let cachedPageSlugBases: { slug: string; basePath: string }[] | null = null;
let pendingSlugBasesPromise: Promise<{ slug: string; basePath: string }[]> | null = null;

export async function getPageSlugBases(): Promise<{ slug: string; basePath: string }[]> {
  if (!isDev && cachedPageSlugBases !== null) return cachedPageSlugBases;
  if (pendingSlugBasesPromise) return pendingSlugBasesPromise;
  pendingSlugBasesPromise = getPageSlugBasesUncached()
    .then((result) => {
      if (!isDev) cachedPageSlugBases = result;
      return result;
    })
    .finally(() => {
      pendingSlugBasesPromise = null;
    });
  return pendingSlugBasesPromise;
}

export async function getPageSlugsByBase(basePath: string): Promise<string[]> {
  return (await getPageSlugBases()).filter((p) => p.basePath === basePath).map((p) => p.slug);
}

export async function getPageSlugs(): Promise<string[]> {
  return getPageSlugsByBase(fallbackSlugBase);
}
