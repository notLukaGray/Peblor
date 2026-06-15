import fs from "node:fs";
import path from "node:path";
import {
  peblorSchema,
  peblorDefinitionBlockSchema,
  modalBuilderSchema,
  moduleBlockSchema,
  elementBlockSchema,
  bgBlockSchema,
} from "@pb/contracts";
import { readJsonFile, isRecord } from "../lib/json-file.js";
import { findPagesDir } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type ImportArgs = {
  source?: string;
  inline?: string;
  write: boolean;
  force: boolean;
  asJson: boolean;
  help: boolean;
};

type ImportPlan = {
  pages: Record<string, unknown>;
  presets: Record<string, unknown>;
  modals: Record<string, unknown>;
  modules: Record<string, unknown>;
  globals: {
    buttons?: Record<string, unknown>;
    backgrounds?: Record<string, unknown>;
    elements?: Record<string, unknown>;
  };
};

function printHelp(io: CommandIo): void {
  io.printText("Usage: pb-cli import-figma <file> [--write] [--force] [--json]");
  io.printText("       pb-cli import-figma --inline '<json>' [--write] [--force] [--json]");
  io.printText("");
  io.printText(
    "Import Figma exporter payloads (wrapper/export-result/section-artifact) into content/."
  );
  io.printText("Default is dry-run; pass --write to persist files.");
}

function parseArgs(args: string[]): ImportArgs {
  const asJson = args.includes("--json");
  const write = args.includes("--write");
  const force = args.includes("--force");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--force", "--help", "-h"].includes(args[i] ?? "")) consumed.add(i);
  }
  const inlineIdx = args.indexOf("--inline");
  let inline: string | undefined;
  if (inlineIdx >= 0) {
    consumed.add(inlineIdx);
    consumed.add(inlineIdx + 1);
    inline = args[inlineIdx + 1];
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { source: positional[0], inline, write, force, asJson, help };
}

function normalizeRoute(input: string): string {
  const trimmed = input.trim().replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? `/${trimmed}` : "/";
}

function routeToPagePath(pagesDir: string, route: string): string {
  const normalized = route.replace(/^\/+|\/+$/g, "") || "index";
  return path.join(pagesDir, normalized, "index.json");
}

function isSectionArtifact(input: Record<string, unknown>): boolean {
  return (
    typeof input.version === "number" &&
    isRecord(input.indexPatch) &&
    isRecord(input.paths) &&
    isRecord(input.section)
  );
}

function asRecordMap(input: unknown): Record<string, unknown> {
  return isRecord(input) ? input : {};
}

function buildPlan(raw: unknown): ImportPlan {
  if (!isRecord(raw)) {
    return { pages: {}, presets: {}, modals: {}, modules: {}, globals: {} };
  }

  if (isSectionArtifact(raw)) {
    const indexPatch = asRecordMap(raw.indexPatch);
    const section = asRecordMap(raw.section);
    const sectionId =
      typeof raw.sectionId === "string" && raw.sectionId.trim() ? raw.sectionId : "section";
    const slug =
      typeof indexPatch.slug === "string" && indexPatch.slug.trim() ? indexPatch.slug : "imported";
    const title = typeof indexPatch.title === "string" ? indexPatch.title : slug;
    const definitions = asRecordMap(indexPatch.definitions);
    definitions[sectionId] = section;
    return {
      pages: {
        [slug]: {
          title,
          slug,
          sectionOrder: [sectionId],
          definitions,
        },
      },
      presets: {},
      modals: {},
      modules: {},
      globals: {},
    };
  }

  if (
    isRecord(raw.pages) ||
    isRecord(raw.presets) ||
    isRecord(raw.modals) ||
    isRecord(raw.modules)
  ) {
    return {
      pages: asRecordMap(raw.pages),
      presets: asRecordMap(raw.presets),
      modals: asRecordMap(raw.modals),
      modules: asRecordMap(raw.modules),
      globals: asRecordMap(raw.globals) as ImportPlan["globals"],
    };
  }

  const slug = typeof raw.slug === "string" && raw.slug.trim() ? raw.slug : "imported";
  return {
    pages: { [slug]: raw },
    presets: {},
    modals: {},
    modules: {},
    globals: {},
  };
}

