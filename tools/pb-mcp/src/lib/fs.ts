import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PAGES_DIR, PRESETS_DIR } from "./paths.js";

export async function listPages(): Promise<{ route: string; path: string }[]> {
  const pages: { route: string; path: string }[] = [];

  async function walk(dir: string, routePrefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), `${routePrefix}/${entry.name}`);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const name = entry.name.replace(/\.json$/, "");
        const route = name === "index" ? routePrefix || "/" : `${routePrefix}/${name}`;
        pages.push({ route, path: join(dir, entry.name) });
      }
    }
  }

  await walk(PAGES_DIR, "");
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

export async function findPage(
  route: string
): Promise<{ content: Record<string, unknown>; path: string }> {
  const normalized = route.replace(/^\//, "").replace(/\/$/, "") || "index";
  const candidates = [
    join(PAGES_DIR, normalized, "index.json"),
    join(PAGES_DIR, `${normalized}.json`),
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, "utf-8");
      return { content: JSON.parse(raw) as Record<string, unknown>, path: p };
    } catch {}
  }
  throw new Error(`Page not found: ${route}`);
}

export async function listPresets(): Promise<{ category: string; presets: string[] }[]> {
  let entries;
  try {
    entries = await readdir(PRESETS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const categories: Record<string, string[]> = {};

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subEntries = await readdir(join(PRESETS_DIR, entry.name), {
        withFileTypes: true,
      });
      const presets = subEntries
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map((e) => e.name.replace(/\.json$/, ""))
        .sort();
      if (presets.length > 0) categories[entry.name] = presets;
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      const name = entry.name.replace(/\.json$/, "");
      const category = name.split("-")[0] ?? "general";
      categories[category] ??= [];
      categories[category].push(name);
    }
  }

  return Object.entries(categories)
    .map(([category, presets]) => ({ category, presets: presets.sort() }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function findPreset(id: string): Promise<unknown> {
  try {
    const content = await readFile(join(PRESETS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(content);
  } catch {}

  let entries;
  try {
    entries = await readdir(PRESETS_DIR, { withFileTypes: true });
  } catch {
    throw new Error(`Preset not found: ${id}`);
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const content = await readFile(join(PRESETS_DIR, entry.name, `${id}.json`), "utf-8");
        return JSON.parse(content);
      } catch {}
    }
  }

  throw new Error(`Preset not found: ${id}`);
}

export async function getPresetsInCategory(category: string): Promise<Record<string, unknown>> {
  const all = await listPresets();
  const found = all.find((c) => c.category === category);
  if (!found) throw new Error(`Category not found: ${category}`);
  const result: Record<string, unknown> = {};
  for (const id of found.presets) {
    try {
      result[id] = await findPreset(id);
    } catch {}
  }
  return result;
}

export async function listContentDir(dir: string): Promise<{ id: string; path: string }[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => ({ id: e.name.replace(/\.json$/, ""), path: join(dir, e.name) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function readContentFile(dir: string, id: string): Promise<unknown> {
  const p = join(dir, `${id}.json`);
  try {
    return JSON.parse(await readFile(p, "utf-8"));
  } catch {
    throw new Error(`Not found: ${id}`);
  }
}
