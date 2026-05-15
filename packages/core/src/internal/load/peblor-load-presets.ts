import path from "path";
import { isSafePathSegment, resolvePathUnder } from "../peblor-paths";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { readJsonFileSafe, coercePresetMap, CONTENT_DIR } from "./peblor-load-io";

const PRESETS_PATH = path.join(CONTENT_DIR, "data/presets.json");
const PRESETS_DIR = path.join(CONTENT_DIR, "presets");

function isSingleBlock(data: unknown): data is Record<string, unknown> {
  return (
    data != null && typeof data === "object" && !Array.isArray(data) && "type" in (data as object)
  );
}

async function loadPresetFiles(files: string[]): Promise<Record<string, PeblorDefinitionBlock>> {
  const presets: Record<string, PeblorDefinitionBlock> = {};
  const entries = files
    .filter((entry): entry is string => typeof entry === "string")
    .map((file) => {
      const basename = path.basename(file, ".json");
      const filePath = isSafePathSegment(basename)
        ? resolvePathUnder(PRESETS_DIR, `${basename}.json`)
        : null;
      return { basename, filePath };
    })
    .filter((item): item is { basename: string; filePath: string } => item.filePath != null);

  const results = await Promise.all(
    entries.map(async ({ basename, filePath }) => {
      try {
        const data = await readJsonFileSafe(filePath);
        if (data === null) return null;
        if (isSingleBlock(data)) {
          return { basename, data: data as PeblorDefinitionBlock };
        }
        return { basename, map: coercePresetMap(data) };
      } catch {
        return null;
      }
    })
  );
  for (const r of results) {
    if (!r) continue;
    if ("data" in r) presets[r.basename] = r.data as PeblorDefinitionBlock;
    else Object.assign(presets, r.map);
  }
  return presets;
}

async function loadGlobalPresets(): Promise<Record<string, PeblorDefinitionBlock>> {
  const data = await readJsonFileSafe(PRESETS_PATH);
  if (data === null) return {};
  const obj = data as Record<string, unknown>;
  const loadList = obj.load;
  if (Array.isArray(loadList) && loadList.length > 0) {
    return loadPresetFiles(loadList as string[]);
  }
  return coercePresetMap(data);
}

export async function buildPresetsAsync(
  withSlug: Record<string, unknown>
): Promise<Record<string, PeblorDefinitionBlock>> {
  const presets = { ...(await loadGlobalPresets()) };
  const pagePresetFiles = withSlug.presets as string[] | undefined;
  if (Array.isArray(pagePresetFiles) && pagePresetFiles.length > 0) {
    Object.assign(presets, await loadPresetFiles(pagePresetFiles));
  }
  const inlinePresets = withSlug.preset as Record<string, unknown> | undefined;
  if (inlinePresets && typeof inlinePresets === "object") {
    Object.assign(presets, coercePresetMap(inlinePresets));
  }
  return presets;
}
