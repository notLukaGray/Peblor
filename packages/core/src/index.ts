import fs from "node:fs";
import path from "node:path";
import {
  CONTRACT_VERSION,
  type FigmaExportDiagnosticsPageField,
  peblorSchema,
  type BackgroundTransitionEffect,
  type Peblor,
  type PeblorDefinitionBlock,
  type PageDensity,
  type PageScrollConfig,
  type PageTags,
  type ProjectGroupsMap,
  type ResolvedPage,
  type SectionBlock,
  type TriggerAction,
  type bgBlock,
} from "@pb/contracts";
import { filterPageByActiveTags } from "./internal/peblor-filter-pass";
import { getAssetBaseUrl } from "./internal/peblor-blocks";
import { expandPeblor } from "./internal/peblor-expand";
import { resolvePresets } from "./internal/peblor-presets";
import { applyBuilderElementDefaultsToSections } from "./internal/peblor-apply-element-defaults";
import { resolveEntranceMotionsIntoSections } from "./internal/peblor-resolve-entrance-motions";
import { getCoreGlobals } from "./lib/globals";
import {
  buildRawBgDefinitions,
  resolvePeblorAssetsOnServer,
  type ResolvePeblorAssetsResult,
} from "./internal/peblor-resolve-assets-server";
import {
  loadPeblorByPathAsync,
  loadPageMeta,
  loadPageVisibilityOnly,
  getPageMetadataAsync,
  getPageSlugBases,
  getPageSlugs,
  getPageSlugsByBase,
} from "./internal/peblor-load";
export type { PageMetadata } from "./internal/peblor-load";
export { PageContentValidationError } from "./internal/peblor-validation-error";
export { loadPageMeta, loadPageVisibilityOnly, getPageMetadataAsync };
import {
  discoverAllPages,
  resolvePagePath,
  type PageEntry,
} from "./internal/load/peblor-discover-pages";
import { loadModal, type ModalBuilder } from "./internal/modal-load";
import type { ModalProps } from "./internal/modal-types";
import { loadOverlaySections } from "./internal/overlay/peblor-overlay-loader";
import { isSafePathSegment } from "./internal/peblor-paths";
import {
  applyPbDefaultTextAlign,
  getPeblorHostConfig,
  getPbBuilderDefaults,
  getPbContentGuidelines,
  setPeblorHostConfig,
  type PeblorHostConfig,
} from "./internal/adapters/host-config";
import {
  toPbContentGuidelines,
  type PbBuilderDefaults,
} from "./internal/defaults/pb-builder-defaults";
import type { PbContentGuidelines } from "./internal/defaults/pb-guidelines-expand";
import {
  resolveBreakpointDefinitions,
  type BreakpointDefinitions,
} from "./internal/defaults/pb-breakpoint-defaults";
import { MOBILE_UA_REGEX } from "./lib/shared-utils";

export type PeblorDiagnostic = {
  code: string;
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
  contractVersion: string;
};

// Backward-compatible alias for existing in-repo scripts.
export type PbCoreDiagnostic = PeblorDiagnostic;

export type CoreConfig = {
  builderDefaults?: PbBuilderDefaults;
  contentGuidelines?: PbContentGuidelines;
  assetBaseUrl?: string;
  defaultSection?: Partial<SectionBlock>;
  defaultElement?: Record<string, unknown>;
};

let coreConfig: CoreConfig = {};

export function setCoreConfig(config: CoreConfig): void {
  coreConfig = { ...coreConfig, ...config };

  const hostConfigPatch: Partial<PeblorHostConfig> = {};
  if (config.builderDefaults) {
    hostConfigPatch.pbBuilderDefaults = config.builderDefaults;
    if (config.contentGuidelines == null) {
      hostConfigPatch.pbContentGuidelines = toPbContentGuidelines(config.builderDefaults);
    }
  }
  if (config.contentGuidelines) {
    hostConfigPatch.pbContentGuidelines = config.contentGuidelines;
  }
  if (Object.keys(hostConfigPatch).length > 0) {
    setPeblorHostConfig(hostConfigPatch);
  }
}

export function getCoreConfig(): CoreConfig {
  return { ...coreConfig };
}

