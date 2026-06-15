import { isRecord } from "@pb/core";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { Tool } from "../types.js";
import { findPage } from "../lib/fs.js";
import { OVERLAYS_DIR } from "../lib/paths.js";

// ── types ────────────────────────────────────────────────────────────────────

type ElementOutline = {
  key: string;
  type: string;
  source: string;
  preview?: string;
  childCount?: number;
};

type SectionOutline = {
  key: string;
  type: string;
  source: string;
  elementCount: number;
  elements: ElementOutline[];
  note?: string;
};

// ── helpers ──────────────────────────────────────────────────────────────────

function previewText(def: Record<string, unknown>): string | undefined {
  for (const field of ["text", "label", "alt", "title"] as const) {
    const val = def[field];
    if (typeof val === "string" && val.length > 0) {
      return val.length > 80 ? val.slice(0, 80) + "…" : val;
    }
  }
  return undefined;
}

function inferSource(def: Record<string, unknown>): string {
  if (typeof def.preset === "string") return `preset:${def.preset}`;
  if (Array.isArray(def.presets) && def.presets.length > 0) {
    return `preset:${String(def.presets[0])}${def.presets.length > 1 ? "+" : ""}`;
  }
  return "inline";
}

function walkElements(elementOrder: unknown, definitions: unknown, depth = 0): ElementOutline[] {
  if (!Array.isArray(elementOrder) || !isRecord(definitions)) return [];

  return elementOrder.flatMap((key) => {
    if (typeof key !== "string") return [];
    const elem = definitions[key];
    if (!isRecord(elem)) return [{ key, type: "missing", source: "unknown" }];

    const type = typeof elem.type === "string" ? elem.type : "(from preset)";
    const source = inferSource(elem);
    const preview = previewText(elem);

    if (elem.type === "elementGroup" && isRecord(elem.section)) {
      const s = elem.section as Record<string, unknown>;
      if (depth < 1) {
        const children = walkElements(s.elementOrder, s.definitions, depth + 1);
        return [{ key, type, source, childCount: children.length, ...(preview && { preview }) }];
      }
      const childCount = Array.isArray(s.elementOrder) ? s.elementOrder.length : 0;
      return [{ key, type, source, childCount, ...(preview && { preview }) }];
    }

    return [{ key, type, source, ...(preview && { preview }) }];
  });
}

async function getActiveOverlayIds(pageFile: string): Promise<string[]> {
  let disableOverlays: string[] = [];
  try {
    const raw = await readFile(pageFile, "utf-8");
    const page = JSON.parse(raw) as Record<string, unknown>;
    if (Array.isArray(page.disableOverlays)) {
      disableOverlays = (page.disableOverlays as unknown[]).filter(
        (v): v is string => typeof v === "string"
      );
    }
  } catch (err) {
    console.warn("[pb-mcp] Failed to read page file for overlay resolution", pageFile, err);
  }

  const disabledSet = new Set(disableOverlays);

  let entries;
  try {
    entries = await readdir(OVERLAYS_DIR, { withFileTypes: true });
  } catch (err) {
    console.warn("[pb-mcp] Failed to list overlays directory for page outline", err);
    return [];
  }

  return entries
    .filter(
      (e) =>
        e.isFile() && e.name.endsWith(".json") && !disabledSet.has(e.name.replace(/\.json$/, ""))
    )
    .map((e) => e.name.replace(/\.json$/, ""))
    .sort();
}

// ── tool ─────────────────────────────────────────────────────────────────────

export const pageOutline: Tool = {
  def: {
    name: "page_outline",
    description:
      "Return a compact structural overview of a page — sections, element types, and text previews — " +
      "without the full JSON. Use this before any edit to understand page structure at a glance. " +
      "Faster to scan than read_page. Shows preset sources, element types, and child counts for groups.",
    inputSchema: {
      type: "object",
      properties: {
        route: {
          type: "string",
          description: "Route path (e.g. '/about', '/presets/cards-basic')",
        },
      },
      required: ["route"],
    },
  },

  run: async (args) => {
    const { route } = args as { route: string };
    const { content, path: filePath } = await findPage(route);
    const pageDir = dirname(filePath);

    const title = typeof content.title === "string" ? content.title : undefined;
    const description =
      typeof content.description === "string"
        ? content.description.slice(0, 120) + (content.description.length > 120 ? "…" : "")
        : undefined;
    const bgKey = typeof content.bgKey === "string" ? content.bgKey : undefined;
    const presets = Array.isArray(content.presets)
      ? (content.presets as unknown[]).filter((v): v is string => typeof v === "string")
      : [];

    const sectionOrder = Array.isArray(content.sectionOrder)
      ? (content.sectionOrder as unknown[]).filter((v): v is string => typeof v === "string")
      : [];
    const definitions = isRecord(content.definitions) ? content.definitions : {};

    const overlays = await getActiveOverlayIds(filePath);

    const sections: SectionOutline[] = [];

    for (const key of sectionOrder) {
      let def: Record<string, unknown> | null = null;
      let note: string | undefined;

      if (key in definitions) {
        const raw = definitions[key];
        def = isRecord(raw) ? raw : null;
      } else {
        // Try sidecar file
        const sidecarPath = join(pageDir, `${key}.json`);
        try {
          const raw = await readFile(sidecarPath, "utf-8");
          def = JSON.parse(raw) as Record<string, unknown>;
          note = `sidecar`;
        } catch (err) {
          console.warn("[pb-mcp] Failed to read sidecar section", sidecarPath, err);
          sections.push({
            key,
            type: "missing",
            source: "unknown",
            elementCount: 0,
            elements: [],
            note: "not found in definitions or sidecar",
          });
          continue;
        }
      }

      if (!def) {
        sections.push({ key, type: "null", source: "unknown", elementCount: 0, elements: [] });
        continue;
      }

      const type = typeof def.type === "string" ? def.type : "(from preset)";
      const source = inferSource(def);
      const elements = walkElements(def.elementOrder, def.definitions);

      sections.push({
        key,
        type,
        source,
        elementCount: elements.length,
        elements,
        ...(note && { note }),
      });
    }

    return {
      route,
      filePath,
      ...(title && { title }),
      ...(description && { description }),
      presets,
      ...(bgKey && { bgKey }),
      overlays,
      sectionCount: sections.length,
      sections,
    };
  },
};
