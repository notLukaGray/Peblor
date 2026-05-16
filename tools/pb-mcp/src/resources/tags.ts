import type { StaticResource } from "../types.js";
import { listPages, findPage } from "../lib/fs.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export const tags: StaticResource = {
  kind: "static",
  uri: "peblor://tags",
  name: "Tags",
  description: "Aggregated tag map across all pages: category → value → routes[].",
  mimeType: "application/json",
  read: async () => {
    const allPages = await listPages();
    const tagMap: Record<string, Record<string, string[]>> = {};

    for (const { route } of allPages) {
      try {
        const { content } = await findPage(route);
        if (!isRecord(content.tags)) continue;
        for (const [cat, values] of Object.entries(content.tags)) {
          if (!Array.isArray(values)) continue;
          tagMap[cat] ??= {};
          for (const v of values as string[]) {
            tagMap[cat]![v] ??= [];
            tagMap[cat]![v]!.push(route);
          }
        }
      } catch {
        continue;
      }
    }

    return { tags: tagMap };
  },
};
