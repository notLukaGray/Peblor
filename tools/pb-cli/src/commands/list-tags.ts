import { findPagesDir, walkAllPages, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type ListTagsArgs = {
  category?: string;
  asJson: boolean;
  help: boolean;
};

function parseListTagsArgs(args: string[]): ListTagsArgs {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const category = flag("--category");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  return { category, asJson, help };
}

export async function runListTags(args: string[], io: CommandIo): Promise<number> {
  const { category, asJson, help } = parseListTagsArgs(args);

  if (help) {
    io.printText("Usage: pb-cli list-tags [--category <cat>] [--json]");
    io.printText("\nAggregates all tags across all pages.");
    return 0;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "list-tags", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const pages = walkAllPages(pagesDir);

  // tagMap: category → value → routes[]
  const tagMap: Record<string, Record<string, string[]>> = {};

  for (const { route, data } of pages) {
    if (!isRecord(data.tags)) continue;
    for (const [cat, values] of Object.entries(data.tags)) {
      if (!Array.isArray(values)) continue;
      if (category && cat !== category) continue;
      tagMap[cat] ??= {};
      for (const v of values as string[]) {
        tagMap[cat]![v] ??= [];
        tagMap[cat]![v]!.push(route);
      }
    }
  }

  if (asJson) {
    io.printJson({
      command: "list-tags",
      ...(category ? { category } : {}),
      tags: tagMap,
    });
  } else {
    const cats = Object.keys(tagMap).sort();
    if (cats.length === 0) {
      io.printText("(no tags found)");
      return 0;
    }
    for (const cat of cats) {
      io.printText(`${cat}:`);
      for (const [val, routes] of Object.entries(tagMap[cat]!).sort()) {
        io.printText(`  ${val} (${routes.length}): ${routes.join(", ")}`);
      }
    }
  }
  return 0;
}
