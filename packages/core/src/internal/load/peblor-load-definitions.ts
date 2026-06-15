import fsPromises from "fs/promises";
import path from "path";
import type { PeblorDefinitionBlock } from "@pb/contracts";
import { isSafePathSegment, resolvePathUnder } from "../peblor-paths";
import { resolvePresets } from "../peblor-presets";
import { parseJsonSafe, CONTENT_DIR } from "./peblor-load-io";
import { hydrateSectionFilesBySegmentsAsync } from "./peblor-load-definitions-hydrate";

const MODULES_DIR = path.join(CONTENT_DIR, "modules");

function collectModuleRefs(defs: Record<string, unknown>): Set<string> {
  const refs = new Set<string>();
  for (const value of Object.values(defs)) {
    walkForModules(value, refs);
  }
  return refs;
}

function walkForModules(node: unknown, refs: Set<string>): void {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkForModules(item, refs);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.module === "string") refs.add(obj.module);
  for (const value of Object.values(obj)) walkForModules(value, refs);
}

async function loadModuleFile(key: string): Promise<PeblorDefinitionBlock | null> {
  if (!isSafePathSegment(key)) return null;
  const filePath = resolvePathUnder(MODULES_DIR, `${key}.json`);
  if (!filePath) return null;
  try {
    const raw = await fsPromises.readFile(filePath, "utf-8");
    const result = parseJsonSafe<unknown>(raw);
    if (!result.ok || !result.data || typeof result.data !== "object" || !("type" in result.data)) {
      return null;
    }
    return result.data as PeblorDefinitionBlock;
  } catch (err) {
    console.warn("[pb-core] Failed to read/parse module file", key, err);
    return null;
  }
}

export async function mergeGlobalModulesIntoDefinitionsAsync(
  definitions: Record<string, PeblorDefinitionBlock>
): Promise<Record<string, PeblorDefinitionBlock>> {
  const needed = collectModuleRefs(definitions as Record<string, unknown>);
  if (needed.size === 0) return { ...definitions };

  const modules: Record<string, PeblorDefinitionBlock> = {};
  const results = await Promise.all(
    [...needed].map(async (key) => {
      try {
        const data = await loadModuleFile(key);
        return data ? { key, data } : null;
      } catch {
        return null;
      }
    })
  );
  for (const r of results) {
    if (r) modules[r.key] = r.data;
  }
  return { ...modules, ...definitions };
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
