import fs from "node:fs";
import path from "node:path";
import { loadPage } from "@pb/core/load";
import { validatePage } from "@pb/core/validate";
import { expandPage } from "@pb/core/resolve";
import { resolveAssets } from "@pb/core/resolve";
import { loadPeblorByPathAsync, discoverAllPages, PAGE_DATA_DIR } from "@pb/core/loader";
import { loadCatalog } from "@pb/catalog";
import type { CatalogEntry } from "@pb/catalog";
import type { Peblor } from "@pb/contracts";
import {
  knownPageTagsConfigSchema,
  pageTagsSchema,
  filterConfigSchema,
  projectGroupsSchema,
  validateKnownPageTags,
  validateKnownFilterCategories,
  validateProjectGroups,
  type KnownPageTagsConfig,
} from "@pb/contracts";
import { schemaTypeHint } from "./explain-schema.js";
import { readJsonFile } from "../lib/json-file.js";
import { validateSectionValue } from "../lib/section-validate.js";
import type { CommandIo } from "./types.js";

/**
 * When a page path is inside PAGE_DATA_DIR and points to an index.json,
 * derive the slug segments so we can use the strict route-aware loader.
 * Returns null if the path is outside the content tree or not a page index.
 */
export function deriveSlugSegments(contentPath: string): string[] | null {
  const absContent = path.resolve(contentPath);
  const absDataDir = path.resolve(PAGE_DATA_DIR);
  if (!absContent.startsWith(absDataDir + path.sep)) return null;
  const rel = absContent.slice(absDataDir.length + 1).replace(/\\/g, "/");
  // Root index.json has no slug segments — not a routable page under a slug.
  if (rel === "index.json") return null;
  // Non-index JSON files are sidecar section fragments, not routes.
  if (!rel.endsWith("/index.json")) return null;
  const segments = rel
    .replace(/\/index\.json$/, "")
    .split("/")
    .filter(Boolean);
  return segments.length > 0 ? segments : null;
}

type StageName = "load" | "validate" | "expand" | "resolve" | "assets";
const VALID_STAGES = new Set<StageName>(["load", "validate", "expand", "resolve", "assets"]);

type DoctorStageResult = { ok: boolean; error?: string; details?: Record<string, unknown> };

function parseDoctorArgs(args: string[]): {
  contentPath?: string;
  fragmentPath?: string;
  help: boolean;
  asJson: boolean;
  verbose: boolean;
  quiet: boolean;
  strict: boolean;
  stage?: StageName;
} {
  const asJson = args.includes("--json");
  const verbose = args.includes("--verbose");
  const quiet = args.includes("--quiet");
  const strict = args.includes("--strict");
  const help = args.includes("--help") || args.includes("-h");
  const stageIndex = args.indexOf("--stage");
  const fragmentIndex = args.indexOf("--fragment");
  const stage = stageIndex >= 0 ? (args[stageIndex + 1] as StageName | undefined) : undefined;
  const fragmentPath = fragmentIndex >= 0 ? args[fragmentIndex + 1] : undefined;
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i += 1) {
    if (["--json", "--verbose", "--quiet", "--strict", "--help", "-h"].includes(args[i]!))
      consumed.add(i);
    if (args[i] === "--stage") {
      consumed.add(i);
      if (i + 1 < args.length) consumed.add(i + 1);
    }
    if (args[i] === "--fragment") {
      consumed.add(i);
      if (i + 1 < args.length) consumed.add(i + 1);
    }
  }
  const contentPath = args.find((_, index) => !consumed.has(index));
  return { contentPath, fragmentPath, help, asJson, verbose, quiet, strict, stage };
}

export function resolveSectionFiles(
  pageFile: string,
  sectionOrder: string[],
  definitions?: Record<string, unknown>
): {
  sections: number;
  loaded: number;
  failed: number;
  failures: Array<{ key: string; message: string }>;
} {
  const dir = path.dirname(pageFile);
  const failures: Array<{ key: string; message: string }> = [];
  let loaded = 0;
  for (const key of sectionOrder) {
    if (
      definitions &&
      definitions[key] &&
      typeof definitions[key] === "object" &&
      "type" in (definitions[key] as object)
    ) {
      loaded += 1;
      continue;
    }
    const file = path.join(dir, `${key}.json`);
    if (!fs.existsSync(file)) {
      failures.push({ key, message: `Section file not found: ${file}` });
      continue;
    }
    const read = readJsonFile(file);
    if (!read.ok) {
      failures.push({ key, message: "error" in read ? read.error : "Failed to read section" });
      continue;
    }
    const validated = validateSectionValue(read.value);
    if (!validated.valid) {
      failures.push({ key, message: validated.diagnostics.map((d) => d.message).join("; ") });
      continue;
    }
    loaded += 1;
  }
  return { sections: sectionOrder.length, loaded, failed: failures.length, failures };
}

