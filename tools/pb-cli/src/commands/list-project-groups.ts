import { findPagesDir, walkAllPages, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type ListProjectGroupsArgs = {
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): ListProjectGroupsArgs {
  return {
    asJson: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

export async function runListProjectGroups(args: string[], io: CommandIo): Promise<number> {
  const { asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli list-project-groups [--json]");
    io.printText("\nShows all projectGroups across all pages.");
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson)
      io.printErrorJson({ command: "list-project-groups", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const pages = walkAllPages(pagesDir);

  type GroupEntry = {
    route: string;
    groupKey: string;
    projectSlug: string;
    elements: string[];
    tags?: Record<string, string[]>;
  };

  const groups: GroupEntry[] = [];

  for (const { route, data } of pages) {
    if (!isRecord(data.projectGroups)) continue;
    for (const [groupKey, group] of Object.entries(data.projectGroups)) {
      if (!isRecord(group)) continue;
      groups.push({
        route,
        groupKey,
        projectSlug: typeof group.projectSlug === "string" ? group.projectSlug : groupKey,
        elements: Array.isArray(group.elements) ? (group.elements as string[]) : [],
        ...(isRecord(data.tags) ? { tags: data.tags as Record<string, string[]> } : {}),
      });
    }
  }

  if (asJson) {
    io.printJson({
      command: "list-project-groups",
      totalGroups: groups.length,
      groups,
    });
  } else {
    if (groups.length === 0) {
      io.printText("(no projectGroups found)");
      return 0;
    }
    const byRoute = new Map<string, GroupEntry[]>();
    for (const g of groups) {
      const bucket = byRoute.get(g.route) ?? [];
      bucket.push(g);
      byRoute.set(g.route, bucket);
    }
    for (const [route, pageGroups] of byRoute) {
      io.printText(`${route}:`);
      for (const g of pageGroups) {
        io.printText(`  ${g.groupKey} → ${g.projectSlug} [${g.elements.join(", ")}]`);
      }
    }
  }
  return 0;
}
