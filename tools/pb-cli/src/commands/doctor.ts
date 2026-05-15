import { loadPage } from "@pb/core/load";
import { validatePage } from "@pb/core/validate";
import { expandPage } from "@pb/core/resolve";
import { resolveAssets } from "@pb/core/resolve";
import { loadCatalog } from "@pb/catalog";
import type { CatalogEntry } from "@pb/catalog";
import { sectionDefinitionBlockSchema, type Peblor } from "@pb/contracts";
import { schemaTypeHint } from "./explain-schema.js";
import { readJsonFile } from "../lib/json-file.js";
import type { CommandIo } from "./types.js";

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
    if (["--json", "--verbose", "--quiet", "--strict", "--help", "-h"].includes(args[i]))
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

function formatIssuePath(path: Array<string | number | symbol>): string {
  if (path.length === 0) return "$";
  return `$.${path.map((segment) => String(segment)).join(".")}`;
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

    const parsed = sectionDefinitionBlockSchema.safeParse(read.value);
    const diagnostics = parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
          severity: "error",
          stage: "validate",
          code: "PB_DOCTOR_FRAGMENT_INVALID",
          path: formatIssuePath(issue.path),
          message: issue.message,
        }));

    if (asJson) {
      const payload = {
        command: "doctor",
        mode: "fragment",
        schema_version: 1,
        input: fragmentPath,
        schema: "sectionDefinitionBlockSchema",
        valid: parsed.success,
        diagnostics,
      };
      if (!parsed.success) io.printErrorJson(payload);
      else io.printJson(payload);
    } else {
      io.printText(`Validating fragment ${fragmentPath}`);
      io.printText(`  Result:         ${parsed.success ? "OK" : "FAIL"}`);
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
  let expanded: ReturnType<typeof expandPage> | null = null;
  let assets: ReturnType<typeof resolveAssets> | null = null;

  try {
    loaded = await loadPage(contentPath!);
    stages.load = { ok: true, details: { file: loaded.filePath } };
  } catch (error) {
    stages.load = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (
    stages.load.ok &&
    loaded &&
    (!stage || ["validate", "expand", "resolve", "assets"].includes(stage))
  ) {
    validated = validatePage(loaded.raw);
    stages.validate = {
      ok: validated.valid,
      ...(validated.valid
        ? { details: { schema: "peblorSchema" } }
        : { error: validated.diagnostics.map((d) => d.message).join("; ") }),
    };
  }

  if (stages.validate.ok && (!stage || ["expand", "resolve", "assets"].includes(stage))) {
    try {
      expanded = expandPage(validated!.page as Peblor);
      stages.expand = { ok: true, details: { sections: expanded.sections.length } };
    } catch (error) {
      stages.expand = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const shouldRunResolve =
    stages.expand.ok && (!stage || stage === "resolve" || stage === "assets");
  const shouldRunAssetManifest = stages.expand.ok && (!stage || stage === "assets");

  if (shouldRunResolve) {
    try {
      assets = resolveAssets(validated!.page as Peblor);
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
        assets = resolveAssets(validated!.page as Peblor);
      }
      const resolvedSections = assets?.resolvedSections ?? [];

      // Surface asset manifest: collect all asset keys from the resolved page.
      const assetUrlSet = new Set<string>();
      collectAssetUrls((validated!.page as Peblor & { bg?: unknown }).bg, assetUrlSet);
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

  const typeTally = new Map<string, number>();
  if (assets?.resolvedSections) walkTypes(assets.resolvedSections, typeTally);
  const catalog = loadCatalog();
  const byType = entryMapByType(catalog.entries);
  const clustersTouched = Object.fromEntries(
    [...typeTally.entries()]
      .map(([type, count]) => [byType.get(type) ?? type, count])
      .sort((a, b) => Number(b[1]) - Number(a[1]))
  );

  const diagnostics = Object.entries(stages)
    .filter(([, result]) => !result.ok && result.error)
    .map(([stageName, result]) => ({
      severity: "error",
      stage: stageName,
      code: "PB_DOCTOR_STAGE_FAILED",
      message: result.error,
      suggested_action: `Inspect ${stageName} stage inputs and run pb-cli explain on related cluster ids.`,
    }));

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
