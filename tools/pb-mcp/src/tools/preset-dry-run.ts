import { isRecord } from "@pb/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Tool } from "../types.js";
import { PRESETS_DIR, PAGES_DIR } from "../lib/paths.js";
import { mergePatch } from "../lib/merge-patch.js";

// ── helpers ──────────────────────────────────────────────────────────────────

type PresetHit = { jsonPath: string; overrideFields: string[] };

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
  if (!isRecord(value)) return;

  if (typeof value.preset === "string" && value.preset === targetPreset) {
    hits.push({
      jsonPath: currentPath || "$",
      overrideFields: Object.keys(value).filter((k) => k !== "preset"),
    });
  }
  if (Array.isArray(value.presets) && (value.presets as unknown[]).includes(targetPreset)) {
    hits.push({
      jsonPath: currentPath || "$",
      overrideFields: Object.keys(value).filter((k) => k !== "presets"),
    });
  }

  for (const [key, child] of Object.entries(value)) {
    findPresetRefs(child, targetPreset, `${currentPath}.${key}`, hits);
  }
}

async function walkAllPageJsonFiles(): Promise<Array<{ pageRoute: string; file: string }>> {
  const { readdir } = await import("node:fs/promises");

  const results: Array<{ pageRoute: string; file: string }> = [];

  async function walk(dir: string, routePrefix: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-mcp] Failed to walk page dir", dir, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), `${routePrefix}/${entry.name}`);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push({ pageRoute: routePrefix || "/", file: join(dir, entry.name) });
      }
    }
  }

  await walk(PAGES_DIR, "");
  return results.sort((a, b) => a.pageRoute.localeCompare(b.pageRoute));
}

async function findPresetFile(presetKey: string): Promise<string | null> {
  const { readdir } = await import("node:fs/promises");

  // Try top-level file named after the key
  try {
    await readFile(join(PRESETS_DIR, `${presetKey}.json`), "utf-8");
    return join(PRESETS_DIR, `${presetKey}.json`);
  } catch (err) {
    console.warn("[pb-mcp] Preset not found as top-level file", presetKey, err);
  }

  // Scan all top-level JSON files — presets can be keyed inside bundle files
  try {
    const entries = await readdir(PRESETS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".json")) {
        const filePath = join(PRESETS_DIR, entry.name);
        try {
          const raw = JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
          if (isRecord(raw[presetKey])) return filePath;
        } catch (err) {
          console.warn("[pb-mcp] Failed to scan bundle file for preset", presetKey, filePath, err);
        }
      }
    }
  } catch (err) {
    console.warn("[pb-mcp] Failed to read presets directory during bundle scan", err);
  }

  // Try subdirectory files named after the key, and scan subdirectory bundles
  try {
    const entries = await readdir(PRESETS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = join(PRESETS_DIR, entry.name, `${presetKey}.json`);
        try {
          await readFile(subPath, "utf-8");
          return subPath;
        } catch (err) {
          console.warn("[pb-mcp] Preset not found in subdirectory", subPath, err);
        }
        // Scan bundle files and sub-subdirectories (e.g. type/core/)
        try {
          const subEntries = await readdir(join(PRESETS_DIR, entry.name), { withFileTypes: true });
          for (const subEntry of subEntries) {
            if (subEntry.isFile() && subEntry.name.endsWith(".json")) {
              const subFilePath = join(PRESETS_DIR, entry.name, subEntry.name);
              try {
                const raw = JSON.parse(await readFile(subFilePath, "utf-8")) as Record<
                  string,
                  unknown
                >;
                if (isRecord(raw[presetKey])) return subFilePath;
              } catch (err) {
                console.warn("[pb-mcp] Failed to scan bundle in subdirectory", subFilePath, err);
              }
            } else if (subEntry.isDirectory()) {
              // Two levels deep: content/presets/<dir>/<subdir>/<key>.json
              const deepPath = join(PRESETS_DIR, entry.name, subEntry.name, `${presetKey}.json`);
              try {
                await readFile(deepPath, "utf-8");
                return deepPath;
              } catch (err) {
                console.warn("[pb-mcp] Preset not found at deep path", deepPath, err);
              }
              // Scan bundle files two levels deep
              try {
                const deepEntries = await readdir(join(PRESETS_DIR, entry.name, subEntry.name), {
                  withFileTypes: true,
                });
                for (const deepEntry of deepEntries) {
                  if (deepEntry.isFile() && deepEntry.name.endsWith(".json")) {
                    const deepFilePath = join(
                      PRESETS_DIR,
                      entry.name,
                      subEntry.name,
                      deepEntry.name
                    );
                    try {
                      const raw = JSON.parse(await readFile(deepFilePath, "utf-8")) as Record<
                        string,
                        unknown
                      >;
                      if (isRecord(raw[presetKey])) return deepFilePath;
                    } catch (err) {
                      console.warn(
                        "[pb-mcp] Failed to scan bundle at deep path",
                        deepFilePath,
                        err
                      );
                    }
                  }
                }
              } catch (err) {
                console.warn(
                  "[pb-mcp] Failed to read deep subdirectory",
                  join(PRESETS_DIR, entry.name, subEntry.name),
                  err
                );
              }
            }
          }
        } catch (err) {
          console.warn(
            "[pb-mcp] Failed to read subdirectory entries",
            join(PRESETS_DIR, entry.name),
            err
          );
        }
      }
    }
  } catch (err) {
    console.warn("[pb-mcp] Failed to read presets directory during subdirectory scan", err);
  }

  return null;
}

