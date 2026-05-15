import fs from "node:fs";
import path from "node:path";
import { findCluster, loadCatalog } from "@pb/catalog";
import { explainFieldDetails } from "./explain-schema.js";
import type { CatalogEntry } from "@pb/catalog";
import type { CommandIo } from "./types.js";

type ExamplePayload = { path: string; content: unknown | null; error?: string };

function loadExample(coverPath: string): ExamplePayload {
  const absolute = path.join(process.cwd(), "apps", "web", coverPath);
  if (!fs.existsSync(absolute)) return { path: coverPath, content: null, error: "missing file" };
  const raw = fs.readFileSync(absolute, "utf8");
  try {
    return { path: coverPath, content: JSON.parse(raw) as unknown };
  } catch {
    return { path: coverPath, content: raw, error: "invalid JSON" };
  }
}

function axisLine(name: string, fields: string[], responsive?: boolean, note?: string): string {
  const suffix = [responsive ? "responsive" : null, note ?? null].filter(Boolean).join("; ");
  return suffix
    ? `  ${name.padEnd(15)} ${fields.join(", ")} (${suffix})`
    : `  ${name.padEnd(15)} ${fields.join(", ")}`;
}

function renderExplainText(
  entryId: string
): { ok: true; text: string } | { ok: false; error: string } {
  const entry = findCluster(entryId);
  if (!entry) return { ok: false, error: `Catalog entry not found: ${entryId}` };

  const lines: string[] = [];
  lines.push(`${entry.id} [${entry.kind}, ${entry.stability}, schema v${entry.schema_version}]`);
  lines.push(
    entry.runtime_ref
      ? `${entry.package}/${entry.schema_ref} -> ${entry.runtime_ref}`
      : `${entry.package}/${entry.schema_ref}`
  );
  lines.push("", "FEELS LIKE", `  ${entry.feels_like}`, "", "NOT THIS IF");
  for (const item of entry.does_not_cover) lines.push(`  - ${item.what} -> ${item.use_instead}`);
  lines.push("", "AXES");
  for (const axis of entry.axes)
    lines.push(axisLine(axis.name, axis.fields, axis.responsive, axis.note));

  if (entry.composes_with) {
    lines.push("", "COMPOSES WITH", `  parents: ${entry.composes_with.parents.join(", ")}`);
    if (entry.composes_with.siblings_typical?.length)
      lines.push(`  siblings: ${entry.composes_with.siblings_typical.join(", ")}`);
    if (entry.composes_with.motion) lines.push(`  motion: ${entry.composes_with.motion}`);
  }
  if (entry.known_limitations?.length) {
    lines.push("", "KNOWN LIMITATIONS");
    for (const limitation of entry.known_limitations) lines.push(`  - ${limitation}`);
  }
  if (entry.covers.length > 0) {
    lines.push("", "EXAMPLES");
    for (const example of entry.covers)
      lines.push(`  ${example.example} \"${example.description}\"`);
    lines.push("", "Run with --examples to inline example JSON.");
  }
  return { ok: true, text: lines.join("\n") };
}

function summarize(entry: CatalogEntry): string {
  const firstSentence = entry.feels_like.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  const maxLen = 80;
  if (firstSentence.length <= maxLen) return firstSentence;
  return firstSentence.slice(0, maxLen - 3) + "...";
}

function idPad(entries: CatalogEntry[]): number {
  return Math.max(...entries.map((e) => e.id.length)) + 2;
}

const GROUP_LABELS: Record<string, string> = {
  element: "ELEMENTS",
  section: "SECTIONS",
  background: "BACKGROUNDS",
  trigger: "TRIGGERS",
  motion: "MOTION PRESETS",
  module: "MODULE",
  modal: "MODAL",
};

const GROUP_ORDER = ["element", "section", "background", "trigger", "motion", "module", "modal"];

function categoryOf(entry: CatalogEntry): string {
  const dot = entry.id.indexOf(".");
  return dot >= 0 ? entry.id.slice(0, dot) : entry.id;
}

function groupEntries(entries: CatalogEntry[]): Map<string, CatalogEntry[]> {
  const groups = new Map<string, CatalogEntry[]>();
  for (const e of entries) {
    const cat = categoryOf(e);
    const list = groups.get(cat) ?? [];
    list.push(e);
    groups.set(cat, list);
  }
  return groups;
}