export type ValidatePageResult = {
  valid: boolean;
  diagnostics: PeblorDiagnostic[];
  page: Peblor | null;
};

export type ExpandPageResult = {
  bg: bgBlock | null;
  sections: SectionBlock[];
};

export type LoadPageResult = {
  filePath: string;
  raw: unknown;
  validate: ValidatePageResult;
};

export type ResolveAssetsOptions = {
  isMobile?: boolean;
  assetBaseUrl?: string;
  breakpoints?: Partial<BreakpointDefinitions>;
  viewportWidthPx?: number;
};

export type ResolveAssetsResult = ResolvePeblorAssetsResult & {
  transitions: BackgroundTransitionEffect[];
  assetBase: string;
};

export type MigrationResult = {
  page: unknown;
  diagnostics: PeblorDiagnostic[];
  fromVersion: string;
  toVersion: string;
  appliedTransforms: string[];
};

export type GetPeblorPropsOptions = {
  assetBaseUrl?: string;
  transformSections?: (sections: SectionBlock[]) => SectionBlock[];
  isMobile?: boolean;
  breakpoints?: Partial<BreakpointDefinitions>;
  viewportWidthPx?: number;
  /** Active filters from query string. Applied via projectGroups before asset resolution. */
  activeFilters?: PageTags;
};

export type GetModalPropsOptions = {
  transformSections?: (sections: SectionBlock[]) => SectionBlock[];
  isMobile?: boolean;
  breakpoints?: Partial<BreakpointDefinitions>;
  viewportWidthPx?: number;
};

export type GetPageOptions = {
  isMobile?: boolean;
  breakpoints?: Partial<BreakpointDefinitions>;
  viewportWidthPx?: number;
};

export type PeblorPageClientPage = {
  slug: string;
  title: string;
  onPageProgress?: TriggerAction;
  transitions?: BackgroundTransitionEffect | BackgroundTransitionEffect[];
  scroll?: PageScrollConfig;
  density?: PageDensity;
  forcedTheme?: "light" | "dark";
  figmaExportDiagnostics?: FigmaExportDiagnosticsPageField;
};

export type PeblorPageProps = {
  page: PeblorPageClientPage;
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  bgDefinitions: Record<string, bgBlock>;
  serverIsMobile?: boolean;
  overlaySections?: SectionBlock[];
};