function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix = ""
): Array<{ path: string; before: unknown; after: unknown }> {
  const changes: Array<{ path: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const b = before[key];
    const a = after[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      if (isRecord(b) && isRecord(a)) {
        changes.push(...diffObjects(b, a, path));
      } else {
        const truncate = (v: unknown): unknown =>
          typeof v === "string" && v.length > 100 ? v.slice(0, 100) + "…" : v;
        changes.push({ path, before: truncate(b), after: truncate(a) });
      }
    }
  }
  return changes;
}

// ── tool ─────────────────────────────────────────────────────────────────────

export const previewPresetChange: Tool = {
  def: {
    name: "preview_preset_change",
    description:
      "Preview the effect of a patch to a shared preset — shows which fields change in the preset " +
      "definition and which pages will be affected — without writing anything to disk. " +
      "Use this before editing any preset to understand the blast radius and validate the change.",
    inputSchema: {
      type: "object",
      properties: {
        presetKey: {
          type: "string",
          description:
            "The preset key to patch (e.g. 'type-h1-display', 'demo-hero'). " +
            "Use list_presets to see all available keys.",
        },
        patch: {
          type: "object",
          description:
            "JSON merge patch to apply to the preset definition (RFC 7396 semantics). " +
            "Keys set values, null removes keys, nested objects merge recursively.",
        },
        sampleSize: {
          type: "number",
          description:
            "Max number of consumer pages to include in the preview (default: 3, max: 10)",
        },
      },
      required: ["presetKey", "patch"],
    },
  },

  run: async (args) => {
    const {
      presetKey,
      patch,
      sampleSize = 3,
    } = args as {
      presetKey: string;
      patch: Record<string, unknown>;
      sampleSize?: number;
    };

    // ── find and load the preset file ────────────────────────────────────────
    const presetFile = await findPresetFile(presetKey);
    if (!presetFile) {
      throw new Error(
        `Preset not found: "${presetKey}". Use list_presets to see all available preset keys.`
      );
    }

    const rawPreset = JSON.parse(await readFile(presetFile, "utf-8")) as Record<string, unknown>;

    // The preset file may be a wrapper { "preset-key": { ... } } or a direct definition
    const presetDef = isRecord(rawPreset[presetKey])
      ? (rawPreset[presetKey] as Record<string, unknown>)
      : rawPreset;

    // Apply the patch
    const patchedPresetDef = mergePatch(presetDef, patch) as Record<string, unknown>;

    // Field-level diff on the preset definition itself
    const presetChanges = diffObjects(presetDef, patchedPresetDef);

    // ── find consumers ───────────────────────────────────────────────────────
    const allFiles = await walkAllPageJsonFiles();

    const consumerRoutes: string[] = [];
    const consumerMap = new Map<string, { pageRoute: string; hits: PresetHit[] }>();

    for (const { pageRoute, file } of allFiles) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await readFile(file, "utf-8"));
      } catch (err) {
        console.warn("[pb-mcp] Failed to parse page JSON for preset consumer scan", file, err);
        continue;
      }
      const hits: PresetHit[] = [];
      findPresetRefs(parsed, presetKey, "$", hits);
      if (hits.length === 0) continue;
      if (!consumerMap.has(pageRoute)) {
        consumerRoutes.push(pageRoute);
        consumerMap.set(pageRoute, { pageRoute, hits });
      } else {
        consumerMap.get(pageRoute)!.hits.push(...hits);
      }
    }

    // Sample consumers for the preview
    const cappedSize = Math.min(sampleSize, 10);
    const sampledRoutes = consumerRoutes.slice(0, cappedSize);

    const previewSamples = sampledRoutes.map((route) => {
      const consumer = consumerMap.get(route)!;
      return {
        pageRoute: route,
        hitCount: consumer.hits.length,
        hits: consumer.hits.slice(0, 3),
        presetFieldsChanged: presetChanges.map((c) => c.path),
      };
    });

    return {
      presetKey,
      presetFile,
      totalConsumerCount: consumerRoutes.length,
      sampledCount: sampledRoutes.length,
      presetDiff: {
        changeCount: presetChanges.length,
        changes: presetChanges,
        before: presetDef,
        after: patchedPresetDef,
      },
      previewSamples,
      note:
        "Nothing is written to disk. To apply this change, use edit_page or open_page_session on the preset file: " +
        presetFile,
      hint:
        presetChanges.length === 0
          ? "The patch produces no changes to the preset definition."
          : `${presetChanges.length} field(s) change in the preset. ${consumerRoutes.length} page(s) will be affected.`,
    };
  },
};
