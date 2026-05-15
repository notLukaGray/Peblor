import { z } from "zod";
import { PAGE_DENSITY_LEVELS } from "../page-density";
import { bgBlockSchema } from "./background-block-schemas";
import { elementBlockSchema, sectionDefinitionBlockSchema } from "./element-block-schemas";
import { moduleBlockSchema } from "./module-block-schemas";
import { baseSectionPropsSchema, sectionBlockSchema } from "./section-block-schemas";
import {
  columnAssignmentsRequiredSchema,
  columnCountSchema,
  columnGapsSchema,
  columnSpanMapSchema,
  columnStylesSchema,
  columnWidthsSchema,
  cssWidthOrFunctionSchema,
  itemLayoutSchema,
  itemStylesSchema,
  responsiveColumnSpanSchema,
  responsiveGridModeSchema,
} from "./section-style-and-column-schemas";

const sectionContentSizeSchema = z.union([z.enum(["full", "hug"]), cssWidthOrFunctionSchema]);
const responsiveSectionContentSizeSchema = z.union([
  sectionContentSizeSchema,
  z.tuple([sectionContentSizeSchema, sectionContentSizeSchema]),
]);
import {
  responsiveBooleanSchema,
  responsiveStringSchema,
  triggerActionSchema,
} from "./schema-primitives";
import { analyticsConfigSchema } from "../../../analytics/schemas";

const contentBlockWithElementOrderSchema = baseSectionPropsSchema.extend({
  type: z.literal("contentBlock"),
  flexDirection: responsiveStringSchema.optional(),
  flexWrap: responsiveStringSchema.optional(),
  gap: responsiveStringSchema.optional(),
  rowGap: responsiveStringSchema.optional(),
  columnGap: responsiveStringSchema.optional(),
  alignItems: responsiveStringSchema.optional(),
  justifyContent: responsiveStringSchema.optional(),
  contentWidth: responsiveSectionContentSizeSchema.optional(),
  contentHeight: responsiveSectionContentSizeSchema.optional(),
  elementOrder: z.array(z.string()),
  definitions: z.record(z.string(), sectionDefinitionBlockSchema).optional(),
});

const scrollContainerWithElementOrderSchema = baseSectionPropsSchema.extend({
  type: z.literal("scrollContainer"),
  contentWidth: responsiveSectionContentSizeSchema.optional(),
  contentHeight: responsiveSectionContentSizeSchema.optional(),
  elementOrder: z.array(z.string()),
  definitions: z.record(z.string(), sectionDefinitionBlockSchema).optional(),
});

const sectionColumnDefinitionSchema = baseSectionPropsSchema.extend({
  type: z.literal("sectionColumn"),
  elementOrder: z
    .union([
      z.array(z.string()),
      z
        .object({
          mobile: z.array(z.string()).optional(),
          desktop: z.array(z.string()).optional(),
        })
        .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
          message: "At least one of mobile or desktop elementOrder must be provided",
        }),
    ])
    .optional(),
  columns: columnCountSchema,
  columnAssignments: columnAssignmentsRequiredSchema,
  columnWidths: columnWidthsSchema.optional(),
  columnGaps: columnGapsSchema.optional(),
  columnStyles: columnStylesSchema.optional(),
  itemStyles: itemStylesSchema.optional(),
  gridMode: responsiveGridModeSchema,
  gridDebug: responsiveBooleanSchema,
  gridAutoRows: responsiveStringSchema.optional(),
  columnSpan: z.union([columnSpanMapSchema, responsiveColumnSpanSchema]).optional(),
  itemLayout: itemLayoutSchema.optional(),
  contentWidth: responsiveSectionContentSizeSchema.optional(),
  contentHeight: responsiveSectionContentSizeSchema.optional(),
  definitions: z.record(z.string(), sectionDefinitionBlockSchema).optional(),
});

export const peblorDefinitionBlockSchema = z.union([
  moduleBlockSchema,
  bgBlockSchema,
  contentBlockWithElementOrderSchema,
  scrollContainerWithElementOrderSchema,
  sectionColumnDefinitionSchema,
  sectionBlockSchema,
  elementBlockSchema,
]);