export type ResolvedPageWithDefinitions = ResolvedPage & {
  definitions?: Record<string, PeblorDefinitionBlock>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function mapPath(pathParts: Array<string | number>): string {
  if (pathParts.length === 0) return "$";
  return `$${pathParts
    .map((part) => (typeof part === "number" ? `[${part}]` : `.${part}`))
    .join("")}`;
}

function readValueAtPath(root: unknown, pathParts: Array<string | number>): unknown {
  let current: unknown = root;
  for (const part of pathParts) {
    if (current == null) return undefined;
    if (typeof part === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[part];
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stringifyDiagnosticValue(value: unknown): string {
  const MAX_LEN = 240;
  const clip = (text: string): string =>
    text.length > MAX_LEN ? `${text.slice(0, MAX_LEN - 1)}…` : text;
  if (value === undefined) return "undefined";
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return clip(String(value));
    return clip(json);
  } catch {
    return clip(String(value));
  }
}

function toDiagnostics(error: unknown, source?: unknown): PeblorDiagnostic[] {
  if (!error || typeof error !== "object") {
    return [
      {
        code: "PB_UNKNOWN_ERROR",
        severity: "error",
        path: "$",
        message: String(error),
        contractVersion: CONTRACT_VERSION,
      },
    ];
  }

  const maybeIssues = (error as { issues?: unknown }).issues;
  if (!Array.isArray(maybeIssues)) {
    return [
      {
        code: "PB_VALIDATION_ERROR",
        severity: "error",
        path: "$",
        message: "Validation failed with an unknown error shape.",
        contractVersion: CONTRACT_VERSION,
      },
    ];
  }

  return maybeIssues.map((issue) => {
    const rec = issue as { code?: unknown; message?: unknown; path?: unknown };
    const pathParts = Array.isArray(rec.path)
      ? rec.path.filter(
          (part): part is string | number => typeof part === "string" || typeof part === "number"
        )
      : [];
    const issuePath = mapPath(pathParts);
    const currentValue = source === undefined ? undefined : readValueAtPath(source, pathParts);
    const baseMessage = typeof rec.message === "string" ? rec.message : "Schema validation issue.";
    const message =
      source === undefined
        ? baseMessage
        : `${baseMessage} (received: ${stringifyDiagnosticValue(currentValue)})`;

    return {
      code: typeof rec.code === "string" ? rec.code : "PB_SCHEMA_ISSUE",
      severity: "error" as const,
      path: issuePath,
      message,
      contractVersion: CONTRACT_VERSION,
    };
  });
}

function buildPageForExpansion(page: Peblor): Peblor {
  const definitions = {
    ...(page.definitions as Record<string, PeblorDefinitionBlock>),
  };
  const inlinePresets = isRecord(page.preset)
    ? (page.preset as Record<string, PeblorDefinitionBlock>)
    : {};

  for (const sectionKey of page.sectionOrder) {
    if (definitions[sectionKey] == null && inlinePresets[sectionKey] != null) {
      definitions[sectionKey] = inlinePresets[sectionKey];
    }
  }

  const resolvedDefinitions: Record<string, PeblorDefinitionBlock> = {};
  for (const [key, block] of Object.entries(definitions)) {
    resolvedDefinitions[key] = resolvePresets(block, inlinePresets);
  }

  return {
    ...page,
    definitions: resolvedDefinitions,
  };
}

function resolveAssetBase(page: Peblor, options?: ResolveAssetsOptions): string {
  if (options?.assetBaseUrl) return options.assetBaseUrl;
  if (coreConfig.assetBaseUrl) return coreConfig.assetBaseUrl;
  return getAssetBaseUrl(page as ResolvedPage);
}

function resolveViewportWidthForExpansion(options?: GetPageOptions): number | undefined {
  if (typeof options?.viewportWidthPx === "number" && Number.isFinite(options.viewportWidthPx)) {
    return options.viewportWidthPx;
  }
  if (options?.isMobile === undefined) return undefined;
  const breakpoints = resolveBreakpointDefinitions(options.breakpoints);
  return options.isMobile ? breakpoints.desktop - 1 : breakpoints.desktop;
}

function resolveViewportWidthForAssetSizing(options?: GetPeblorPropsOptions): number | undefined {
  if (typeof options?.viewportWidthPx === "number" && Number.isFinite(options.viewportWidthPx)) {
    return options.viewportWidthPx;
  }
  if (options?.isMobile === undefined) return undefined;
  const breakpoints = resolveBreakpointDefinitions(options.breakpoints);
  if (options.isMobile) return breakpoints.desktop - 1;
  const { imageDefaultWidth } = getCoreGlobals();
  return imageDefaultWidth;
}

function parseSlugSegments(slug: string): string[] | null {
  if (typeof slug !== "string" || slug.length === 0) return null;
  const segments = slug.split("/");
  for (const seg of segments) {
    if (!isSafePathSegment(seg)) return null;
  }
  return segments;
}

function stripPageForClient(page: ResolvedPageWithDefinitions): PeblorPageClientPage {
  const stripped: PeblorPageClientPage = {
    slug: page.slug ?? "",
    title: page.title,
  };
  if (page.onPageProgress != null) stripped.onPageProgress = page.onPageProgress as TriggerAction;
  if (page.transitions != null) {
    stripped.transitions = page.transitions as
      | BackgroundTransitionEffect
      | BackgroundTransitionEffect[];
  }
  if (page.scroll != null) stripped.scroll = page.scroll as PageScrollConfig;
  if (page.density != null) stripped.density = page.density as PageDensity;
  if (page.forcedTheme === "light" || page.forcedTheme === "dark") {
    stripped.forcedTheme = page.forcedTheme;
  }
  if (
    (page as { figmaExportDiagnostics?: FigmaExportDiagnosticsPageField }).figmaExportDiagnostics !=
    null
  ) {
    stripped.figmaExportDiagnostics = (
      page as { figmaExportDiagnostics?: FigmaExportDiagnosticsPageField }
    ).figmaExportDiagnostics;
  }
  return stripped;
}

export function validatePage(input: unknown): ValidatePageResult {
  const parsed = peblorSchema.safeParse(input);
  if (parsed.success) {
    return {
      valid: true,
      diagnostics: [],
      page: parsed.data,
    };
  }

  return {
    valid: false,
    diagnostics: toDiagnostics(parsed.error, input),
    page: null,
  };
}

export async function loadPage(filePath: string): Promise<LoadPageResult> {
  const baseDir = await fs.promises.realpath(path.resolve(process.cwd()));
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
  const resolved = path.resolve(absolute);

  const rel = path.relative(baseDir, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`loadPage path must stay within cwd: ${filePath}`);
  }

  const realResolved = await fs.promises.realpath(resolved);
  const realRel = path.relative(baseDir, realResolved);
  if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
    throw new Error(`loadPage path must stay within cwd (symlink escape): ${filePath}`);
  }

  const rawContent = await fs.promises.readFile(realResolved, "utf8");
  const raw = JSON.parse(rawContent) as unknown;

  return {
    filePath: realResolved,
    raw,
    validate: validatePage(raw),
  };
}

export function expandPage(page: Peblor): ExpandPageResult {
  const preparedPage = buildPageForExpansion(page);
  const assetBase = resolveAssetBase(preparedPage);
  const expanded = expandPeblor(preparedPage, { assetBase });
  const withDefaults = applyBuilderElementDefaultsToSections(expanded.sections);
  const withEntranceMotions = resolveEntranceMotionsIntoSections(withDefaults);

  return {
    bg: expanded.bg,
    sections: withEntranceMotions,
  };
}

export function resolveAssets(page: Peblor, options?: ResolveAssetsOptions): ResolveAssetsResult {
  const preparedPage = buildPageForExpansion(page);
  const assetBase = resolveAssetBase(preparedPage, options);
  const viewportWidthPx = resolveViewportWidthForExpansion(options);

  const expanded = expandPeblor(preparedPage, {
    assetBase,
    breakpoints: options?.breakpoints,
    ...(viewportWidthPx !== undefined ? { viewportWidthPx } : {}),
  });
  const withDefaults = applyBuilderElementDefaultsToSections(expanded.sections);
  const withEntranceMotions = resolveEntranceMotionsIntoSections(withDefaults);

  const bgDefinitionsRaw = buildRawBgDefinitions(
    preparedPage.definitions as Record<string, PeblorDefinitionBlock> | undefined
  );
  const transitionsArray = preparedPage.transitions
    ? Array.isArray(preparedPage.transitions)
      ? preparedPage.transitions
      : [preparedPage.transitions]
    : [];

  const resolved = resolvePeblorAssetsOnServer(
    expanded.bg,
    withEntranceMotions,
    bgDefinitionsRaw,
    transitionsArray,
    { isMobile: options?.isMobile, viewportWidthPx: options?.viewportWidthPx }
  );

  return {
    ...resolved,
    transitions: transitionsArray,
    assetBase,
  };
}

function toRecordClone(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return structuredClone(value) as Record<string, unknown>;
}

export function migratePage(
  page: unknown,
  fromVersion: string,
  toVersion: string
): MigrationResult {
  const diagnostics: PeblorDiagnostic[] = [];
  const appliedTransforms: string[] = [];

  if (toVersion !== CONTRACT_VERSION) {
    return {
      page,
      diagnostics: [
        {
          code: "PB_MIGRATE_UNSUPPORTED_TARGET",
          severity: "error",
          path: "$",
          message: `Unsupported migration target: ${toVersion}`,
          contractVersion: CONTRACT_VERSION,
        },
      ],
      fromVersion,
      toVersion,
      appliedTransforms,
    };
  }

  if (fromVersion === toVersion) {
    appliedTransforms.push("identity");
    return {
      page,
      diagnostics,
      fromVersion,
      toVersion,
      appliedTransforms,
    };
  }

  const migratedRecord = toRecordClone(page);
  if (migratedRecord == null) {
    return {
      page,
      diagnostics: [
        {
          code: "PB_MIGRATE_INVALID_INPUT",
          severity: "error",
          path: "$",
          message: "Migration input must be a JSON object.",
          contractVersion: CONTRACT_VERSION,
        },
      ],
      fromVersion,
      toVersion,
      appliedTransforms,
    };
  }

  if (fromVersion === "0.5.0-v0" || fromVersion.startsWith("0.")) {
    migratedRecord.contractVersion = CONTRACT_VERSION;
    if (typeof migratedRecord.assetBaseUrl !== "string" && coreConfig.assetBaseUrl) {
      migratedRecord.assetBaseUrl = coreConfig.assetBaseUrl;
      appliedTransforms.push("inject-asset-base-url");
    }
    appliedTransforms.push("stamp-contract-version");

    const validation = validatePage(migratedRecord);
    diagnostics.push(...validation.diagnostics);

    if (!validation.valid) {
      diagnostics.push({
        code: "PB_MIGRATE_OUTPUT_INVALID",
        severity: "warning",
        path: "$",
        message: "Migration completed but output is not fully valid against @pb/contracts 1.0.0.",
        contractVersion: CONTRACT_VERSION,
      });
    }

    return {
      page: migratedRecord,
      diagnostics,
      fromVersion,
      toVersion,
      appliedTransforms,
    };
  }

  return {
    page,
    diagnostics: [
      {
        code: "PB_MIGRATE_PATH_NOT_FOUND",
        severity: "error",
        path: "$",
        message: `No migration path available from ${fromVersion} to ${toVersion}.`,
        contractVersion: CONTRACT_VERSION,
      },
    ],
    fromVersion,
    toVersion,
    appliedTransforms,
  };
}

export async function getPageAsync(
  slug: string,
  options?: GetPageOptions
): Promise<ResolvedPageWithDefinitions | null> {
  const segments = parseSlugSegments(slug);
  if (!segments) return null;

  const page = await loadPeblorByPathAsync(segments);
  if (!page) return null;

  const assetBase = getAssetBaseUrl(page as ResolvedPage);
  const viewportWidthPx = resolveViewportWidthForExpansion(options);
  const expanded = expandPeblor(page, {
    assetBase,
    breakpoints: options?.breakpoints,
    ...(viewportWidthPx !== undefined ? { viewportWidthPx } : {}),
  });

  return {
    ...(page as ResolvedPage),
    bg: expanded.bg,
    sections: expanded.sections,
    definitions: page.definitions,
  } as ResolvedPageWithDefinitions;
}

export async function getPageVisibilityAsync(slug: string): Promise<string | null> {
  const segments = parseSlugSegments(slug);
  if (!segments) return null;
  const visibilityResult = await loadPageVisibilityOnly(segments);
  return visibilityResult?.visibility ?? null;
}

export async function getModalProps(
  id: string,
  options?: GetModalPropsOptions
): Promise<ModalProps | null> {
  const modal = await loadModal(id);
  if (!modal) return null;

  const minimalPage: Peblor = {
    slug: modal.id,
    title: modal.title ?? "",
    sectionOrder: modal.sectionOrder,
    definitions: modal.definitions,
    bgKey: "_none",
  };

  const modalAssetBase = getAssetBaseUrl(null);
  const viewportWidthPx = resolveViewportWidthForExpansion(options);
  const expanded = expandPeblor(minimalPage, {
    assetBase: modalAssetBase,
    breakpoints: options?.breakpoints,
    ...(viewportWidthPx !== undefined ? { viewportWidthPx } : {}),
  });
  const bgDefinitionsRaw = buildRawBgDefinitions(modal.definitions);

  const resolved = resolvePeblorAssetsOnServer(
    null,
    expanded.sections.map((section) => ({ ...section }) as SectionBlock),
    bgDefinitionsRaw,
    [],
    { isMobile: options?.isMobile, viewportWidthPx: options?.viewportWidthPx }
  );

  let resolvedSections = resolved.resolvedSections;
  if (options?.transformSections) {
    resolvedSections = options.transformSections(resolvedSections);
  }
  resolvedSections = applyBuilderElementDefaultsToSections(resolvedSections);
  resolvedSections = resolveEntranceMotionsIntoSections(resolvedSections);

  return {
    id: modal.id,
    title: modal.title,
    resolvedSections,
    transition: modal.transition,
    ...(modal.motion !== undefined ? { motion: modal.motion } : {}),
    ...(modal.effects !== undefined ? { effects: modal.effects } : {}),
  };
}

export async function getPeblorPropsFromPage(
  page: ResolvedPageWithDefinitions | null,
  slug: string,
  options?: GetPeblorPropsOptions
): Promise<PeblorPageProps | null> {
  if (!page) return null;

  const assetBase = getAssetBaseUrl(page);
  if (options?.assetBaseUrl != null && assetBase !== options.assetBaseUrl) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[peblor] "${slug}": requested assetBaseUrl "${options.assetBaseUrl}" ` +
          `doesn't match page's "${assetBase}". Using page's asset base URL.`
      );
    }
  }

  const resolvedBg: bgBlock | null = page.bg ? ({ ...page.bg } as bgBlock) : null;
  let resolvedSections: SectionBlock[] = (page.sections ?? []).map(
    (section) => ({ ...section }) as SectionBlock
  );

  const projectGroups = (page as { projectGroups?: ProjectGroupsMap }).projectGroups;
  if (options?.activeFilters && projectGroups) {
    const projectSlugs = Array.from(
      new Set(Object.values(projectGroups).map((g) => g.projectSlug))
    );
    const tagsBySlug = new Map<string, PageTags | undefined>();
    await Promise.all(
      projectSlugs.map(async (s) => {
        const meta = await getPageMetadataAsync(s);
        tagsBySlug.set(s, meta?.tags as PageTags | undefined);
      })
    );
    const filtered = filterPageByActiveTags({
      sections: resolvedSections,
      projectGroups,
      activeFilters: options.activeFilters,
      getProjectTags: (s) => tagsBySlug.get(s),
    });
    resolvedSections = filtered.sections;
  }

  if (options?.transformSections) {
    resolvedSections = options.transformSections(resolvedSections);
  }
  resolvedSections = resolveEntranceMotionsIntoSections(
    applyBuilderElementDefaultsToSections(resolvedSections)
  );

  const bgDefinitionsRaw = buildRawBgDefinitions(page.definitions);
  const transitionsArray = page.transitions
    ? Array.isArray(page.transitions)
      ? page.transitions
      : [page.transitions]
    : [];
  const assetViewportWidthPx = resolveViewportWidthForAssetSizing(options);

  const injected = resolvePeblorAssetsOnServer(
    resolvedBg,
    resolvedSections,
    bgDefinitionsRaw,
    transitionsArray,
    { isMobile: options?.isMobile, viewportWidthPx: assetViewportWidthPx }
  );

  const overlayViewportWidthPx = resolveViewportWidthForExpansion(options);
  const overlaySections = await loadOverlaySections(
    (page as { disableOverlays?: string[] }).disableOverlays,
    {
      breakpoints: options?.breakpoints,
      viewportWidthPx: overlayViewportWidthPx,
    }
  );

  return {
    page: stripPageForClient(page),
    resolvedBg: injected.resolvedBg,
    resolvedSections: injected.resolvedSections,
    bgDefinitions: injected.bgDefinitions,
    ...(overlaySections.length > 0 ? { overlaySections } : {}),
    ...(options?.isMobile !== undefined ? { serverIsMobile: options.isMobile } : {}),
  };
}

export async function getPeblorPropsAsync(
  slug: string,
  options?: GetPeblorPropsOptions
): Promise<PeblorPageProps | null> {
  const page = await getPageAsync(slug, options);
  return getPeblorPropsFromPage(page, slug, options);
}

export function isMobileFromUserAgent(userAgent: string): boolean {
  return MOBILE_UA_REGEX.test(userAgent);
}

export {
  setPeblorHostConfig,
  getPeblorHostConfig,
  getPbBuilderDefaults,
  getPbContentGuidelines,
  applyPbDefaultTextAlign,
  discoverAllPages,
  resolvePagePath,
  loadModal,
  getPageSlugBases,
  getPageSlugs,
  getPageSlugsByBase,
};

export type { PageEntry, ModalBuilder, ModalProps, PeblorHostConfig };
