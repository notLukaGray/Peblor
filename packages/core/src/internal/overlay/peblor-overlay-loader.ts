import fs from "fs";
import path from "path";
import { isSafePathSegment, resolvePathUnder } from "../peblor-paths";
import { CONTENT_DIR, parseJsonSafe } from "../load/peblor-load-io";
import { buildPresetsAsync } from "../load/peblor-load-presets";
import { resolveDefinitionPresets } from "../load/peblor-load-definitions";
import { expandPeblor } from "../peblor-expand";
import type { PeblorDefinitionBlock, SectionBlock } from "@pb/contracts";
import type { BreakpointDefinitions } from "../defaults/pb-breakpoint-defaults";

const OVERLAYS_DIR = path.join(CONTENT_DIR, "site/overlays");

type LoadOverlaySectionsOptions = {
  breakpoints?: Partial<BreakpointDefinitions>;
  viewportWidthPx?: number;
};

export async function loadOverlaySections(
  disableOverlays?: string[],
  options?: LoadOverlaySectionsOptions
): Promise<SectionBlock[]> {
  try {
    const stat = await fs.promises.stat(OVERLAYS_DIR);
    if (!stat.isDirectory()) return [];
  } catch {
    return [];
  }

  const disabled = new Set(disableOverlays ?? []);
  const files = (await fs.promises.readdir(OVERLAYS_DIR)).filter((f) => f.endsWith(".json"));
  const presets = await buildPresetsAsync({});
  const sections: SectionBlock[] = [];

  for (const file of files) {
    const id = path.basename(file, ".json");
    if (!isSafePathSegment(id)) continue;
    if (disabled.has(id)) continue;

    const filePath = resolvePathUnder(OVERLAYS_DIR, file);
    if (!filePath) continue;

    let raw: string;
    try {
      raw = await fs.promises.readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    const result = parseJsonSafe<Record<string, unknown>>(raw);
    if (!result.ok || result.data == null || typeof result.data !== "object") continue;

    const data = result.data;
    if (!("type" in data)) continue;

    const sectionKey = typeof data.id === "string" && isSafePathSegment(data.id) ? data.id : id;
    const definitions: Record<string, PeblorDefinitionBlock> = {
      [sectionKey]: data as PeblorDefinitionBlock,
    };

    const resolvedDefinitions = resolveDefinitionPresets(definitions, presets);

    const { sections: expanded } = expandPeblor(
      {
        slug: id,
        title: id,
        bgKey: "__overlay-bg-unused__",
        sectionOrder: [sectionKey],
        definitions: resolvedDefinitions,
      },
      {
        breakpoints: options?.breakpoints,
        viewportWidthPx: options?.viewportWidthPx,
      }
    );

    for (const section of expanded) {
      sections.push(section);
    }
  }

  return sections;
}