/**
 * Run the same CI-level tag/filterConfig/projectGroups checks that
 * `scripts/validate-pages.ts` runs, but scoped to a single page.
 * Returns a flat array of diagnostic objects (same shape as stage diagnostics).
 */
async function runCiChecks(
  page: Record<string, unknown> | Peblor
): Promise<
  Array<{ severity: string; stage: string; code: string; path: string; message: string }>
> {
  const issues: Array<{
    severity: string;
    stage: string;
    code: string;
    path: string;
    message: string;
  }> = [];

  // Load the known-tags config. If absent (project doesn't use it) skip silently.
  let tagsConfig: KnownPageTagsConfig | undefined;
  const tagsConfigPath = path.join(path.dirname(PAGE_DATA_DIR), "config", "tags.json");
  if (fs.existsSync(tagsConfigPath)) {
    try {
      const raw = fs.readFileSync(tagsConfigPath, "utf-8");
      const result = knownPageTagsConfigSchema.safeParse(JSON.parse(raw));
      if (result.success) tagsConfig = result.data;
    } catch (err) {
      console.warn("[pb-cli] Failed to parse tags config", tagsConfigPath, err);
    }
  }

  const pageRec = page as Record<string, unknown>;

  if (tagsConfig) {
    // Validate tags.
    const tagsResult = pageRec.tags !== undefined ? pageTagsSchema.safeParse(pageRec.tags) : null;
    if (tagsResult?.success) {
      for (const issue of validateKnownPageTags(tagsResult.data, tagsConfig)) {
        issues.push({
          severity: "error",
          stage: "ci-checks",
          code: "PB_UNKNOWN_TAG",
          path: issue.path.join(".") || "$",
          message: issue.message,
        });
      }
    }

    // Validate filterConfig.
    const filterResult =
      pageRec.filterConfig !== undefined
        ? filterConfigSchema.safeParse(pageRec.filterConfig)
        : null;
    if (filterResult?.success) {
      for (const issue of validateKnownFilterCategories(filterResult.data, tagsConfig)) {
        issues.push({
          severity: "error",
          stage: "ci-checks",
          code: "PB_UNKNOWN_FILTER_CATEGORY",
          path: issue.path.join(".") || "$",
          message: issue.message,
        });
      }
    }
  }

  // Validate projectGroups — requires knowing all page slugs.
  const groupsResult =
    pageRec.projectGroups !== undefined
      ? projectGroupsSchema.safeParse(pageRec.projectGroups)
      : null;
  if (groupsResult?.success) {
    const allPages = await discoverAllPages();
    const knownSlugs = new Set(allPages.map((p) => p.slugSegments.join("/")));
    for (const issue of validateProjectGroups(groupsResult.data, knownSlugs)) {
      issues.push({
        severity: "error",
        stage: "ci-checks",
        code: "PB_INVALID_PROJECT_GROUP",
        path: issue.path.join(".") || "$",
        message: issue.message,
      });
    }
  }

  return issues;
}

function collectAssetUrls(value: unknown, urls: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectAssetUrls(item, urls);
    return;
  }
  if (value == null || typeof value !== "object") return;
  for (const v of Object.values(value as Record<string, unknown>)) {
    if (
      typeof v === "string" &&
      /^(\/|https?:\/\/)/.test(v) &&
      /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov|m3u8|mp3|wav)(\?|$)/i.test(v)
    ) {
      urls.add(v);
      continue;
    }
    collectAssetUrls(v, urls);
  }
}

function entryMapByType(entries: CatalogEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    const type = schemaTypeHint(entry);
    if (type && !map.has(type)) map.set(type, entry.id);
  }
  return map;
}

