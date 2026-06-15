import fsPromises from "fs/promises";
import path from "path";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { isSafePathSegment, resolvePathUnder } from "../peblor-paths";
import { parseJsonSafe, PAGE_DATA_DIR } from "./peblor-load-io";

import { sortedReaddir } from "./sorted-readdir";

function warnDuplicateFragmentKeys(dupes: Map<string, string[]>): void {
  if (process.env.NODE_ENV !== "development" || dupes.size === 0) return;
  for (const [key, files] of dupes.entries()) {
    console.warn(`[peblor] duplicate fragment key "${key}" in: ${files.join(", ")}`);
  }
}

function sectionPath(slugSegments: string[], key: string): string | null {
  return resolvePathUnder(PAGE_DATA_DIR, ...slugSegments, `${key}.json`);
}

async function readJsonFileAsync(filePath: string): Promise<Record<string, unknown> | null> {
  const raw = await fsPromises.readFile(filePath, "utf-8");
  const result = parseJsonSafe<Record<string, unknown>>(raw);
  return result.ok && result.data && typeof result.data === "object" ? result.data : null;
}

type Fragment = { file: string; data: Record<string, unknown> };

function mergeFragments(
  definitions: Record<string, PeblorDefinitionBlock>,
  fragments: Fragment[],
  sectionSet: ReadonlySet<string>
): void {
  const keySources = new Map<string, string[]>();
  for (const fragment of fragments) {
    for (const [key, value] of Object.entries(fragment.data)) {
      if (sectionSet.has(key)) continue;
      if (value && typeof value === "object" && !Array.isArray(value) && "type" in value) {
        definitions[key] = value as PeblorDefinitionBlock;
        const list = keySources.get(key) ?? [];
        list.push(fragment.file);
        keySources.set(key, list);
      }
    }
  }
  const dupes = new Map<string, string[]>();
  for (const [key, files] of keySources.entries()) {
    if (files.length > 1) dupes.set(key, files);
  }
  warnDuplicateFragmentKeys(dupes);
}

export async function hydrateSectionFilesBySegmentsAsync(
  definitions: Record<string, PeblorDefinitionBlock>,
  slugSegments: string[],
  sectionOrder: string[]
): Promise<Record<string, PeblorDefinitionBlock>> {
  for (const seg of slugSegments) if (!isSafePathSegment(seg)) return definitions;
  const slugDir = resolvePathUnder(PAGE_DATA_DIR, ...slugSegments);
  if (!slugDir) return definitions;
  try {
    const stat = await fsPromises.stat(slugDir);
    if (!stat.isDirectory()) return definitions;
  } catch (err) {
    console.warn("[pb-core] Failed to stat page directory", slugDir, err);
    return definitions;
  }

  const sectionSet = new Set(sectionOrder);
  for (const key of sectionOrder) {
    if (!isSafePathSegment(key) || definitions[key] != null) continue;
    const filePath = sectionPath(slugSegments, key);
    if (!filePath) continue;
    let sectionData: Record<string, unknown> | null;
    try {
      sectionData = await readJsonFileAsync(filePath);
    } catch (readErr) {
      console.warn("[pb-core] Failed to read section fragment", filePath, readErr);
      sectionData = null;
    }
    if (!sectionData) continue;
    definitions[key] = sectionData as PeblorDefinitionBlock;
    // Extract the section file's `definitions` sub-object into the top-level definitions.
    // This lets section files colocate their element definitions alongside the section block.
    // Protected keys (those already in sectionOrder) are never overwritten.
    const nestedDefs = sectionData.definitions;
    if (nestedDefs && typeof nestedDefs === "object" && !Array.isArray(nestedDefs)) {
      for (const [nestedKey, value] of Object.entries(nestedDefs as Record<string, unknown>)) {
        if (sectionSet.has(nestedKey)) continue;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          if (process.env.NODE_ENV === "development" && definitions[nestedKey] !== undefined) {
            console.warn(
              `[pb-core] Element key "${nestedKey}" in section file "${key}" overwrites an existing definition`
            );
          }
          definitions[nestedKey] = value as PeblorDefinitionBlock;
        }
      }
    }
  }

  const files = (await sortedReaddir(slugDir))
    .filter((file) => file.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  const fragments: Fragment[] = [];
  for (const file of files) {
    const basename = path.basename(file, ".json");
    if (!isSafePathSegment(basename)) continue;
    if (basename === "index" || sectionSet.has(basename) || basename.endsWith("-sections"))
      continue;
    const filePath = resolvePathUnder(PAGE_DATA_DIR, ...slugSegments, file);
    if (!filePath) continue;
    let data: Record<string, unknown> | null;
    try {
      data = await readJsonFileAsync(filePath);
    } catch (readErr) {
      console.warn("[pb-core] Failed to read fragment file", filePath, readErr);
      data = null;
    }
    if (data) fragments.push({ file, data });
  }
  mergeFragments(definitions, fragments, sectionSet);
  return definitions;
}
