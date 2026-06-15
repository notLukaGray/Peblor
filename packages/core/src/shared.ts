import {
  CONTRACT_VERSION,
  type Peblor,
  type PeblorDefinitionBlock,
  type ResolvedPage,
  type SectionBlock,
  type bgBlock,
} from "@pb/contracts";
import { nearestMatch } from "./internal/near-match";

import { getAssetBaseUrl } from "./internal/peblor-blocks";
import { expandPeblor } from "./internal/peblor-expand";
import { resolvePresets } from "./internal/peblor-presets";
import { applyDefaultsToElement } from "./internal/peblor-apply-element-defaults";
import {
  resolveEntranceMotionForSingleElement,
  resolveExitMotionForSingleElement,
} from "./internal/peblor-resolve-entrance-motions";
import { getCoreGlobals } from "./lib/globals";
import { isSafePathSegment } from "./internal/peblor-paths";
import {
  resolveBreakpointDefinitions,
  type BreakpointDefinitions,
} from "./internal/defaults/pb-breakpoint-defaults";
import { precompileRichTextOnSingleElement } from "./internal/rich-text-precompile";
import { precompileButtonLoopCssOnElement } from "./internal/precompile-button-loop-css";
import {
  precompileThemeStringsOnElement,
  precompileThemeStringsOnSection,
} from "./internal/precompile-theme-strings";
import { transformElementsInSectionsCombined } from "./internal/shared-element-transformer";
import { promotePresetsIntoDefinitions } from "./internal/peblor-load";

import type { PeblorDiagnostic } from "./types";
import { coreConfig } from "./types";
import type {
  GetPageOptions,
  GetPeblorPropsOptions,
  PeblorPageClientPage,
  ResolvedPageWithDefinitions,
} from "./types";

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

import { isRecord, toRecordClone } from "./lib/type-guards";
export { isRecord, toRecordClone };

// ---------------------------------------------------------------------------
// Diagnostic helpers
// ---------------------------------------------------------------------------

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
  } catch (err) {
    console.warn("[pb-core] Failed to stringify diagnostic value", err);
    return clip(String(value));
  }
}

export function toDiagnostics(error: unknown, source?: unknown): PeblorDiagnostic[] {
  if (error == null) return [];
  if (typeof error !== "object") {
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
    const rec = issue as {
      code?: unknown;
      message?: unknown;
      path?: unknown;
      discriminator?: unknown;
      input?: unknown;
      options?: unknown;
    };
    const pathParts = Array.isArray(rec.path)
      ? rec.path.filter(
          (part): part is string | number => typeof part === "string" || typeof part === "number"
        )
      : [];
    const issuePath = mapPath(pathParts);
    const currentValue = source === undefined ? undefined : readValueAtPath(source, pathParts);
    const baseMessage = typeof rec.message === "string" ? rec.message : "Schema validation issue.";
    let message =
      source === undefined
        ? baseMessage
        : `${baseMessage} (received: ${stringifyDiagnosticValue(currentValue)})`;

    // E-7: For element type discriminator errors, append a "did you mean?" suggestion.
    // Zod 4 discriminated-union errors include `discriminator` (field name) and
    // `options` (array of valid discriminator values), so no schema import needed.
    if (
      rec.code === "invalid_union" &&
      rec.discriminator === "type" &&
      rec.input != null &&
      typeof rec.input === "object" &&
      Array.isArray(rec.options)
    ) {
      const badType = (rec.input as Record<string, unknown>).type;
      const candidates = rec.options.filter((o) => typeof o === "string") as string[];
      if (typeof badType === "string" && candidates.length > 0) {
        const suggestion = nearestMatch(badType, candidates);
        const hint = suggestion
          ? `Unknown element type "${badType}". Did you mean "${suggestion}"?`
          : `Unknown element type "${badType}".`;
        message = `${hint} ${message}`;
      }
    }

    return {
      code: typeof rec.code === "string" ? rec.code : "PB_SCHEMA_ISSUE",
      severity: "error" as const,
      path: issuePath,
      message,
      contractVersion: CONTRACT_VERSION,
    };
  });
}

// ---------------------------------------------------------------------------
// Page expansion helpers
// ---------------------------------------------------------------------------

export function buildPageForExpansion(page: Peblor): Peblor {
  const definitions = {
    ...(page.definitions as Record<string, PeblorDefinitionBlock>),
  };
  const inlinePresets = isRecord(page.preset)
    ? (page.preset as Record<string, PeblorDefinitionBlock>)
    : {};

  // Promote presets into definitions for sectionOrder keys that lack explicit definitions.
  // Uses the same shared function as finalizeLoadedPeblor in peblor-load.ts (see K-08).
  promotePresetsIntoDefinitions(
    definitions,
    inlinePresets,
    page.sectionOrder,
    page.slug ?? "(unknown)"
  );

  const resolvedDefinitions: Record<string, PeblorDefinitionBlock> = {};
  for (const [key, block] of Object.entries(definitions)) {
    resolvedDefinitions[key] = resolvePresets(block, inlinePresets);
  }

  return {
    ...page,
    definitions: resolvedDefinitions,
  };
}

export function resolveAssetBase(page: Peblor, options?: { assetBaseUrl?: string }): string {
  if (options?.assetBaseUrl) return options.assetBaseUrl;
  if (coreConfig.assetBaseUrl) return coreConfig.assetBaseUrl;
  return getAssetBaseUrl(page as ResolvedPage);
}

