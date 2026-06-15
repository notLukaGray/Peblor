import path from "path";
import fsPromises from "fs/promises";
import { isSafePresetRef } from "../peblor-paths";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { readJsonFileSafe, coercePresetMap, CONTENT_DIR } from "./peblor-load-io";

function mergeIntoPresets(
  target: Record<string, PeblorDefinitionBlock>,
  incoming: Record<string, PeblorDefinitionBlock>
): void {
  for (const key of Object.keys(incoming)) {
    if (key in target && process.env.NODE_ENV !== "production") {
      console.warn(
        `[peblor] Preset key collision: "${key}" is defined in multiple preset files. Last-loaded wins.`
      );
    }
  }
  Object.assign(target, incoming);
}

const PRESETS_PATH = path.join(CONTENT_DIR, "data/presets.json");
const PRESETS_DIR = path.join(CONTENT_DIR, "presets");

function isSingleBlock(data: unknown): data is Record<string, unknown> {
  return (
    data != null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    ("type" in (data as object) || "preset" in (data as object))
  );
}

async function dirExists(absPath: string): Promise<boolean> {
  try {
    const stat = await fsPromises.stat(absPath);
    return stat.isDirectory();
  } catch (err) {
    console.warn("[pb-core] Directory check failed", absPath, err);
    return false;
  }
}

async function fileExists(absPath: string): Promise<boolean> {
  try {
    const stat = await fsPromises.stat(absPath);
    return stat.isFile();
  } catch (err) {
    console.warn("[pb-core] File check failed", absPath, err);
    return false;
  }
}

async function loadSinglePresetFile(
  filePath: string,
  key: string
): Promise<Record<string, PeblorDefinitionBlock> | null> {
  try {
    const data = await readJsonFileSafe(filePath);
    if (data === null) return null;
    if (isSingleBlock(data)) {
      return { [key]: data as PeblorDefinitionBlock };
    }
    return coercePresetMap(data);
  } catch (err) {
    console.warn("[pb-core] Failed to load single preset file", filePath, key, err);
    return null;
  }
}

async function loadPresetDirectory(
  dirPath: string
): Promise<Record<string, PeblorDefinitionBlock>> {
  const presets: Record<string, PeblorDefinitionBlock> = {};
  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const basename = entry.name.slice(0, -5);
      const filePath = path.join(dirPath, entry.name);
      const result = await loadSinglePresetFile(filePath, basename);
      if (result) mergeIntoPresets(presets, result);
    }
  } catch (err) {
    console.warn("[pb-core] Failed to read preset directory", dirPath, err);
  }
  return presets;
}

async function loadPresetRefs(refs: string[]): Promise<Record<string, PeblorDefinitionBlock>> {
  const presets: Record<string, PeblorDefinitionBlock> = {};

  for (const ref of refs) {
    if (!isSafePresetRef(ref)) continue;

    if (ref.endsWith(".json")) {
      // Legacy flat file: "typography.json" or subdirectory: "typography/type-h1-display.json"
      const absPath = path.resolve(PRESETS_DIR, ref);
      const key = path.basename(ref, ".json");
      const result = await loadSinglePresetFile(absPath, key);
      if (result) mergeIntoPresets(presets, result);
      continue;
    }

    // Directory reference: "typography" or "bg/variable"
    const dirPath = path.resolve(PRESETS_DIR, ref);
    if (await dirExists(dirPath)) {
      mergeIntoPresets(presets, await loadPresetDirectory(dirPath));
      continue;
    }

    // Fallback: legacy flat file without .json extension
    const legacyPath = path.resolve(PRESETS_DIR, `${ref}.json`);
    if (await fileExists(legacyPath)) {
      const key = path.basename(ref);
      const result = await loadSinglePresetFile(legacyPath, key);
      if (result) mergeIntoPresets(presets, result);
    }
  }

  return presets;
}

async function loadGlobalPresets(): Promise<Record<string, PeblorDefinitionBlock>> {
  const data = await readJsonFileSafe(PRESETS_PATH);
  if (data === null) return {};
  const obj = data as Record<string, unknown>;
  const loadList = obj.load;
  if (Array.isArray(loadList) && loadList.length > 0) {
    return loadPresetRefs(loadList as string[]);
  }
  return coercePresetMap(data);
}

export async function buildPresetsAsync(
  withSlug: Record<string, unknown>
): Promise<Record<string, PeblorDefinitionBlock>> {
  const presets = { ...(await loadGlobalPresets()) };
  const pagePresetFiles = withSlug.presets as string[] | undefined;
  if (Array.isArray(pagePresetFiles) && pagePresetFiles.length > 0) {
    mergeIntoPresets(presets, await loadPresetRefs(pagePresetFiles));
  }
  const inlinePresets = withSlug.preset as Record<string, unknown> | undefined;
  if (inlinePresets && typeof inlinePresets === "object") {
    mergeIntoPresets(presets, coercePresetMap(inlinePresets));
  }
  return presets;
}