export const backgroundTransitionEffectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TIME"),
    id: z.string().min(1),
    from: z.string(),
    to: z.string(),
    duration: z.number().positive(),
    easing: z.string().optional(),
  }),
  z.object({
    type: z.literal("TRIGGER"),
    id: z.string().min(1),
    from: z.string(),
    to: z.string(),
    duration: z.number().positive(),
    easing: z.string().optional(),
  }),
  z.object({
    type: z.literal("SCROLL"),
    id: z.string().min(1),
    from: z.string(),
    to: z.string(),
    source: z.enum(["page", "trigger"]).optional(),
    progress: z.number().min(0).max(1).optional(),
    progressRange: z
      .object({
        start: z.number().min(0).max(1),
        end: z.number().min(0).max(1),
      })
      .refine((range) => range.start < range.end, {
        message: "progressRange.start must be less than progressRange.end",
      })
      .optional(),
  }),
]);

export const pageScrollConfigSchema = z.object({
  smooth: z.boolean().optional(),
  lockBody: z.boolean().optional(),
  overflowX: z.enum(["hidden", "auto", "visible"]).optional(),
  overflowY: z.enum(["auto", "scroll", "hidden"]).optional(),
  snapType: z
    .enum(["none", "x mandatory", "y mandatory", "both mandatory", "x proximity", "y proximity"])
    .optional(),
});

export const pageDensitySchema = z.enum(PAGE_DENSITY_LEVELS);
export const forcedThemeSchema = z.enum(["light", "dark"]);

/** Optional parity / diagnostics blob appended by the Figma plugin “Copy page JSON” flow. */
export const figmaExportDiagnosticsPageFieldSchema = z.object({
  version: z.literal(1),
  converted: z.number(),
  fallback: z.number(),
  dropped: z.number(),
  topFallbackReasons: z.array(z.object({ code: z.string(), count: z.number() })),
  dropReasons: z.record(z.string(), z.number()).optional(),
  highRiskWarnings: z.array(z.object({ category: z.string(), count: z.number() })).optional(),
});
export type FigmaExportDiagnosticsPageField = z.infer<typeof figmaExportDiagnosticsPageFieldSchema>;

/** Generic taxonomy tags: record of category key → value list. Used for filtering on listing pages. */
export const pageTagsSchema = z.record(z.string(), z.array(z.string()));
export const knownPageTagsConfigSchema = z
  .object({
    knownTags: z.record(z.string(), z.array(z.string())),
  })
  .passthrough();

/** Filter dimension definition for listing pages (work index, shop index, etc.). */
export const filterCategorySchema = z.object({
  key: z.string(),
  label: z.string(),
  multiSelect: z.boolean().optional(),
});

export const filterConfigSchema = z.object({
  categories: z.array(filterCategorySchema),
});

/**
 * Project groups link a set of element keys to a project page. Used by the filter pass
 * to drop all elements belonging to a project whose tags don't match active filters.
 * Keyed by an arbitrary group identifier (typically the project shortname).
 */
export const projectGroupSchema = z.object({
  projectSlug: z.string().min(1),
  elements: z.array(z.string().min(1)).min(1),
});

export const projectGroupsSchema = z.record(z.string(), projectGroupSchema);

export type PageTags = z.infer<typeof pageTagsSchema>;
export type KnownPageTagsConfig = z.infer<typeof knownPageTagsConfigSchema>;
export type FilterCategory = z.infer<typeof filterCategorySchema>;
export type FilterConfig = z.infer<typeof filterConfigSchema>;
export type ProjectGroup = z.infer<typeof projectGroupSchema>;
export type ProjectGroupsMap = z.infer<typeof projectGroupsSchema>;

export type PageTagValidationIssue = {
  path: Array<string | number>;
  message: string;
};

function listAllowedValues(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "none configured";
}

function hasKnownTagCategory(config: KnownPageTagsConfig, category: string): boolean {
  return Object.prototype.hasOwnProperty.call(config.knownTags, category);
}

export function validateKnownPageTags(
  tags: PageTags | undefined,
  config: KnownPageTagsConfig
): PageTagValidationIssue[] {
  if (!tags) return [];

  const issues: PageTagValidationIssue[] = [];
  const knownCategoryKeys = Object.keys(config.knownTags);

  for (const [category, values] of Object.entries(tags)) {
    if (!hasKnownTagCategory(config, category)) {
      issues.push({
        path: ["tags", category],
        message: `Unknown tag category "${category}". Known categories: ${listAllowedValues(knownCategoryKeys)}.`,
      });
      continue;
    }

    const knownValues = config.knownTags[category] ?? [];
    const knownValueSet = new Set(knownValues);
    values.forEach((value, index) => {
      if (knownValueSet.has(value)) return;
      issues.push({
        path: ["tags", category, index],
        message: `Unknown tag "${value}" for category "${category}". Known tags: ${listAllowedValues(knownValues)}.`,
      });
    });
  }

  return issues;
}

