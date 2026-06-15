import type {
  FigmaExportDiagnosticsPageField,
  BackgroundTransitionEffect,
  PageDensity,
  PageScrollConfig,
  Peblor,
  ResolvedPage,
  SectionBlock,
  TriggerAction,
  bgBlock,
  PeblorDefinitionBlock,
} from "@pb/contracts";

import type { ResolvePeblorAssetsResult } from "./internal/peblor-resolve-assets-server";
import type { BreakpointDefinitions } from "./internal/defaults/pb-breakpoint-defaults";
import type { PbBuilderDefaults } from "./internal/defaults/pb-builder-defaults";
import type { PbContentGuidelines } from "./internal/defaults/pb-guidelines-expand";
import type { ModalProps } from "./internal/modal-types";
import type { PeblorHostConfig } from "./internal/adapters/host-config";
import { setPeblorHostConfig } from "./internal/adapters/host-config";

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type PeblorDiagnostic = {
  code: string;
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
  contractVersion: string;
};

/** Backward-compatible alias for existing in-repo scripts. */
export type PbCoreDiagnostic = PeblorDiagnostic;

// ---------------------------------------------------------------------------
// Core config
// ---------------------------------------------------------------------------

export type CoreConfig = {
  builderDefaults?: PbBuilderDefaults;
  contentGuidelines?: PbContentGuidelines;
  assetBaseUrl?: string;
  defaultSection?: Partial<SectionBlock>;
  defaultElement?: Record<string, unknown>;
  /** Fallback route prefix for pages that have no explicit assetBaseUrl. */
  fallbackSlugBase?: string;
  /** Maximum entries in the dev-mode expansion cache (TTL-based). */
  devCacheMaxSize?: number;
  /** Maximum entries in the production expansion cache (file-hash-based). */
  prodCacheMaxSize?: number;
};

let coreConfig: CoreConfig = {};

export function setCoreConfig(config: CoreConfig): void {
  coreConfig = { ...coreConfig, ...config };

  const hostConfigPatch: Partial<PeblorHostConfig> = {};
  if (config.builderDefaults) {
    hostConfigPatch.pbBuilderDefaults = config.builderDefaults;
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

export { coreConfig };

// ---------------------------------------------------------------------------
// Pipeline result types
// ---------------------------------------------------------------------------

export type ValidatePageResult = {
  valid: boolean;
  diagnostics: PeblorDiagnostic[];
  page: Peblor | null;
};

export type ExpandPageResult = {
  bg: bgBlock | null;
  sections: SectionBlock[];
  /** Present when buildPageForExpansion threw (e.g. missing section definitions). */
  error?: string;
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
  layoutFromJson?: boolean;
};

export type PeblorPageProps = {
  page: PeblorPageClientPage;
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  bgDefinitions: Record<string, bgBlock>;
  serverIsMobile?: boolean;
  overlaySections?: SectionBlock[];
  /** Modals declared by the page JSON that should be mounted in event-driven mode. */
  resolvedModals?: ModalProps[];
};

export type ResolvedPageWithDefinitions = ResolvedPage & {
  definitions?: Record<string, PeblorDefinitionBlock>;
};