function walkTypes(node: unknown, tally: Map<string, number>): void {
  if (Array.isArray(node)) {
    for (const item of node) walkTypes(item, tally);
    return;
  }
  if (node == null || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (typeof rec.type === "string") tally.set(rec.type, (tally.get(rec.type) ?? 0) + 1);
  for (const value of Object.values(rec)) walkTypes(value, tally);
}

function structuralTree(node: unknown, verbose: boolean): unknown {
  if (Array.isArray(node)) return node.map((item) => structuralTree(item, verbose));
  if (node == null || typeof node !== "object") return node;
  const rec = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof rec.type === "string") out.type = rec.type;
  if (typeof rec.id === "string") out.id = rec.id;
  if (Array.isArray(rec.sections))
    out.sections = rec.sections.map((s) => structuralTree(s, verbose));
  if (Array.isArray(rec.elements))
    out.elements = rec.elements.map((e) => structuralTree(e, verbose));
  if (verbose) {
    for (const [key, value] of Object.entries(rec)) {
      if (out[key] !== undefined) continue;
      if (Array.isArray(value) || value == null || typeof value !== "object") out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : rec;
}

export async function runDoctor(args: string[], io: CommandIo): Promise<number> {
  const { contentPath, fragmentPath, help, asJson, verbose, quiet, strict, stage } =
    parseDoctorArgs(args);
  if (help) {
    io.printText(
      "Usage: pb-cli doctor <page-index.json> [--stage <load|validate|expand|resolve|assets>] [--json] | pb-cli doctor --fragment <section-fragment.json> [--json]"
    );
    return 0;
  }
  if (!contentPath && !fragmentPath) {
    io.printUsage();
    return 2;
  }
  if (stage && !VALID_STAGES.has(stage)) {
    const message = `Unknown stage "${stage}". Valid stages: ${[...VALID_STAGES].join("|")}`;
    if (asJson)
      io.printErrorJson({
        command: "doctor",
        status: "error",
        message,
      });
    else io.printErrorText(message);
    return 2;
  }
  if (fragmentPath && stage) {
    if (asJson)
      io.printErrorJson({
        command: "doctor",
        status: "error",
        message: "--fragment cannot be combined with --stage.",
      });
    else io.printErrorText("--fragment cannot be combined with --stage.");
    return 2;
  }

  if (fragmentPath) {
    const read = readJsonFile(fragmentPath);
    if (!read.ok) {
      const payload = {
        command: "doctor",
        mode: "fragment",
        schema_version: 1,
        input: fragmentPath,
        schema: "sectionDefinitionBlockSchema",
        valid: false,
        diagnostics: [
          {
            severity: "error",
            stage: "validate",
            code: "PB_FILE_ERROR",
            path: "$",
            message: "error" in read ? read.error : "Failed to read fragment",
          },
        ],
      };
      if (asJson) io.printErrorJson(payload);
      else
        io.printErrorText(
          `ERROR [validate] ${"error" in read ? read.error : "Failed to read fragment"}`
        );
      return 2;
    }

    const validated = validateSectionValue(read.value);
    const diagnostics = validated.diagnostics.map((diagnostic) => ({
      severity: diagnostic.severity,
      stage: "validate",
      code: "PB_DOCTOR_FRAGMENT_INVALID",
      path: diagnostic.path,
      message: diagnostic.message,
    }));

    if (asJson) {
      const payload = {
        command: "doctor",
        mode: "fragment",
        schema_version: 1,
        input: fragmentPath,
        schema: validated.schema,
        valid: validated.valid,
        diagnostics,
      };
      if (!validated.valid) io.printErrorJson(payload);
      else io.printJson(payload);
    } else {
      io.printText(`Validating fragment ${fragmentPath}`);
      io.printText(`  Result:         ${validated.valid ? "OK" : "FAIL"}`);
      for (const diagnostic of diagnostics)
        io.printErrorText(`ERROR [${diagnostic.stage}] ${diagnostic.path} ${diagnostic.message}`);
    }
    if (strict && diagnostics.length > 0) return 1;
    return diagnostics.length > 0 ? 1 : 0;
  }

  const stages: Record<StageName, DoctorStageResult> = {
    load: { ok: false },
    validate: { ok: false },
    expand: { ok: false },
    resolve: { ok: false },
    assets: { ok: false },
  };

  let loaded: Awaited<ReturnType<typeof loadPage>> | null = null;
  let validated: ReturnType<typeof validatePage> | null = null;
  let strictPage: Peblor | null = null;
  let expanded: ReturnType<typeof expandPage> | null = null;
  let assets: ReturnType<typeof resolveAssets> | null = null;

  const slugSegments = deriveSlugSegments(contentPath!);
  const isRoutePage = slugSegments !== null;

  if (isRoutePage) {
    // Route-aware strict load: same path as the app and CI scripts.
    // load + validate collapse into one async operation.
    try {
      strictPage = await loadPeblorByPathAsync(slugSegments);
      if (strictPage === null) {
        stages.load = { ok: false, error: `Page not found at route /${slugSegments.join("/")}` };
      } else {
        stages.load = {
          ok: true,
          details: { file: contentPath!, route: `/${slugSegments.join("/")}`, mode: "strict-load" },
        };
        stages.validate = {
          ok: true,
          details: { schema: "peblorSchema", mode: "strict-load", note: "includes ref checks" },
        };
      }
    } catch (error) {
      stages.load = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  } else {
    // Legacy path for files outside the content tree (temp files, fragments being diagnosed).
    try {
      loaded = await loadPage(contentPath!);
      stages.load = { ok: true, details: { file: loaded.filePath, mode: "schema-only" } };
    } catch (error) {
      stages.load = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    if (
      stages.load.ok &&
      loaded &&
      (!stage || ["validate", "expand", "resolve", "assets"].includes(stage))
    ) {
      validated = loaded.validate;
      stages.validate = {
        ok: validated.valid,
        ...(validated.valid
          ? { details: { schema: "peblorSchema", mode: "schema-only" } }
          : { error: validated.diagnostics.map((d) => d.message).join("; ") }),
      };
    }
  }

  // The page to expand: prefer strictPage (route-aware load), fall back to validated legacy load.
  const pageForExpansion: Peblor | null = strictPage ?? (validated?.page as Peblor | null) ?? null;

  if (
    stages.validate.ok &&
    pageForExpansion &&
    (!stage || ["expand", "resolve", "assets"].includes(stage))
  ) {
    try {
      expanded = expandPage(pageForExpansion);
      if (isRoutePage) {
        // For strict-load pages, section hydration already happened inside loadPeblorByPathAsync.
        // Report the sections from the expanded output.
        const sectionCount = expanded.sections.length;
        stages.expand = {
          ok: true,
          details: { sections: sectionCount, loaded: sectionCount, failed: 0, mode: "strict-load" },
        };
      } else {
        // Legacy: manually check sidecar section files.
        const raw = loaded?.raw as Record<string, unknown>;
        const sectionOrder = Array.isArray(raw.sectionOrder)
          ? raw.sectionOrder.filter((value): value is string => typeof value === "string")
          : [];
        const resolvedDefs = (loaded as { resolved?: Record<string, unknown> } | null)?.resolved
          ?.definitions as Record<string, unknown> | undefined;
        const sectionLoad = resolveSectionFiles(loaded!.filePath, sectionOrder, resolvedDefs);
        stages.expand = {
          ok: sectionLoad.failed === 0,
          details: {
            sections: sectionLoad.sections,
            loaded: sectionLoad.loaded,
            failed: sectionLoad.failed,
            failures: sectionLoad.failures,
          },
          ...(sectionLoad.failed > 0
            ? {
                error: sectionLoad.failures
                  .map((failure) => `${failure.key}: ${failure.message}`)
                  .join("; "),
              }
            : {}),
        };
      }
    } catch (error) {
      stages.expand = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const shouldRunResolve =
    stages.expand.ok && (!stage || stage === "resolve" || stage === "assets");
  const shouldRunAssetManifest = stages.expand.ok && (!stage || stage === "assets");

  if (shouldRunResolve) {
    try {
      assets = resolveAssets(pageForExpansion!);
      const resolvedSections = assets?.resolvedSections ?? [];
      stages.resolve = {
        ok: true,
        details: {
          resolved_sections: resolvedSections.length,
          overlay_sections:
            (assets as { overlaySections?: unknown[] }).overlaySections?.length ?? 0,
        },
      };
    } catch (error) {
      stages.resolve = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  } else if (stages.expand.ok && stage === "expand") {
    stages.resolve = { ok: true, details: { skipped: "run full doctor or --stage resolve" } };
    stages.assets = { ok: true, details: { skipped: "run full doctor or --stage assets" } };
  }

  if (shouldRunAssetManifest && stages.resolve.ok) {
    try {
      if (!assets) {
        assets = resolveAssets(pageForExpansion!);
      }
      const resolvedSections = assets?.resolvedSections ?? [];

      // Surface asset manifest: collect all asset keys from the resolved page.
      const assetUrlSet = new Set<string>();
      collectAssetUrls((pageForExpansion as Peblor & { bg?: unknown }).bg, assetUrlSet);
      collectAssetUrls(resolvedSections, assetUrlSet);
      const assetUrls = Array.from(assetUrlSet);

      stages.assets = {
        ok: true,
        details: {
          resolved_sections: resolvedSections.length,
          overlay_sections:
            (assets as { overlaySections?: unknown[] }).overlaySections?.length ?? 0,
          asset_count: assetUrls.length,
          asset_urls: asJson ? assetUrls : undefined,
        },
      };
    } catch (error) {
      stages.assets = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  } else if (stages.expand.ok && stage === "resolve") {
    stages.assets = { ok: true, details: { skipped: "run full doctor or --stage assets" } };
  }

  // Mark any stage that never ran (ok: false, no error) as explicitly skipped.
  // This happens when --stage stops the pipeline early. Without this, skipped stages
  // look identical to failed stages in the JSON output.
  if (stage) {
    const stageOrder: StageName[] = ["load", "validate", "expand", "resolve", "assets"];
    const stopAt = stageOrder.indexOf(stage);
    for (let i = stopAt + 1; i < stageOrder.length; i++) {
      const s = stageOrder[i]!;
      if (!stages[s].ok && !stages[s].error) {
        stages[s] = { ok: true, details: { skipped: true, reason: `--stage ${stage} stops here` } };
      }
    }
  }

  const typeTally = new Map<string, number>();
  if (assets?.resolvedSections) walkTypes(assets.resolvedSections, typeTally);
  const catalog = loadCatalog();
  const byType = entryMapByType(catalog.entries);
  const clustersTouched = Object.fromEntries(
    [...typeTally.entries()]
      .map(([type, count]) => [byType.get(type) ?? type, count])
      .sort((a, b) => Number(b[1]) - Number(a[1]))
  );

  const stageDiagnostics = Object.entries(stages)
    .filter(([, result]) => !result.ok && result.error)
    .map(([stageName, result]) => ({
      severity: "error",
      stage: stageName,
      code: "PB_DOCTOR_STAGE_FAILED",
      message: result.error,
      suggested_action: `Inspect ${stageName} stage inputs and run pb-cli explain on related cluster ids.`,
    }));

  // CI-level checks: tags, filterConfig, projectGroups — same checks as validate-pages script.
  // Only run when we have a valid loaded page to inspect.
  const pageForCiChecks = strictPage ?? (validated?.page as Record<string, unknown> | undefined);
  const ciDiagnostics = stages.load.ok && pageForCiChecks ? await runCiChecks(pageForCiChecks) : [];

  const diagnostics = [...stageDiagnostics, ...ciDiagnostics];

  if (asJson) {
    const payload = {
      command: "doctor",
      schema_version: 1,
      input: contentPath!,
      stages,
      tree: structuralTree(assets?.resolvedSections ?? expanded?.sections ?? [], verbose),
      clusters_touched: clustersTouched,
      diagnostics,
    };
    if (diagnostics.length > 0) io.printErrorJson(payload);
    else io.printJson(payload);
    if (strict && diagnostics.length > 0) return 1;
    return diagnostics.length > 0 ? 1 : 0;
  }

  if (!quiet) {
    io.printText(`Loading           ${contentPath!}`);
    io.printText(`  Result:         ${stages.load.ok ? "OK" : "FAIL"}`);
    io.printText("Validating");
    io.printText(`  Result:         ${stages.validate.ok ? "OK" : "FAIL"}`);
    io.printText("Expanding");
    io.printText(`  Result:         ${stages.expand.ok ? "OK" : "FAIL"}`);
    io.printText("Resolving");
    io.printText(`  Result:         ${stages.resolve.ok ? "OK" : "FAIL"}`);
    io.printText("Resolving assets");
    io.printText(`  Result:         ${stages.assets.ok ? "OK" : "FAIL"}`);
    io.printText("");
    io.printText(
      `Cluster IDs touched: ${
        Object.entries(clustersTouched)
          .map(([id, count]) => `${id} (${count})`)
          .join(", ") || "none"
      }`
    );
  }

  for (const diagnostic of diagnostics)
    io.printErrorText(`ERROR [${diagnostic.stage}] ${diagnostic.message}`);
  if (strict && diagnostics.length > 0) return 1;
  return diagnostics.length > 0 ? 1 : 0;
}