export async function runImportFigma(args: string[], io: CommandIo): Promise<number> {
  const opts = parseArgs(args);
  if (opts.help || (!opts.source && !opts.inline)) {
    printHelp(io);
    return opts.help ? 0 : 2;
  }

  let raw: unknown;
  if (opts.inline) {
    try {
      raw = JSON.parse(opts.inline);
    } catch (err) {
      const message = `Failed to parse inline JSON: ${err instanceof Error ? err.message : String(err)}`;
      if (opts.asJson) io.printErrorJson({ command: "import-figma", status: "error", message });
      else io.printErrorText(`Error: ${message}`);
      return 2;
    }
  } else {
    const read = readJsonFile(opts.source!);
    if (!read.ok) {
      if (opts.asJson)
        io.printErrorJson({ command: "import-figma", status: "error", message: read.error });
      else io.printErrorText(`Error: ${read.error}`);
      return 2;
    }
    raw = read.value;
  }

  const plan = buildPlan(raw);
  const diagnostics: Array<{ severity: "error"; bucket: string; key: string; message: string }> =
    [];

  for (const [key, page] of Object.entries(plan.pages)) {
    const parsed = peblorSchema.safeParse(page);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "pages",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid page",
      });
  }
  for (const [key, preset] of Object.entries(plan.presets)) {
    const parsed = peblorDefinitionBlockSchema.safeParse(preset);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "presets",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid preset",
      });
  }
  for (const [key, modal] of Object.entries(plan.modals)) {
    const parsed = modalBuilderSchema.safeParse(modal);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "modals",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid modal",
      });
  }
  for (const [key, module] of Object.entries(plan.modules)) {
    const parsed = moduleBlockSchema.safeParse(module);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "modules",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid module",
      });
  }
  for (const [key, bg] of Object.entries(asRecordMap(plan.globals.backgrounds))) {
    const parsed = bgBlockSchema.safeParse(bg);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "globals.backgrounds",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid background",
      });
  }
  for (const [key, el] of Object.entries(asRecordMap(plan.globals.buttons))) {
    const parsed = elementBlockSchema.safeParse(el);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "globals.buttons",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid button",
      });
  }
  for (const [key, el] of Object.entries(asRecordMap(plan.globals.elements))) {
    const parsed = elementBlockSchema.safeParse(el);
    if (!parsed.success)
      diagnostics.push({
        severity: "error",
        bucket: "globals.elements",
        key,
        message: parsed.error.issues[0]?.message ?? "Invalid element",
      });
  }

  const pagesDir = findPagesDir();
  const contentDir = path.join(process.cwd(), "content");
  if (!pagesDir || !fs.existsSync(contentDir)) {
    const message = "content/ directories not found. Run from project root.";
    if (opts.asJson) io.printErrorJson({ command: "import-figma", status: "error", message });
    else io.printErrorText(`Error: ${message}`);
    return 2;
  }

  const writes: string[] = [];
  const collisions: string[] = [];
  const queue: Array<{ file: string; value: unknown }> = [];

  for (const [slug, page] of Object.entries(plan.pages)) {
    const route = normalizeRoute(slug);
    const file = routeToPagePath(pagesDir, route);
    queue.push({ file, value: page });
  }
  for (const [id, preset] of Object.entries(plan.presets)) {
    queue.push({ file: path.join(contentDir, "presets", `${id}.json`), value: preset });
  }
  for (const [id, modal] of Object.entries(plan.modals)) {
    queue.push({ file: path.join(contentDir, "modals", `${id}.json`), value: modal });
  }
  for (const [id, module] of Object.entries(plan.modules)) {
    queue.push({ file: path.join(contentDir, "modules", `${id}.json`), value: module });
  }

  for (const item of queue) {
    if (fs.existsSync(item.file) && !opts.force)
      collisions.push(path.relative(process.cwd(), item.file));
  }

  const canWrite = diagnostics.length === 0 && collisions.length === 0;
  if (opts.write && canWrite) {
    for (const item of queue) {
      fs.mkdirSync(path.dirname(item.file), { recursive: true });
      fs.writeFileSync(item.file, `${JSON.stringify(item.value, null, 2)}\n`, "utf8");
      writes.push(path.relative(process.cwd(), item.file));
    }
  }

  const result = {
    command: "import-figma",
    status: diagnostics.length > 0 ? "error" : "ok",
    writeRequested: opts.write,
    wrote: writes.length,
    planned: queue.length,
    diagnostics,
    collisions,
    files: opts.write ? writes : queue.map((q) => path.relative(process.cwd(), q.file)),
  };

  if (opts.asJson) {
    if (diagnostics.length > 0 || collisions.length > 0) io.printErrorJson(result);
    else io.printJson(result);
  } else {
    io.printText(`Planned writes: ${queue.length}`);
    if (diagnostics.length > 0) io.printText(`Validation errors: ${diagnostics.length}`);
    if (collisions.length > 0) io.printText(`Collisions: ${collisions.length}`);
    if (opts.write && canWrite) io.printText(`Wrote ${writes.length} file(s).`);
  }

  if (diagnostics.length > 0) return 1;
  if (collisions.length > 0) return 1;
  return 0;
}
