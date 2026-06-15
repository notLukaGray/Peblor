// ---------------------------------------------------------------------------
// @pb/core — public API barrel
//
// Pipeline stages: LOAD → VALIDATE → EXPAND → RESOLVE → MIGRATE
// Each stage lives in its own module; this file re-exports the public surface.
// ---------------------------------------------------------------------------

// Re-exports from shared utilities (lightweight, no fs/server deps)
export { isRecord, toRecordClone } from "./lib/type-guards";

// Types & config
export type {
  CoreConfig,
  ExpandPageResult,
  GetModalPropsOptions,
  GetPageOptions,
  GetPeblorPropsOptions,
  LoadPageResult,
  MigrationResult,
  PbCoreDiagnostic,
  PeblorDiagnostic,
  PeblorPageClientPage,
  PeblorPageProps,
  ResolveAssetsOptions,
  ResolveAssetsResult,
  ResolvedPageWithDefinitions,
  ValidatePageResult,
} from "./types";
export { getCoreConfig, setCoreConfig } from "./types";

// Pipeline stages
export {
  expandPage,
  loadPage,
  migratePage,
  resolveAssets,
  validatePage,
  validatePageAsync,
} from "./stages";

// Full-pipeline orchestrators
export {
  getModalProps,
  getPageAsync,
  getPageVisibilityAsync,
  getPeblorPropsAsync,
  getPeblorPropsFromPage,
  isMobileFromUserAgent,
} from "./props";

// Re-exports from internal modules
export { PageContentValidationError } from "./internal/peblor-validation-error";
export { loadPageMeta, loadPageVisibilityOnly, getPageMetadataAsync } from "./internal/peblor-load";
export type { PageMetadata } from "./internal/peblor-load";
export {
  setPeblorHostConfig,
  getPeblorHostConfig,
  getPbBuilderDefaults,
  getPbContentGuidelines,
  applyPbDefaultTextAlign,
} from "./internal/adapters/host-config";
export { discoverAllPages, resolvePagePath } from "./internal/load/peblor-discover-pages";
export { loadModal } from "./internal/modal-load";
export { getPageSlugBases, getPageSlugs, getPageSlugsByBase } from "./internal/peblor-load";
export { sanitizeRichTextMarkup } from "./internal/rich-text-sanitize";
export { invalidateCached, hashPageSources } from "./internal/expand-cache";

export type { PageEntry } from "./internal/load/peblor-discover-pages";
export type { ModalBuilder } from "./internal/modal-load";
export type { ModalProps } from "./internal/modal-types";
export type { PeblorHostConfig } from "./internal/adapters/host-config";
