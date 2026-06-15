import type { Peblor, ResolvedPage, SectionBlock, bgBlock } from "@pb/contracts";
import { isMobileFromUserAgent } from "./lib/shared-utils";

import { expandPeblor } from "./internal/peblor-expand";
import { applyDefaultsToElement } from "./internal/peblor-apply-element-defaults";
import {
  resolveEntranceMotionForSingleElement,
  resolveExitMotionForSingleElement,
} from "./internal/peblor-resolve-entrance-motions";
import { getAssetBaseUrl } from "./internal/peblor-blocks";
import {
  buildRawBgDefinitions,
  resolvePeblorAssetsOnServer,
} from "./internal/peblor-resolve-assets-server";
import { loadPeblorByPathAsync, loadPageVisibilityOnly } from "./internal/peblor-load";
import { resolvePagePath } from "./internal/load/peblor-discover-pages";
import { loadModal } from "./internal/modal-load";
import type { ModalProps } from "./internal/modal-types";
import { loadOverlaySections } from "./internal/overlay/peblor-overlay-loader";
import { precompileRichTextOnSingleElement } from "./internal/rich-text-precompile";
import { precompileButtonLoopCssOnElement } from "./internal/precompile-button-loop-css";
import {
  precompileThemeStringsOnElement,
  precompileThemeStringsOnSection,
} from "./internal/precompile-theme-strings";
import { transformElementsInSectionsCombined } from "./internal/shared-element-transformer";
import { getCached, setCached, hashPageSources } from "./internal/expand-cache";

import type {
  GetModalPropsOptions,
  GetPageOptions,
  GetPeblorPropsOptions,
  PeblorPageProps,
  ResolvedPageWithDefinitions,
} from "./types";
import {
  parseSlugSegments,
  resolveViewportWidthForExpansion,
  resolveViewportWidthForAssetSizing,
  stripPageForClient,
} from "./shared";

// ---------------------------------------------------------------------------
// Page loading and expansion
// ---------------------------------------------------------------------------

/**
 * Load and expand a page by slug, returning pre-definitions-resolved data WITHOUT
 * element defaults, entrance motion resolution, or asset URL signing.
 *
 * This is a "mid-pipeline" result — elements are inlined and modules are resolved,
 * but defaults/motion/assets are NOT applied. It is suitable for:
 *   - Introspection (reading section structure, metadata, project groups)
 *   - Pre-processing before getPeblorPropsFromPage (e.g., tag filtering)
 *
 * For the full pipeline result (with defaults, motion, and assets resolved), use
 * getPeblorPropsAsync() or pass the result of this function to getPeblorPropsFromPage().
 *
 * NOTE(K-26): getPageAsync and getPeblorPropsFromPage operate at different pipeline
 * stages. getPageAsync stops after EXPAND. getPeblorPropsFromPage continues through
 * DEFAULTS → MOTION → ASSETS. This split allows callers to inspect or transform
 * the mid-pipeline data before final resolution.
 */
export async function getPageAsync(
  slug: string,
  options?: GetPageOptions
): Promise<ResolvedPageWithDefinitions | null> {
  const segments = parseSlugSegments(slug);
  if (!segments) return null;

  // Resolve page path for cache key + mtime hash.
  // Hoisted so we reuse the hash for both lookup and storage — avoids
  // a second recursive stat of all preset files on cache miss.
  const pageFilePath = await resolvePagePath(segments);
  let fileHash: string | undefined;
  if (pageFilePath) {
    fileHash = hashPageSources(pageFilePath);
    const cached = getCached(slug, fileHash);
    if (cached) {
      return cached as ResolvedPageWithDefinitions;
    }
  }

  const page = await loadPeblorByPathAsync(segments);
  if (!page) return null;

  const assetBase = getAssetBaseUrl(page as ResolvedPage);
  const viewportWidthPx = resolveViewportWidthForExpansion(options);
  const expanded = expandPeblor(page, {
    assetBase,
    breakpoints: options?.breakpoints,
    ...(viewportWidthPx !== undefined ? { viewportWidthPx } : {}),
  });

  const result = {
    ...(page as ResolvedPage),
    bg: expanded.bg,
    sections: expanded.sections,
    definitions: page.definitions,
  } as ResolvedPageWithDefinitions;

  if (pageFilePath) {
    setCached(slug, fileHash ?? hashPageSources(pageFilePath), result);
  }

  return result;
}

export async function getPageVisibilityAsync(slug: string): Promise<string | null> {
  const segments = parseSlugSegments(slug);
  if (!segments) return null;
  const visibilityResult = await loadPageVisibilityOnly(segments);
  return visibilityResult?.visibility ?? null;
}

// ---------------------------------------------------------------------------
// Modal props
// ---------------------------------------------------------------------------