export function validateKnownFilterCategories(
  filterConfig: FilterConfig | undefined,
  config: KnownPageTagsConfig
): PageTagValidationIssue[] {
  if (!filterConfig) return [];

  const knownCategoryKeys = Object.keys(config.knownTags);
  return filterConfig.categories
    .map((category, index) => ({
      category,
      index,
    }))
    .filter(({ category }) => !hasKnownTagCategory(config, category.key))
    .map(({ category, index }) => ({
      path: ["filterConfig", "categories", index, "key"],
      message: `Unknown filter category "${category.key}". Known categories: ${listAllowedValues(knownCategoryKeys)}.`,
    }));
}

export function validateProjectGroups(
  groups: ProjectGroupsMap | undefined,
  knownPageSlugs: ReadonlySet<string>
): PageTagValidationIssue[] {
  if (!groups) return [];

  const issues: PageTagValidationIssue[] = [];
  for (const [groupKey, group] of Object.entries(groups)) {
    if (!knownPageSlugs.has(group.projectSlug)) {
      issues.push({
        path: ["projectGroups", groupKey, "projectSlug"],
        message: `projectSlug "${group.projectSlug}" does not match any known page.`,
      });
    }
    const seen = new Set<string>();
    group.elements.forEach((element, index) => {
      if (seen.has(element)) {
        issues.push({
          path: ["projectGroups", groupKey, "elements", index],
          message: `Duplicate element key "${element}" in project group "${groupKey}".`,
        });
      }
      seen.add(element);
    });
  }
  return issues;
}

export const pageVisibilitySchema = z.enum(["public", "protected", "unlisted"]);

export const peblorSchema = z
  .object({
    /** Injected at load time from the folder path — omit from JSON files. */
    slug: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    /** Canonical URL override. Useful when the same content is reachable at multiple slugs. */
    canonicalUrl: z.string().optional(),
    /** Robots meta directive e.g. "noindex, nofollow". Defaults to indexable when omitted. */
    robots: z.string().optional(),
    /** Comma-separated keyword hints for SEO. */
    keywords: z.string().optional(),
    /** BCP 47 language tag for the page (e.g. "en", "en-US", "fr"). Rendered as the html lang attribute. */
    lang: z.string().optional(),
    /** JSON-LD structured data blob. Rendered as a <script type="application/ld+json"> tag. */
    structuredData: z.unknown().optional(),
    /** Page visibility: "public" (default), "protected" (password-gated), "unlisted" (not in sitemap/discovery). */
    visibility: pageVisibilitySchema.optional(),
    definitions: z.record(z.string(), peblorDefinitionBlockSchema),
    sectionOrder: z.array(z.string()),
    preset: z.record(z.string(), peblorDefinitionBlockSchema).optional(),
    presets: z.array(z.string()).optional(),
    triggers: z.array(z.string()).optional(),
    bgKey: z.string().optional(),
    passwordProtected: z.boolean().optional(),
    assetBaseUrl: z.string().optional(),
    onPageProgress: triggerActionSchema.optional(),
    transitions: z
      .union([backgroundTransitionEffectSchema, z.array(backgroundTransitionEffectSchema)])
      .optional(),
    disableOverlays: z.array(z.string()).optional(),
    scroll: pageScrollConfigSchema.optional(),
    figmaExportDiagnostics: figmaExportDiagnosticsPageFieldSchema.optional(),
    density: pageDensitySchema.optional(),
    forcedTheme: forcedThemeSchema.optional(),
    /** Taxonomy tags for this page. Record of category key → value list (e.g. { brand: ["alpha"], ability: ["design"] }). */
    tags: pageTagsSchema.optional(),
    /** Filter configuration — only meaningful on listing pages (work index, shop index, etc.). */
    filterConfig: filterConfigSchema.optional(),
    /** Maps element keys to a source project. Used by the filter pass on listing pages. */
    projectGroups: projectGroupsSchema.optional(),
    /** Page-level analytics config. */
    analytics: analyticsConfigSchema,
  })
  .superRefine((data, ctx) => {
    const validateElementOrderRefs = (
      defKey: string,
      block: {
        elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
        definitions?: Record<string, unknown>;
      },
      pathPrefix: (string | number)[]
    ) => {
      const eo = block.elementOrder;
      if (eo == null) return;
      const localDefs = block.definitions ?? {};
      const globalDefs = data.definitions;
      const checkKeys = (keys: string[], pathSuffix: (string | number)[]) => {
        for (let i = 0; i < keys.length; i++) {
          const ek = keys[i];
          if (!ek) continue;
          if (!localDefs[ek] && !globalDefs[ek]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [...pathPrefix, ...pathSuffix, i],
              message: `elementOrder key "${ek}" in definition "${defKey}" does not resolve to any element definition`,
            });
          }
        }
      };
      if (Array.isArray(eo)) {
        checkKeys(eo, ["elementOrder"]);
      } else if (eo && typeof eo === "object") {
        if (Array.isArray(eo.mobile)) checkKeys(eo.mobile, ["elementOrder", "mobile"]);
        if (Array.isArray(eo.desktop)) checkKeys(eo.desktop, ["elementOrder", "desktop"]);
      }
    };

    const walk = (value: unknown, defKey: string, pathPrefix: (string | number)[]) => {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) walk(value[i], defKey, [...pathPrefix, i]);
        return;
      }
      if (value == null || typeof value !== "object") return;
      const node = value as Record<string, unknown>;
      if (
        (node.type === "contentBlock" ||
          node.type === "scrollContainer" ||
          node.type === "sectionColumn" ||
          node.type === "elementGroup" ||
          node.type === "elementInfiniteScroll" ||
          node.type === "elementDrag" ||
          node.type === "elementImageCompare") &&
        "elementOrder" in node
      ) {
        validateElementOrderRefs(
          defKey,
          node as {
            elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
            definitions?: Record<string, unknown>;
          },
          pathPrefix
        );
      }
      for (const [k, v] of Object.entries(node)) walk(v, defKey, [...pathPrefix, k]);
    };

    // Cross-reference: all known block types with elementOrder must resolve
    // within local (inline) or global definitions.
    for (const [defKey, def] of Object.entries(data.definitions)) {
      walk(def, defKey, ["definitions", defKey]);
    }
  })
  .passthrough();

