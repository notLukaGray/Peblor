/**
 * Impact-analysis tools: find all consumers of a shared content artifact.
 *
 * Use these before editing any preset, module, or overlay to understand
 * the blast radius of your change.
 *
 * probe_preset_usage — which pages reference a given preset key
 * probe_module_usage — which pages reference a given module key
 * probe_overlay_usage — which pages have a given overlay active / disabled
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PAGES_DIR, MODULES_DIR, OVERLAYS_DIR, PRESETS_DIR } from "../lib/paths.js";
import type { Tool } from "../types.js";

// ── internal: check if a module is in the global merge set ───────────────────
// All .json files directly under content/modules/ are auto-merged into every
// page's definitions at load time by packages/core.

async function isGloballyMergedModule(moduleKey: string): Promise<boolean> {
  try {
    await readFile(join(MODULES_DIR, `${moduleKey}.json`), "utf-8");
    return true; // exists → globally merged
  } catch (err) {
    console.warn("[pb-mcp] Module not found as globally merged", moduleKey, err);
    return false;
  }
}

// ── internal helpers ─────────────────────────────────────────────────────────

/**
 * Walk all JSON files under the pages directory.
 * index.json files are page roots; non-index JSON files are sidecar sections.
 * Both are returned, grouped under the same pageRoute (the parent directory route).
 */
async function walkAllPageJsonFiles(): Promise<
  Array<{ pageRoute: string; file: string; isIndex: boolean }>
> {
  const results: Array<{ pageRoute: string; file: string; isIndex: boolean }> = [];

  async function walk(dir: string, routePrefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-mcp] Failed to read page directory during probe", dir, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), `${routePrefix}/${entry.name}`);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push({
          pageRoute: routePrefix || "/",
          file: join(dir, entry.name),
          isIndex: entry.name === "index.json",
        });
      }
    }
  }

  await walk(PAGES_DIR, "");
  return results.sort((a, b) => a.pageRoute.localeCompare(b.pageRoute));
}

type PresetHit = { jsonPath: string; overrideFields: string[] };

/** Recursively find all { "preset": targetKey } or { "presets": [..., targetKey, ...] } references. */
function findPresetRefs(
  value: unknown,
  targetPreset: string,
  currentPath: string,
  hits: PresetHit[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findPresetRefs(item, targetPreset, `${currentPath}[${i}]`, hits));
    return;
  }
  if (value == null || typeof value !== "object") return;
  const rec = value as Record<string, unknown>;

  if (typeof rec.preset === "string" && rec.preset === targetPreset) {
    hits.push({
      jsonPath: currentPath || "$",
      overrideFields: Object.keys(rec).filter((k) => k !== "preset"),
    });
  }
  if (Array.isArray(rec.presets) && (rec.presets as unknown[]).includes(targetPreset)) {
    hits.push({
      jsonPath: currentPath || "$",
      overrideFields: Object.keys(rec).filter((k) => k !== "presets"),
    });
  }

  for (const [key, child] of Object.entries(rec)) {
    findPresetRefs(child, targetPreset, `${currentPath}.${key}`, hits);
  }
}

type ModuleHit = { jsonPath: string };

/** Recursively find all { "module": targetKey } references. */
function findModuleRefs(
  value: unknown,
  targetModule: string,
  currentPath: string,
  hits: ModuleHit[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findModuleRefs(item, targetModule, `${currentPath}[${i}]`, hits));
    return;
  }
  if (value == null || typeof value !== "object") return;
  const rec = value as Record<string, unknown>;

  if (typeof rec.module === "string" && rec.module === targetModule) {
    hits.push({ jsonPath: currentPath || "$" });
  }

  for (const [key, child] of Object.entries(rec)) {
    findModuleRefs(child, targetModule, `${currentPath}.${key}`, hits);
  }
}

// ── probe_preset_usage ───────────────────────────────────────────────────────

