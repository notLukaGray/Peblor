import { isRecord } from "@pb/core";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StaticResource } from "../types.js";
import { PAGES_DIR } from "../lib/paths.js";

type GraphNode = {
  route: string;
  sectionTypes: Record<string, number>;
  presets: string[];
  modals: string[];
  elementTypes: Record<string, number>;
  bgType?: string;
};

type Graph = {
  builtAt: string;
  pageCount: number;
  presetUsage: Record<string, string[]>;
  modalUsage: Record<string, string[]>;
  sectionTypeUsage: Record<string, string[]>;
  elementTypeUsage: Record<string, string[]>;
  pages: Record<string, GraphNode>;
};

function collectPresets(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectPresets(item, found);
    return;
  }
  if (!isRecord(node)) return;
  const p = node.preset;
  const ps = node.presets;
  if (typeof p === "string") found.add(p);
  if (isRecord(p)) for (const v of Object.values(p)) if (typeof v === "string") found.add(v);
  if (Array.isArray(ps)) for (const v of ps) if (typeof v === "string") found.add(v);
  for (const child of Object.values(node)) collectPresets(child, found);
}

function collectModals(node: unknown, found: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) collectModals(item, found);
    return;
  }
  if (!isRecord(node)) return;
  const m = node.modalId ?? node.modal;
  if (typeof m === "string") found.add(m);
  for (const child of Object.values(node)) collectModals(child, found);
}

function tallyTypes(node: unknown, prefix: string, tally: Record<string, number>): void {
  if (Array.isArray(node)) {
    for (const item of node) tallyTypes(item, prefix, tally);
    return;
  }
  if (!isRecord(node)) return;
  if (typeof node.type === "string" && node.type.startsWith(prefix)) {
    tally[node.type] = (tally[node.type] ?? 0) + 1;
  }
  for (const child of Object.values(node)) tallyTypes(child, prefix, tally);
}

async function walkPages(dir: string): Promise<Array<{ route: string; file: string }>> {
  const results: Array<{ route: string; file: string }> = [];

  async function walk(current: string, routePrefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-mcp] Failed to walk page directory for graph", current, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(current, entry.name), `${routePrefix}/${entry.name}`);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const name = entry.name.replace(/\.json$/, "");
        const route = name === "index" ? routePrefix || "/" : `${routePrefix}/${name}`;
        results.push({ route, file: join(current, entry.name) });
      }
    }
  }

  await walk(dir, "");
  return results.sort((a, b) => a.route.localeCompare(b.route));
}

async function buildGraph(): Promise<Graph> {
  const pages = await walkPages(PAGES_DIR);
  const graph: Graph = {
    builtAt: new Date().toISOString(),
    pageCount: pages.length,
    presetUsage: {},
    modalUsage: {},
    sectionTypeUsage: {},
    elementTypeUsage: {},
    pages: {},
  };

  for (const { route, file } of pages) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(file, "utf-8"));
    } catch (err) {
      console.warn("[pb-mcp] Failed to parse page JSON for graph", file, err);
      continue;
    }
    if (!isRecord(parsed)) continue;

    const presets = new Set<string>();
    const modals = new Set<string>();
    const sectionTypes: Record<string, number> = {};
    const elementTypes: Record<string, number> = {};

    collectPresets(parsed, presets);
    collectModals(parsed, modals);

    // Section types come from top-level definitions referenced by sectionOrder
    const defs = isRecord(parsed.definitions) ? parsed.definitions : {};
    const sectionOrder = Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder : [];
    for (const key of sectionOrder) {
      const def = defs[key];
      if (isRecord(def) && typeof def.type === "string") {
        sectionTypes[def.type] = (sectionTypes[def.type] ?? 0) + 1;
      }
    }

    tallyTypes(parsed, "element", elementTypes);

    const bgType =
      typeof parsed.bgKey === "string" && isRecord(defs[parsed.bgKey])
        ? String((defs[parsed.bgKey] as Record<string, unknown>).type ?? "")
        : undefined;

    graph.pages[route] = {
      route,
      sectionTypes,
      presets: [...presets].sort(),
      modals: [...modals].sort(),
      elementTypes,
      bgType,
    };

    for (const preset of presets) {
      graph.presetUsage[preset] ??= [];
      graph.presetUsage[preset].push(route);
    }
    for (const modal of modals) {
      graph.modalUsage[modal] ??= [];
      graph.modalUsage[modal].push(route);
    }
    for (const type of Object.keys(sectionTypes)) {
      graph.sectionTypeUsage[type] ??= [];
      graph.sectionTypeUsage[type].push(route);
    }
    for (const type of Object.keys(elementTypes)) {
      graph.elementTypeUsage[type] ??= [];
      graph.elementTypeUsage[type].push(route);
    }
  }

  return graph;
}

export const graph: StaticResource = {
  kind: "static",
  uri: "peblor://graph",
  name: "Site content graph",
  description:
    "Cross-reference map across all pages: preset usage by route, modal references, section type distribution, element type distribution. Built in-process — reflects current disk state at request time.",
  mimeType: "application/json",
  read: () => buildGraph(),
};