/**
 * Shared implementation for viewport width resolution.
 * Both resolveViewportWidthForExpansion and resolveViewportWidthForAssetSizing
 * delegate to this function with their respective desktop fallback values.
 */
function resolveViewportWidthBase(
  options:
    | { viewportWidthPx?: number; isMobile?: boolean; breakpoints?: Partial<BreakpointDefinitions> }
    | undefined,
  fallbackDesktop: number
): number | undefined {
  if (typeof options?.viewportWidthPx === "number" && Number.isFinite(options.viewportWidthPx)) {
    return options.viewportWidthPx;
  }
  if (options?.isMobile === undefined) return undefined;
  const computed = resolveBreakpointDefinitions(options.breakpoints);
  return options.isMobile ? computed.desktop - 1 : fallbackDesktop;
}

export function resolveViewportWidthForExpansion(options?: GetPageOptions): number | undefined {
  const breakpoints = resolveBreakpointDefinitions(options?.breakpoints);
  return resolveViewportWidthBase(options, breakpoints.desktop);
}

/**
 * Resolve viewport width for responsive image asset sizing.
 *
 * When viewportWidthPx is explicitly provided, use it directly (preferred path).
 * Falls back to the boolean `isMobile` heuristic:
 *   - mobile => breakpoints.desktop - 1 (a representative "just-below-desktop" width)
 *   - desktop => imageDefaultWidth from core globals
 *
 * NOTE(K-17): The `isMobile` → `breakpoints.desktop - 1` fallback is a heuristic that
 * assumes a "typical" mobile viewport just below the desktop breakpoint. When the caller
 * has access to the actual viewport width (e.g., from a user-agent header or client-side
 * measurement), it should pass `viewportWidthPx` directly for more accurate sizing.
 */
export function resolveViewportWidthForAssetSizing(
  options?: GetPeblorPropsOptions
): number | undefined {
  const { imageDefaultWidth } = getCoreGlobals();
  return resolveViewportWidthBase(options, imageDefaultWidth);
}

export function parseSlugSegments(slug: string): string[] | null {
  if (typeof slug !== "string" || slug.length === 0) return null;
  const segments = slug.split("/");
  for (const seg of segments) {
    if (!isSafePathSegment(seg)) return null;
  }
  return segments;
}

export function stripPageForClient(page: ResolvedPageWithDefinitions): PeblorPageClientPage {
  const stripped: PeblorPageClientPage = {
    slug: page.slug ?? "",
    title: page.title,
  };
  if (page.onPageProgress != null)
    stripped.onPageProgress = page.onPageProgress as import("@pb/contracts").TriggerAction;
  if (page.transitions != null) {
    stripped.transitions = page.transitions as
      | import("@pb/contracts").BackgroundTransitionEffect
      | import("@pb/contracts").BackgroundTransitionEffect[];
  }
  if (page.scroll != null)
    stripped.scroll = page.scroll as import("@pb/contracts").PageScrollConfig;
  if (page.density != null) stripped.density = page.density as import("@pb/contracts").PageDensity;
  if (page.forcedTheme === "light" || page.forcedTheme === "dark") {
    stripped.forcedTheme = page.forcedTheme;
  }
  if ((page as { layoutFromJson?: boolean }).layoutFromJson === true) {
    stripped.layoutFromJson = true;
  }
  if (
    (page as { figmaExportDiagnostics?: import("@pb/contracts").FigmaExportDiagnosticsPageField })
      .figmaExportDiagnostics != null
  ) {
    stripped.figmaExportDiagnostics = (
      page as { figmaExportDiagnostics?: import("@pb/contracts").FigmaExportDiagnosticsPageField }
    ).figmaExportDiagnostics;
  }
  return stripped;
}

// ---------------------------------------------------------------------------
// Shared element pipeline (expand → defaults → entrance motions → rich text)
// ---------------------------------------------------------------------------

/**
 * Shared pipeline: expand -> element defaults -> entrance motions.
 * Used by expandPage, resolveAssets, and other callers to avoid duplicating
 * this three-stage sequence (see K-18).
 *
 * The three per-element transforms (defaults, entrance motions, rich text)
 * are applied in a SINGLE tree walk via `transformElementsInSectionsCombined`
 * rather than 3 sequential walks, reducing element visits from 3N to N.
 */
export function runElementPipeline(
  page: Peblor,
  options?: {
    assetBase?: string;
    breakpoints?: Partial<BreakpointDefinitions>;
    viewportWidthPx?: number;
  }
): { bg: bgBlock | null; sections: SectionBlock[] } {
  const expanded = expandPeblor(page, options);
  const sections = transformElementsInSectionsCombined(expanded.sections, [
    applyDefaultsToElement,
    resolveEntranceMotionForSingleElement,
    resolveExitMotionForSingleElement,
    precompileRichTextOnSingleElement,
    precompileButtonLoopCssOnElement,
    precompileThemeStringsOnElement,
  ]);
  // Section-level theme string properties (fill, effects, border, wrapperStyle)
  // are outside any element — walk them separately.
  const themeResolvedSections = sections.map((section) => precompileThemeStringsOnSection(section));
  return { bg: expanded.bg, sections: themeResolvedSections };
}