export const probePresetUsage: Tool = {
  def: {
    name: "probe_preset_usage",
    description:
      "Find every page (and sidecar section) that references a given preset key. " +
      "Use this to understand the blast radius before editing a shared preset. " +
      "Returns each referencing page grouped with its JSON paths and any override fields set at the use site.",
    inputSchema: {
      type: "object",
      properties: {
        presetKey: {
          type: "string",
          description: "The preset key to search for (e.g. 'demo-hero', 'type-h1-display')",
        },
      },
      required: ["presetKey"],
    },
  },
  run: async (args) => {
    const { presetKey } = args as { presetKey: string };

    const allFiles = await walkAllPageJsonFiles();

    // Group hits by pageRoute. Multiple sidecar files can belong to the same route.
    const byRoute = new Map<
      string,
      { pageRoute: string; references: Array<{ file: string; hits: PresetHit[] }> }
    >();

    for (const { pageRoute, file } of allFiles) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readFile(file, "utf-8"));
      } catch (err) {
        console.warn("[pb-mcp] Failed to parse page JSON for preset probe", file, err);
        continue;
      }

      const hits: PresetHit[] = [];
      findPresetRefs(parsed, presetKey, "$", hits);

      if (hits.length === 0) continue;

      const existing = byRoute.get(pageRoute) ?? { pageRoute, references: [] };
      existing.references.push({ file, hits });
      byRoute.set(pageRoute, existing);
    }

    const consumers = [...byRoute.values()].sort((a, b) => a.pageRoute.localeCompare(b.pageRoute));

    return {
      presetKey,
      totalPageCount: consumers.length,
      totalReferenceCount: consumers.reduce(
        (sum, c) => sum + c.references.reduce((s, r) => s + r.hits.length, 0),
        0
      ),
      consumers,
      hint:
        consumers.length === 0
          ? "No pages reference this preset. It may be safe to modify or remove."
          : `${consumers.length} page(s) reference this preset. Review overrideFields to understand which defaults will be affected by changes.`,
    };
  },
};

// ── probe_module_usage ───────────────────────────────────────────────────────

export const probeModuleUsage: Tool = {
  def: {
    name: "probe_module_usage",
    description:
      "Find every page (and sidecar section) that references a given module key via the 'module' field. " +
      "Use this to understand the blast radius before editing a shared module in content/modules/. " +
      "Note: global modules are merged into every page's definitions at load time — this tool finds " +
      "explicit element-level 'module' references, not the global merge.",
    inputSchema: {
      type: "object",
      properties: {
        moduleKey: {
          type: "string",
          description:
            "The module key to search for (e.g. 'video-player', 'audio-player'). " +
            "Use list_modules to see all available module keys.",
        },
      },
      required: ["moduleKey"],
    },
  },
  run: async (args) => {
    const { moduleKey } = args as { moduleKey: string };

    const [globallyMerged, allFiles] = await Promise.all([
      isGloballyMergedModule(moduleKey),
      walkAllPageJsonFiles(),
    ]);

    const byRoute = new Map<
      string,
      { pageRoute: string; references: Array<{ file: string; hits: ModuleHit[] }> }
    >();

    for (const { pageRoute, file } of allFiles) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readFile(file, "utf-8"));
      } catch (err) {
        console.warn("[pb-mcp] Failed to parse page JSON for module probe", file, err);
        continue;
      }

      const hits: ModuleHit[] = [];
      findModuleRefs(parsed, moduleKey, "$", hits);

      if (hits.length === 0) continue;

      const existing = byRoute.get(pageRoute) ?? { pageRoute, references: [] };
      existing.references.push({ file, hits });
      byRoute.set(pageRoute, existing);
    }

    const consumers = [...byRoute.values()].sort((a, b) => a.pageRoute.localeCompare(b.pageRoute));
    const explicitPageCount = consumers.length;
    const totalReferenceCount = consumers.reduce(
      (sum, c) => sum + c.references.reduce((s, r) => s + r.hits.length, 0),
      0
    );

    return {
      moduleKey,
      moduleExists: globallyMerged,
      globallyMerged,
      ...(globallyMerged && {
        globalMergeNote:
          "This module file is in content/modules/ and is merged into every page's definitions at load time. " +
          "All pages are affected by changes to this module regardless of explicit element references below.",
      }),
      explicitPageCount,
      totalReferenceCount,
      consumers,
      hint:
        explicitPageCount === 0
          ? globallyMerged
            ? "No pages reference this module explicitly, but it is globally merged — all pages are implicitly affected."
            : "No pages reference this module key directly and it does not exist as a global module."
          : `${explicitPageCount} page(s) have elements that explicitly reference this module.${globallyMerged ? " Additionally, all pages are affected via global merge." : ""}`,
    };
  },
};