export async function getModalProps(
  id: string,
  options?: GetModalPropsOptions
): Promise<ModalProps | null> {
  const modal = await loadModal(id);
  if (!modal) return null;

  // Modals have no background. Previously sentinel "_none" was used; now expandPeblor
  // treats a bgKey that doesn't match any definition as "no background" (see K-25).
  const minimalPage: Peblor = {
    slug: modal.id,
    title: modal.title ?? "",
    sectionOrder: modal.sectionOrder,
    definitions: modal.definitions ?? {},
    bgKey: undefined,
  };

  const modalAssetBase = getAssetBaseUrl(null);
  const viewportWidthPx = resolveViewportWidthForExpansion(options);
  const expanded = expandPeblor(minimalPage, {
    assetBase: modalAssetBase,
    breakpoints: options?.breakpoints,
    ...(viewportWidthPx !== undefined ? { viewportWidthPx } : {}),
  });
  const bgDefinitionsRaw = buildRawBgDefinitions(modal.definitions ?? {});

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
  resolvedSections = transformElementsInSectionsCombined(resolvedSections, [
    applyDefaultsToElement,
    resolveEntranceMotionForSingleElement,
    resolveExitMotionForSingleElement,
    precompileRichTextOnSingleElement,
    precompileButtonLoopCssOnElement,
    precompileThemeStringsOnElement,
  ]);
  resolvedSections = resolvedSections.map((section) => precompileThemeStringsOnSection(section));

  return {
    id: modal.id,
    title: modal.title,
    resolvedSections,
    transition: modal.transition,
    ...(modal.motion !== undefined ? { motion: modal.motion } : {}),
    ...(modal.effects !== undefined ? { effects: modal.effects } : {}),
    ...(modal.behavior !== undefined ? { behavior: modal.behavior } : {}),
  };
}

// ---------------------------------------------------------------------------
// Full pipeline: DEFAULTS → MOTION → ASSETS
// ---------------------------------------------------------------------------

/**
 * Run the full DEFAULTS → MOTION → ASSETS pipeline on an already-loaded page.
 *
 * The input `page` should come from getPageAsync() (EXPAND stage output).
 * This function applies element defaults, resolves entrance motions, signs CDN
 * asset URLs, and loads overlay sections.
 *
 * NOTE(K-26): This is the second half of the pipeline. The first half (LOAD + EXPAND)
 * is handled by getPageAsync(). The split exists so callers can inspect or transform
 * the mid-pipeline data before final resolution — for example, applying transformSections
 * callbacks or computing filter-specific section views from the expanded page shape.
 */
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

  if (options?.transformSections) {
    resolvedSections = options.transformSections(resolvedSections);
  }
  resolvedSections = transformElementsInSectionsCombined(resolvedSections, [
    applyDefaultsToElement,
    resolveEntranceMotionForSingleElement,
    resolveExitMotionForSingleElement,
    precompileRichTextOnSingleElement,
    precompileButtonLoopCssOnElement,
    precompileThemeStringsOnElement,
  ]);
  resolvedSections = resolvedSections.map((section) => precompileThemeStringsOnSection(section));

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
  const overlayAssetViewportWidthPx = resolveViewportWidthForAssetSizing(options);
  const overlaySections = await loadOverlaySections(
    (page as { disableOverlays?: string[] }).disableOverlays,
    {
      breakpoints: options?.breakpoints,
      isMobile: options?.isMobile,
      viewportWidthPx: overlayViewportWidthPx,
      assetViewportWidthPx: overlayAssetViewportWidthPx,
    }
  );

  const modalIds = (page as { modals?: string[] }).modals ?? [];
  const resolvedModals =
    modalIds.length > 0
      ? (
          await Promise.all(
            modalIds.map((id) =>
              getModalProps(id, {
                isMobile: options?.isMobile,
                viewportWidthPx: overlayViewportWidthPx,
              })
            )
          )
        ).filter((m): m is ModalProps => m !== null)
      : [];

  return {
    page: stripPageForClient(page),
    resolvedBg: injected.resolvedBg,
    resolvedSections: injected.resolvedSections,
    bgDefinitions: injected.bgDefinitions,
    ...(overlaySections.length > 0 ? { overlaySections } : {}),
    ...(options?.isMobile !== undefined ? { serverIsMobile: options.isMobile } : {}),
    ...(resolvedModals.length > 0 ? { resolvedModals } : {}),
  };
}

export async function getPeblorPropsAsync(
  slug: string,
  options?: GetPeblorPropsOptions
): Promise<PeblorPageProps | null> {
  const page = await getPageAsync(slug, options);
  return getPeblorPropsFromPage(page, slug, options);
}

export { isMobileFromUserAgent };
