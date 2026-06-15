import fs from "node:fs";
import path from "node:path";
import { findPagesDir, findPresetsDir, walkAllPages, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

function collectPresetRefs(node: unknown, refs: Set<string>): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectPresetRefs(item, refs));
    return;
  }
  if (!isRecord(node)) return;
  if (typeof node.preset === "string") refs.add(node.preset);
  if (Array.isArray(node.presets)) {
    for (const p of node.presets) {
      if (typeof p === "string") refs.add(p);
    }
  }
  if (isRecord(node.preset)) {
    for (const v of Object.values(node.preset)) {
      if (typeof v === "string") refs.add(v);
    }
  }
  for (const v of Object.values(node)) collectPresetRefs(v, refs);
}

function listAllPresetIds(presetsDir: string): string[] {
  const ids: string[] = [];
  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-cli] Failed to read presets directory", dir, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        ids.push(entry.name.replace(/\.json$/, ""));
      }
    }
  }
  walk(presetsDir);
  return ids.sort();
}

export async function runListUnusedPresets(args: string[], io: CommandIo): Promise<number> {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");

  if (help) {
    io.printText("Usage: pb-cli list-unused-presets [--json]");
    io.printText("\nReports presets not referenced by any page.");
    return 0;
  }

  const pagesDir = findPagesDir();
  const presetsDir = findPresetsDir();

  if (!presetsDir) {
    const msg = "content/presets not found. Run from the project root.";
    if (asJson)
      io.printErrorJson({ command: "list-unused-presets", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const allPresetIds = listAllPresetIds(presetsDir);
  const refs = new Set<string>();

  if (pagesDir) {
    for (const { data } of walkAllPages(pagesDir)) {
      collectPresetRefs(data, refs);
    }
  }

  const unused = allPresetIds.filter((id) => !refs.has(id));

  if (asJson) {
    io.printJson({
      command: "list-unused-presets",
      totalPresets: allPresetIds.length,
      usedCount: allPresetIds.length - unused.length,
      unusedCount: unused.length,
      unused,
    });
  } else {
    io.printText(`Unused presets: ${unused.length}/${allPresetIds.length}`);
    for (const id of unused) io.printText(`  ${id}`);
    if (unused.length === 0) io.printText("  (all presets are referenced)");
  }

  return unused.length > 0 ? 1 : 0;
}