// ── probe_overlay_usage ──────────────────────────────────────────────────────

export const probeOverlayUsage: Tool = {
  def: {
    name: "probe_overlay_usage",
    description:
      "Show which pages have a given overlay active or explicitly disabled. " +
      "Overlays (header, footer, nav, etc.) apply globally to every page by default. " +
      "A page can opt out via its disableOverlays array. " +
      "Use this before editing an overlay to know which pages will be affected.",
    inputSchema: {
      type: "object",
      properties: {
        overlayId: {
          type: "string",
          description:
            "Overlay ID — the filename without .json (e.g. 'header', 'footer', 'nav-theme-toggle'). " +
            "Use list_overlays to see all available overlay IDs.",
        },
      },
      required: ["overlayId"],
    },
  },
  run: async (args) => {
    const { overlayId } = args as { overlayId: string };

    // Verify the overlay exists.
    const overlayFilePath = join(OVERLAYS_DIR, `${overlayId}.json`);
    try {
      await readFile(overlayFilePath, "utf-8");
    } catch (err) {
      console.warn("[pb-mcp] Overlay not found for probe", overlayFilePath, err);
      throw new Error(
        `Overlay not found: ${overlayId}. Use list_overlays to see available overlay IDs.`
      );
    }

    // Walk index.json pages only (overlays apply per-route, not per-sidecar).
    const allFiles = await walkAllPageJsonFiles();
    const indexPages = allFiles.filter((f) => f.isIndex);

    const disabledBy: Array<{ route: string; file: string }> = [];
    let totalPages = 0;

    for (const { pageRoute, file } of indexPages) {
      totalPages++;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(await readFile(file, "utf-8")) as Record<string, unknown>;
      } catch (err) {
        console.warn("[pb-mcp] Failed to parse page JSON for overlay probe", file, err);
        continue;
      }
      const disableOverlays = Array.isArray(parsed.disableOverlays)
        ? (parsed.disableOverlays as unknown[]).filter((v): v is string => typeof v === "string")
        : [];

      if (disableOverlays.includes(overlayId)) {
        disabledBy.push({ route: pageRoute, file });
      }
    }

    const activePageCount = totalPages - disabledBy.length;

    return {
      overlayId,
      scope: "global",
      totalPages,
      activePageCount,
      disabledPageCount: disabledBy.length,
      disabledBy: disabledBy.sort((a, b) => a.route.localeCompare(b.route)),
      note:
        `This overlay is active on ${activePageCount} of ${totalPages} pages. ` +
        (disabledBy.length > 0
          ? `${disabledBy.length} page(s) explicitly disable it via disableOverlays.`
          : "No pages disable it."),
      hint: "Editing this overlay affects all active pages. If you need to test changes on one page first, add the overlay ID to that page's disableOverlays array temporarily.",
    };
  },
};

// ── internal: preset cache for probe_element_usage ────────────────────────────
// Preset files are read-only during a probe call and shared across many pages.
// Cache them in memory to avoid redundant disk I/O.

const presetCache = new Map<string, unknown | null>();

async function loadPresetFile(filename: string): Promise<unknown | null> {
  if (presetCache.has(filename)) return presetCache.get(filename) as unknown | null;
  let data: unknown | null = null;
  try {
    data = JSON.parse(await readFile(join(PRESETS_DIR, filename), "utf-8"));
  } catch (err) {
    console.warn("[pb-mcp] Preset file not found for cache load", filename, err);
  }
  presetCache.set(filename, data);
  return data;
}

// ── probe_element_usage ──────────────────────────────────────────────────────

type ElementHit = { jsonPath: string };

function findElementRefs(
  value: unknown,
  targetType: string,
  currentPath: string,
  hits: ElementHit[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => findElementRefs(item, targetType, `${currentPath}[${i}]`, hits));
    return;
  }
  if (value == null || typeof value !== "object") return;
  const rec = value as Record<string, unknown>;

  if (typeof rec.type === "string" && rec.type === targetType) {
    hits.push({ jsonPath: currentPath || "$" });
  }

  for (const [key, child] of Object.entries(rec)) {
    findElementRefs(child, targetType, `${currentPath}.${key}`, hits);
  }
}

