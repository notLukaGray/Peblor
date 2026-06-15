import fs from "node:fs";
import path from "node:path";

import {
  CONTRACT_VERSION,
  peblorSchema,
  type Peblor,
  type PeblorDefinitionBlock,
} from "@pb/contracts";

import { buildPresetsAsync } from "./internal/load/peblor-load-presets";
import { resolveDefinitionPresets } from "./internal/load/peblor-load-definitions";
import {
  buildRawBgDefinitions,
  resolvePeblorAssetsOnServer,
} from "./internal/peblor-resolve-assets-server";

import { coreConfig } from "./types";
import type {
  ExpandPageResult,
  LoadPageResult,
  MigrationResult,
  PeblorDiagnostic,
  ResolveAssetsResult,
  ValidatePageResult,
} from "./types";
import type { ResolveAssetsOptions } from "./types";
import {
  buildPageForExpansion,
  isRecord,
  resolveAssetBase,
  resolveViewportWidthForExpansion,
  runElementPipeline,
  toDiagnostics,
  toRecordClone,
} from "./shared";
import { PageContentValidationError } from "./internal/peblor-validation-error";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Sync validation using only inline presets (page.preset field).
 * For full validation that also loads global presets from content/presets/*.json,
 * use `validatePageAsync` (see K-09).
 */
export function validatePage(input: unknown): ValidatePageResult {
  let candidate: unknown = input;
  const expansionDiagnostics: PeblorDiagnostic[] = [];

  if (isRecord(input)) {
    try {
      candidate = buildPageForExpansion(input as Peblor);
    } catch (err) {
      // Expansion failed (e.g., missing section definitions, circular presets).
      // Capture the error as a diagnostic; still validate the raw input for completeness.
      expansionDiagnostics.push(...toDiagnostics(err, input));
      candidate = input;
    }
  }

  const parsed = peblorSchema.safeParse(candidate);
  if (parsed.success && expansionDiagnostics.length === 0) {
    return {
      valid: true,
      diagnostics: [],
      page: parsed.data,
    };
  }

  return {
    valid: expansionDiagnostics.length === 0 && parsed.success,
    diagnostics: [
      ...expansionDiagnostics,
      ...toDiagnostics(parsed.success ? null : parsed.error, input),
    ],
    page: parsed.success ? parsed.data : null,
  };
}

/**
 * Async validation that loads global presets (content/presets/*.json) before validating.
 * This mirrors what the runtime pipeline does — inline presets alone may miss preset
 * references that resolve from global preset files.
 */
export async function validatePageAsync(input: unknown): Promise<ValidatePageResult> {
  if (!isRecord(input)) {
    return validatePage(input);
  }

  // Load global presets like the runtime pipeline does
  const rawObj = input as Record<string, unknown>;
  let presets: Record<string, PeblorDefinitionBlock> = {};
  try {
    presets = await buildPresetsAsync(rawObj);
  } catch (err) {
    // Preset load failures are non-fatal for validation — fall back to inline-only
    console.warn("[pb-core] Failed to load presets during async validation", err);
  }

  // Merge presets into input so buildPageForExpansion can resolve them
  const enriched = {
    ...rawObj,
    preset: {
      ...(isRecord(rawObj.preset) ? (rawObj.preset as Record<string, PeblorDefinitionBlock>) : {}),
      ...presets,
    },
  };
  return validatePage(enriched);
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export async function loadPage(
  filePath: string
): Promise<LoadPageResult & { resolved: Record<string, unknown> }> {
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

  const rawObj = raw as Record<string, unknown>;
  let presets: Record<string, PeblorDefinitionBlock> = {};
  try {
    presets = await buildPresetsAsync(rawObj);
  } catch (err) {
    throw new Error(
      `[peblor] Failed to load presets for ${filePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const defs = (rawObj.definitions ?? {}) as Record<string, PeblorDefinitionBlock>;
  const resolvedDefs =
    Object.keys(presets).length > 0 ? resolveDefinitionPresets(defs, presets) : defs;
  const resolvedPage = { ...rawObj, definitions: resolvedDefs };

  return {
    filePath: realResolved,
    raw,
    resolved: resolvedPage,
    validate: validatePage(resolvedPage),
  };
}

// ---------------------------------------------------------------------------
// Expand
// ---------------------------------------------------------------------------

export function expandPage(page: Peblor): ExpandPageResult {
  try {
    const preparedPage = buildPageForExpansion(page);
    const assetBase = resolveAssetBase(preparedPage);
    const result = runElementPipeline(preparedPage, { assetBase });
    return result;
  } catch (err) {
    const message =
      err instanceof PageContentValidationError
        ? `Page expansion failed for "${err.slug}": ${err.message}`
        : err instanceof Error
          ? err.message
          : "Page expansion failed with an unknown error";
    return { bg: null, sections: [], error: message };
  }
}

// ---------------------------------------------------------------------------
// Asset resolution
// ---------------------------------------------------------------------------

export function resolveAssets(page: Peblor, options?: ResolveAssetsOptions): ResolveAssetsResult {
  const preparedPage = buildPageForExpansion(page);
  const assetBase = resolveAssetBase(preparedPage, options);
  const viewportWidthPx = resolveViewportWidthForExpansion(options);

  const result = runElementPipeline(preparedPage, {
    assetBase,
    breakpoints: options?.breakpoints,
    ...(viewportWidthPx !== undefined ? { viewportWidthPx } : {}),
  });

  const bgDefinitionsRaw = buildRawBgDefinitions(
    preparedPage.definitions as Record<string, PeblorDefinitionBlock> | undefined
  );
  const transitionsArray = preparedPage.transitions
    ? Array.isArray(preparedPage.transitions)
      ? preparedPage.transitions
      : [preparedPage.transitions]
    : [];

  const resolved = resolvePeblorAssetsOnServer(
    result.bg,
    result.sections,
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

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

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
    // NOTE(K-20): 0.x content is unsupported for automated migration beyond stamping
    // the contract version. The schema changed substantially between 0.x and 1.x:
    // - Preset resolution moved from inline to file-based
    // - Section element resolution changed from inline to definitions-based
    // - bgKey became optional
    //
    // For now we stamp the contract version and inject assetBaseUrl. If actual
    // structural transforms are needed, they should be added here as explicit
    // version-to-version migration functions (e.g., "0.5.0-v0" -> "1.0.0").
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
