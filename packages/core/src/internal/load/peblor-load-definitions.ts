import fsPromises from "fs/promises";
import path from "path";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { isSafePathSegment, resolvePathUnder } from "../peblor-paths";
import { resolvePresets } from "../peblor-presets";
import { parseJsonSafe, CONTENT_DIR } from "./peblor-load-io";
import { hydrateSectionFilesBySegmentsAsync } from "./peblor-load-definitions-hydrate";

const MODULES_DIR = path.join(CONTENT_DIR, "modules");

async function loadGlobalModulesAsync(): Promise<Record<string, PeblorDefinitionBlock>> {
  try {
    const stat = await fsPromises.stat(MODULES_DIR);
    if (!stat.isDirectory()) return {};
  } catch {
    return {};
  }
  const files = (await fsPromises.readdir(MODULES_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b));
  const results = await Promise.all(
    files.map(async (file) => {
      const key = path.basename(file, ".json");
      if (!isSafePathSegment(key)) return null;
      const filePath = resolvePathUnder(MODULES_DIR, `${key}.json`);
      if (!filePath) return null;
      const raw = await fsPromises.readFile(filePath, "utf-8");
      const result = parseJsonSafe<unknown>(raw);
      if (
        !result.ok ||
        !result.data ||
        typeof result.data !== "object" ||
        !("type" in result.data)
      ) {
        return null;
      }
      return { key, data: result.data as PeblorDefinitionBlock };
    })
  );
  const modules: Record<string, PeblorDefinitionBlock> = {};
  for (const result of results) {
    if (result) modules[result.key] = result.data;
  }
  return modules;
}

export function getDefinitionsForPage(
  withSlug: Record<string, unknown>,
  _slug: string
): Record<string, PeblorDefinitionBlock> {
  const definitions = withSlug.definitions as Record<string, PeblorDefinitionBlock> | undefined;
  if (!definitions || typeof definitions !== "object" || Object.keys(definitions).length === 0) {
    return {};
  }
  return { ...definitions };
}

export async function getDefinitionsForPageAsync(
  withSlug: Record<string, unknown>,
  _slug: string
): Promise<Record<string, PeblorDefinitionBlock>> {
  return getDefinitionsForPage(withSlug, _slug);
}

export async function mergeGlobalModulesIntoDefinitionsAsync(
  definitions: Record<string, PeblorDefinitionBlock>
): Promise<Record<string, PeblorDefinitionBlock>> {
  return { ...(await loadGlobalModulesAsync()), ...definitions };
}

export { hydrateSectionFilesBySegmentsAsync };

export function resolveDefinitionPresets(
  definitions: Record<string, PeblorDefinitionBlock>,
  presets: Record<string, PeblorDefinitionBlock>
): Record<string, PeblorDefinitionBlock> {
  const resolved: Record<string, PeblorDefinitionBlock> = {};
  for (const [key, block] of Object.entries(definitions)) {
    resolved[key] = resolvePresets(block, presets);
  }
  return resolved;
}
