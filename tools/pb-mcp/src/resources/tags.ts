import { isRecord } from "@pb/core";
import type { StaticResource } from "../types.js";
import { listPages, findPage } from "../lib/fs.js";

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
      } catch (err) {
        console.warn("[pb-mcp] Failed to find page for tag aggregation", route, err);
        continue;
      }
    }

    return { tags: tagMap };
  },
};
