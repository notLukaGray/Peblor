import type { StaticResource } from "../types.js";
import { listPages, findPage } from "../lib/fs.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export const projectGroups: StaticResource = {
  kind: "static",
  uri: "peblor://project-groups",
  name: "Project groups",
  description: "All projectGroups across all pages with their slugs and element keys.",
  mimeType: "application/json",
  read: async () => {
    const allPages = await listPages();
    const groups: Array<{
      route: string;
      groupKey: string;
      projectSlug: string;
      elements: string[];
    }> = [];

    for (const { route } of allPages) {
      try {
        const { content } = await findPage(route);
        if (!isRecord(content.projectGroups)) continue;
        for (const [groupKey, group] of Object.entries(content.projectGroups)) {
          if (!isRecord(group)) continue;
          groups.push({
            route,
            groupKey,
            projectSlug: typeof group.projectSlug === "string" ? group.projectSlug : groupKey,
            elements: Array.isArray(group.elements) ? (group.elements as string[]) : [],
          });
        }
      } catch {
        continue;
      }
    }

    return { groups, total: groups.length };
  },
};