/**
 * Post-hydration cross-reference validation. Call after section files, modules, and presets
 * have been loaded into `definitions`. Checks that sectionOrder, bgKey, and trigger keys all
 * resolve to valid definitions.
 */
export function validatePageReferences(page: {
  sectionOrder?: string[];
  bgKey?: string;
  triggers?: string[];
  definitions: Record<string, unknown>;
}): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];
  const definitions = page.definitions ?? {};
  const SECTION_TYPES = new Set([
    "divider",
    "contentBlock",
    "scrollContainer",
    "sectionColumn",
    "sectionTrigger",
    "formBlock",
    "revealSection",
  ]);

  // bgKey
  if (page.bgKey) {
    if (!definitions[page.bgKey]) {
      errors.push(`bgKey "${page.bgKey}" does not match any definition key`);
    }
  }

  // sectionOrder
  if (page.sectionOrder) {
    for (const key of page.sectionOrder) {
      if (!key) continue;
      const def = definitions[key];
      if (!def) {
        errors.push(`sectionOrder key "${key}" does not match any definition`);
        continue;
      }
      const type = (def as { type?: string }).type;
      if (typeof type !== "string" || !SECTION_TYPES.has(type)) {
        errors.push(
          `sectionOrder key "${key}" has type "${type ?? "unknown"}" which is not a valid section type`
        );
      }
    }
  }

  // triggers
  if (page.triggers) {
    for (const key of page.triggers) {
      if (!key) continue;
      if (!definitions[key]) {
        errors.push(`trigger key "${key}" does not match any definition`);
      }
    }
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true };
}

export const resolvedPageSchema = z
  .object({
    slug: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalUrl: z.string().optional(),
    robots: z.string().optional(),
    keywords: z.string().optional(),
    lang: z.string().optional(),
    structuredData: z.unknown().optional(),
    visibility: pageVisibilitySchema.optional(),
    bg: bgBlockSchema.optional(),
    sections: z.array(sectionBlockSchema).optional(),
    passwordProtected: z.boolean().optional(),
    assetBaseUrl: z.string().optional(),
    onPageProgress: triggerActionSchema.optional(),
    transitions: z
      .union([backgroundTransitionEffectSchema, z.array(backgroundTransitionEffectSchema)])
      .optional(),
    scroll: pageScrollConfigSchema.optional(),
    density: pageDensitySchema.optional(),
    forcedTheme: forcedThemeSchema.optional(),
    tags: pageTagsSchema.optional(),
    filterConfig: filterConfigSchema.optional(),
    projectGroups: projectGroupsSchema.optional(),
    disableOverlays: z.array(z.string()).optional(),
    figmaExportDiagnostics: figmaExportDiagnosticsPageFieldSchema.optional(),
    analytics: analyticsConfigSchema,
  })
  .strict();
