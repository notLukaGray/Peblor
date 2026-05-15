import fs from "fs";
import { isSafePathSegment } from "./peblor-paths";
import type { Peblor } from "@pb/contracts";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { peblorSchema, buttonActionSchema, validatePageReferences } from "@pb/contracts";
import type { ZodIssue } from "zod";
import { readPageJsonByPath, PAGE_DATA_DIR, parseJsonSafe } from "./load/peblor-load-io";
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

function finalizeLoadedPeblor(
  withSlug: Record<string, unknown>,
  definitions: Record<string, PeblorDefinitionBlock>,
  presets: Record<string, PeblorDefinitionBlock>,
  sectionOrder: string[],
  slug: string
): Peblor | null {
  for (const key of sectionOrder) {
    if (definitions[key] == null && presets[key] != null) {
      definitions[key] = presets[key];
    }
  }
  const resolvedDefinitions = resolveDefinitionPresets(definitions, presets);
  const peblor = {
    ...withSlug,
    definitions: resolvedDefinitions,
  } as Peblor;
  const validation = validatePeblor(peblor, slug);
  enforceValidation(slug, validation);

  // Post-hydration cross-reference check: sectionOrder, bgKey, and triggers must resolve
  const refCheck = validatePageReferences(peblor);
  if (!refCheck.valid) {
    const errors = "errors" in refCheck ? refCheck.errors : [];
    throw new PageContentValidationError(
      slug,
      errors.map((msg): ZodIssue => ({ code: "custom", message: msg, path: [] }))
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
  const [mergedDefinitions, presets] = await Promise.all([
    mergeGlobalModulesIntoDefinitionsAsync(definitions),
    buildPresetsAsync(withSlug),
  ]);
  const resolvedSectionDefinitions = await hydrateSectionFilesBySegmentsAsync(
    mergedDefinitions,
    slugSegments,
    sectionOrder
  );
  return finalizeLoadedPeblor(withSlug, resolvedSectionDefinitions, presets, sectionOrder, slug);
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
  } catch {
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

const DEFAULT_BASE_PATH = "/work";

async function getPageSlugBasesUncached(): Promise<{ slug: string; basePath: string }[]> {
  try {
    await fs.promises.access(PAGE_DATA_DIR);
  } catch {
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
    const basePath = typeof assetBaseUrl === "string" ? assetBaseUrl : DEFAULT_BASE_PATH;
    validateSlugSegments(page.slugSegments);
    result.push({ slug, basePath });
  }
  result.sort((a, b) => a.slug.localeCompare(b.slug));
  return result;
}

const isDev = process.env.NODE_ENV !== "production";
let cachedPageSlugBases: { slug: string; basePath: string }[] | null = null;

export async function getPageSlugBases(): Promise<{ slug: string; basePath: string }[]> {
  if (!isDev && cachedPageSlugBases !== null) return cachedPageSlugBases;
  const result = await getPageSlugBasesUncached();
  if (!isDev) cachedPageSlugBases = result;
  return result;
}

export async function getPageSlugsByBase(basePath: string): Promise<string[]> {
  return (await getPageSlugBases()).filter((p) => p.basePath === basePath).map((p) => p.slug);
}

export async function getPageSlugs(): Promise<string[]> {
  return getPageSlugsByBase(DEFAULT_BASE_PATH);
}
