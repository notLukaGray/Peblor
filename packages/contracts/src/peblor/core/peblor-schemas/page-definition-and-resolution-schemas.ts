import { z } from "zod";
import { PAGE_DENSITY_LEVELS } from "../page-density";
import { bgBlockSchema, backgroundTransitionEffectSchema } from "./background-block-schemas";
import {
  elementBlockSchema,
  presetReferenceSchema,
  sectionDefinitionBlockSchema,
} from "./element-block-schemas";
import { moduleBlockSchema } from "./module-block-schemas";
import { SUPPORTED_CONTRACT_VERSIONS } from "../../../version";
import {
  baseSectionPropsSchema,
  responsiveSectionContentSizeSchema,
  sectionBlockSchema,
} from "./section-block-schemas";
import {
  columnAssignmentsRequiredSchema,
  columnCountSchema,
  columnGapsSchema,
  columnSpanMapSchema,
  columnStylesSchema,
  columnWidthsSchema,
  elementOrderSchema,
  itemLayoutSchema,
  itemStylesSchema,
  responsiveColumnSpanSchema,
  responsiveGridModeSchema,
} from "./section-style-and-column-schemas";

import {
  jsonNullishOptional,
  responsiveBooleanSchema,
  responsiveStringSchema,
  triggerActionSchemaCore,
} from "./schema-primitives";
import { scrollSnapTypeEnum } from "./schema-shared-primitives";
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
  elementOrder: z.array(z.string()).optional(),
  definitions: z.record(z.string(), sectionDefinitionBlockSchema).optional(),
});

const scrollContainerWithElementOrderSchema = baseSectionPropsSchema.extend({
  type: z.literal("scrollContainer"),
  contentWidth: responsiveSectionContentSizeSchema.optional(),
  contentHeight: responsiveSectionContentSizeSchema.optional(),
  elementOrder: z.array(z.string()).optional(),
  definitions: z.record(z.string(), sectionDefinitionBlockSchema).optional(),
});