function renderAllText(allEntries: CatalogEntry[]): string {
  const grouped = groupEntries(allEntries);
  const lines: string[] = [];
  for (const cat of GROUP_ORDER) {
    const entries = grouped.get(cat);
    if (!entries || entries.length === 0) continue;
    entries.sort((a, b) => a.id.localeCompare(b.id));
    const label = GROUP_LABELS[cat] ?? cat.toUpperCase();
    lines.push(`${label} (${entries.length})`);
    const pad = idPad(entries);
    for (const e of entries) lines.push(`  ${e.id.padEnd(pad)} ${summarize(e)}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

async function runExplainAll(args: string[], io: CommandIo): Promise<number> {
  const asJson = args.includes("--json");
  const kindIndex = args.indexOf("--kind");
  const kindFilter = kindIndex >= 0 ? args[kindIndex + 1] : undefined;
  const allEntries = loadCatalog().entries;

  const filtered = kindFilter
    ? allEntries.filter((e) => {
        if (kindFilter === "element" || kindFilter === "section" || kindFilter === "background")
          return e.id.startsWith(kindFilter + ".");
        if (kindFilter === "trigger") return e.kind === "trigger";
        if (kindFilter === "motion") return e.id.startsWith("motion.");
        return e.id === kindFilter;
      })
    : allEntries;

  if (asJson) {
    io.printJson({
      command: "explain",
      all: true,
      ...(kindFilter ? { kind: kindFilter } : {}),
      count: filtered.length,
      entries: filtered.map((e) => ({
        id: e.id,
        kind: e.kind,
        stability: e.stability,
        feels_like: e.feels_like,
      })),
    });
    return 0;
  }

  io.printText(renderAllText(filtered));
  return 0;
}

export async function runExplain(entryId: string, args: string[], io: CommandIo): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    io.printText(
      "Usage: pb-cli explain <cluster-id> [--fields] [--examples] [--example <index|path-fragment>] [--json]"
    );
    io.printText(
      "       pb-cli explain --all [--kind <element|trigger|motion|section|background>] [--json]"
    );
    return 0;
  }
  if (entryId === "--all" || args.includes("--all")) {
    return runExplainAll(args, io);
  }
  const asJson = args.includes("--json");
  const includeFields = args.includes("--fields");
  const exampleIndex = args.indexOf("--example");
  const singleExampleSelector = exampleIndex >= 0 ? args[exampleIndex + 1] : undefined;
  const includeExamples = args.includes("--examples") || !!singleExampleSelector;
  const entry = findCluster(entryId);
  if (!entry) {
    if (asJson)
      io.printErrorJson({
        command: "explain",
        status: "error",
        message: `Catalog entry not found: ${entryId}`,
      });
    else io.printErrorText(`Catalog entry not found: ${entryId}`);
    return 1;
  }

  if (asJson) {
    const examples = includeExamples
      ? entry.covers.map((cover) => ({
          description: cover.description,
          ...loadExample(cover.example),
        }))
      : undefined;
    const fields = includeFields ? explainFieldDetails(entry) : undefined;
    io.printJson({
      command: "explain",
      entry,
      ...(fields ? { fields } : {}),
      ...(examples ? { examples } : {}),
    });
    return 0;
  }

  const rendered = renderExplainText(entryId);
  if (!rendered.ok) {
    io.printErrorText(`${"error" in rendered ? rendered.error : "Failed to render"}`);
    return 1;
  }
  io.printText(rendered.text);

  if (includeFields) {
    const fields = explainFieldDetails(entry);
    if (fields.length > 0) {
      io.printText("");
      io.printText("FIELDS");
      for (const field of fields) {
        const suffix = field.enum_values?.length ? ` enum(${field.enum_values.join(" | ")})` : "";
        io.printText(`  - ${field.field}: ${field.type}${field.optional ? "?" : ""}${suffix}`);
      }
    }
  }

  if (includeExamples) {
    const selectedCovers = singleExampleSelector
      ? entry.covers.filter((cover, idx) => {
          if (singleExampleSelector === String(idx)) return true;
          return cover.example.includes(singleExampleSelector);
        })
      : entry.covers;
    io.printText("");
    io.printText("EXAMPLE CONTENT");
    for (const [idx, cover] of selectedCovers.entries()) {
      const example = loadExample(cover.example);
      io.printText(`  ----- example ${idx} -----`);
      io.printText(`  ${cover.example}`);
      if (example.error) io.printText(`  (${example.error})`);
      io.printText(
        typeof example.content === "string"
          ? example.content
          : JSON.stringify(example.content, null, 2)
      );
    }
    if (singleExampleSelector && selectedCovers.length === 0)
      io.printText(`  No example matched selector: ${singleExampleSelector}`);
  }
  return 0;
}