export const probeElementUsage: Tool = {
  def: {
    name: "probe_element_usage",
    description:
      "Find every page (and sidecar section) that contains a specific element type. " +
      "Use this before changing an element schema, removing a component from the runtime registry, " +
      "or auditing coverage of a given element type across the site. " +
      "Returns each page with JSON paths to all occurrences.",
    inputSchema: {
      type: "object",
      properties: {
        elementType: {
          type: "string",
          description:
            "Element type string to search for (e.g. 'elementModel3D', 'elementRive', 'elementTabs', 'elementLottie'). " +
            "Use list_element_types to see all registered types.",
        },
      },
      required: ["elementType"],
    },
  },
  run: async (args) => {
    const { elementType } = args as { elementType: string };

    // Clear preset cache so edits between probe calls are picked up.
    presetCache.clear();

    const allFiles = await walkAllPageJsonFiles();

    const byRoute = new Map<
      string,
      { pageRoute: string; references: Array<{ file: string; hits: ElementHit[] }> }
    >();

    for (const { pageRoute, file } of allFiles) {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(await readFile(file, "utf-8")) as Record<string, unknown>;
      } catch (err) {
        console.warn("[pb-mcp] Failed to parse page JSON for element probe", file, err);
        continue;
      }

      // Direct hits: element type literal in the page JSON itself.
      const directHits: ElementHit[] = [];
      findElementRefs(parsed, elementType, "$", directHits);

      // Preset-derived hits: element type defined inside a preset file the page imports.
      // Page-level presets array lists preset filenames. Each definition in those files
      // becomes available to the page via "preset": "key" references, so the element type
      // won't appear as a literal "type" field in the page JSON.
      const pagePresets: string[] = Array.isArray(parsed.presets)
        ? (parsed.presets as unknown[]).filter(
            (p): p is string => typeof p === "string" && p.endsWith(".json")
          )
        : [];

      const presetDerivedRefs: Array<{
        file: string;
        hits: ElementHit[];
        viaPreset: string;
      }> = [];

      for (const presetFilename of pagePresets) {
        const presetData = await loadPresetFile(presetFilename);
        if (presetData == null) continue;

        const presetHits: ElementHit[] = [];
        findElementRefs(presetData, elementType, "$(preset)", presetHits);

        if (presetHits.length > 0) {
          presetDerivedRefs.push({ file, hits: presetHits, viaPreset: presetFilename });
        }
      }

      // Combine: only register this page if it has direct or preset-derived hits.
      const hasDirect = directHits.length > 0;
      const hasPreset = presetDerivedRefs.length > 0;
      if (!hasDirect && !hasPreset) continue;

      const existing = byRoute.get(pageRoute) ?? { pageRoute, references: [] };
      if (hasDirect) {
        existing.references.push({ file, hits: directHits });
      }
      for (const ref of presetDerivedRefs) {
        existing.references.push(ref);
      }
      byRoute.set(pageRoute, existing);
    }

    const consumers = [...byRoute.values()].sort((a, b) => a.pageRoute.localeCompare(b.pageRoute));
    let totalElementCount = 0;
    let presetDerivedCount = 0;
    for (const c of consumers) {
      for (const r of c.references) {
        totalElementCount += r.hits.length;
        if ("viaPreset" in r) presetDerivedCount += r.hits.length;
      }
    }

    return {
      elementType,
      totalPageCount: consumers.length,
      totalElementCount,
      presetDerivedCount,
      consumers,
      hint:
        consumers.length === 0
          ? `No pages use ${elementType}. Safe to remove from the runtime registry if the schema union is also updated.`
          : `${consumers.length} page(s) contain ${totalElementCount} instance(s) of ${elementType}. ` +
            `${presetDerivedCount > 0 ? `${presetDerivedCount} instance(s) come from preset files referenced by the page (element → preset → page chain). ` : ""}` +
            `Removing or renaming this type will break these pages.`,
    };
  },
};