const sectionColumnDefinitionSchema = baseSectionPropsSchema.extend({
  type: z.literal("sectionColumn"),
  elementOrder: elementOrderSchema,
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

/** Derived once from sectionBlockSchema — single source of truth (no drift). Exported for reuse. */
export const SECTION_TYPE_STRINGS: ReadonlySet<string> = new Set(
  sectionBlockSchema.options.map((s) => s.shape.type.value)
);

export const peblorDefinitionBlockSchema = z.union([
  presetReferenceSchema,
  contentBlockWithElementOrderSchema,
  scrollContainerWithElementOrderSchema,
  sectionColumnDefinitionSchema,
  z.discriminatedUnion("type", [
    ...bgBlockSchema.options,
    moduleBlockSchema,
    ...sectionBlockSchema.options,
    ...elementBlockSchema.options,
  ]),
]);

export const pageScrollConfigSchema = z.object({
  smooth: z.boolean().optional(),
  lockBody: z.boolean().optional(),
  scrollX: z.enum(["hidden", "auto", "visible"]).optional(),
  scrollY: z.enum(["auto", "scroll", "hidden"]).optional(),
  /** @deprecated Use `scrollSnapType` instead. */
  snapType: scrollSnapTypeEnum.optional(),
  scrollSnapType: scrollSnapTypeEnum.optional(),
  scrollPadding: responsiveStringSchema.optional(),
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
    /** Modal IDs to mount in event-driven mode on this page (listens for peblor-modal events). */
    modals: z.array(z.string()).optional(),
    triggers: z.array(z.string()).optional(),
    bgKey: z.string().optional(),
    passwordProtected: z.boolean().optional(),
    assetBaseUrl: z.string().optional(),
    onPageProgress: triggerActionSchemaCore.optional(),
    transitions: z
      .union([backgroundTransitionEffectSchema, z.array(backgroundTransitionEffectSchema)])
      .optional(),
    disableOverlays: z.array(z.string()).optional(),
    scroll: pageScrollConfigSchema.optional(),
    figmaExportDiagnostics: figmaExportDiagnosticsPageFieldSchema.optional(),
    density: pageDensitySchema.optional(),
    forcedTheme: forcedThemeSchema.optional(),
    /** Render strategy for the page. "background-island" isolates the background into its own client island so sections render server-first. */
    renderMode: z.enum(["standard", "background-island"]).optional(),
    /** When true, the page provides its own header/footer via peblor JSON sections rather than the app default. */
    layoutFromJson: z.boolean().optional(),
    sectionGap: jsonNullishOptional(responsiveStringSchema),
    /** Taxonomy tags for this page. Record of category key → value list (e.g. { brand: ["alpha"], ability: ["design"] }). */
    tags: pageTagsSchema.optional(),
    /** Filter configuration — only meaningful on listing pages (work index, shop index, etc.). */
    filterConfig: filterConfigSchema.optional(),
    /** Maps element keys to a source project. Used by the filter pass on listing pages. */
    projectGroups: projectGroupsSchema.optional(),
    /** Page-level analytics config. */
    analytics: analyticsConfigSchema,
    /**
     * Schema version for this page. Stamped by the stamp-contract-version script.
     * When present, enables the migration pipeline to apply forward-upgrades safely.
     * Pages without this field take the identity migration path (no-op).
     */
    contractVersion: z.enum(SUPPORTED_CONTRACT_VERSIONS).optional(),
    /**
     * Extension namespace for forward-compatible, tool-specific data.
     * Replace top-level passthrough with a structured extension field (C-21).
     */
    extensions: jsonNullishOptional(z.record(z.string(), z.unknown())),
  })
  .superRefine((data, ctx) => {
    const TIER_KEYS = ["base", "sm", "md", "lg", "xl", "2xl"] as const;
    const validateElementOrderRefs = (
      defKey: string,
      block: {
        elementOrder?: string[] | { [K in (typeof TIER_KEYS)[number]]?: string[] };
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
        for (const tier of TIER_KEYS) {
          const arr = (eo as Record<string, unknown>)[tier];
          if (Array.isArray(arr)) checkKeys(arr, ["elementOrder", tier]);
        }
      }
    };

    const walk = (value: unknown, defKey: string, pathPrefix: (string | number)[]) => {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          pathPrefix.push(i);
          try {
            walk(value[i], defKey, pathPrefix);
          } finally {
            pathPrefix.pop();
          }
        }
        return;
      }
      if (value == null || typeof value !== "object") return;
      const node = value as Record<string, unknown>;

      // Check elementOrder at this node when it's a direct property.
      if (
        (node.type === "contentBlock" ||
          node.type === "scrollContainer" ||
          node.type === "sectionColumn" ||
          node.type === "elementImageCompare") &&
        "elementOrder" in node
      ) {
        validateElementOrderRefs(
          defKey,
          node as Parameters<typeof validateElementOrderRefs>[1],
          pathPrefix
        );
      }

      // elementGroup and elementInfiniteScroll store elementOrder inside a `section`
      // sub-object (no type field, so the direct check above misses it).
      if (
        (node.type === "elementGroup" || node.type === "elementInfiniteScroll") &&
        node.section != null &&
        typeof node.section === "object" &&
        "elementOrder" in (node.section as Record<string, unknown>)
      ) {
        pathPrefix.push("section");
        try {
          validateElementOrderRefs(
            defKey,
            node.section as Parameters<typeof validateElementOrderRefs>[1],
            pathPrefix
          );
        } finally {
          pathPrefix.pop();
        }
      }

      // elementDrag stores elementOrder inside a `children` sub-object.
      if (
        node.type === "elementDrag" &&
        node.children != null &&
        typeof node.children === "object" &&
        "elementOrder" in (node.children as Record<string, unknown>)
      ) {
        pathPrefix.push("children");
        try {
          validateElementOrderRefs(
            defKey,
            node.children as Parameters<typeof validateElementOrderRefs>[1],
            pathPrefix
          );
        } finally {
          pathPrefix.pop();
        }
      }

      for (const [k, v] of Object.entries(node)) {
        pathPrefix.push(k);
        try {
          walk(v, defKey, pathPrefix);
        } finally {
          pathPrefix.pop();
        }
      }
    };

    // Cross-reference: all known block types with elementOrder must resolve
    // within local (inline) or global definitions.
    for (const [defKey, def] of Object.entries(data.definitions)) {
      walk(def, defKey, ["definitions", defKey]);
    }
  });

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
      if (typeof type !== "string" || !SECTION_TYPE_STRINGS.has(type)) {
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
    onPageProgress: triggerActionSchemaCore.optional(),
    transitions: z
      .union([backgroundTransitionEffectSchema, z.array(backgroundTransitionEffectSchema)])
      .optional(),
    scroll: pageScrollConfigSchema.optional(),
    density: pageDensitySchema.optional(),
    forcedTheme: forcedThemeSchema.optional(),
    layoutFromJson: z.boolean().optional(),
    tags: pageTagsSchema.optional(),
    filterConfig: filterConfigSchema.optional(),
    projectGroups: projectGroupsSchema.optional(),
    disableOverlays: z.array(z.string()).optional(),
    figmaExportDiagnostics: figmaExportDiagnosticsPageFieldSchema.optional(),
    analytics: analyticsConfigSchema,
  })
  .strict();
