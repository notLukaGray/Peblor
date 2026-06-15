import fs from "node:fs";
import { validatePage } from "@pb/core/validate";
import { findPagesDir, findPageFile, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type SetPageTagsArgs = {
  route?: string;
  tagsStr?: string;
  merge: boolean;
  write: boolean;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): SetPageTagsArgs {
  const asJson = args.includes("--json");
  const write = args.includes("--write");
  const merge = args.includes("--merge");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const tagsStr = flag("--tags");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--merge", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], tagsStr, merge, write, asJson, help };
}

export async function runSetPageTags(args: string[], io: CommandIo): Promise<number> {
  const { route, tagsStr, merge, write, asJson, help } = parseArgs(args);

  if (help) {
    io.printText(
      'Usage: pb-cli set-page-tags <route> --tags \'{"brand":["alpha"]}\' [--merge] [--write] [--json]'
    );
    io.printText("\nSets or merges tags on a page. Use --merge to append rather than replace.");
    return 0;
  }

  if (!route || !tagsStr) {
    io.printErrorText("Error: route and --tags are required.");
    return 2;
  }

  let newTags: Record<string, string[]>;
  try {
    newTags = JSON.parse(tagsStr) as Record<string, string[]>;
  } catch (err) {
    console.warn("[pb-cli] Failed to parse --tags JSON", err);
    io.printErrorText("Error: --tags is not valid JSON.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "set-page-tags", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const file = findPageFile(pagesDir, route);
  if (!file) {
    const msg = `Page not found: ${route}`;
    if (asJson) io.printErrorJson({ command: "set-page-tags", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(file);
  if (!readResult.ok) {
    if (asJson)
      io.printErrorJson({ command: "set-page-tags", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const existingTags = isRecord(readResult.data.tags)
    ? (readResult.data.tags as Record<string, string[]>)
    : {};
  const mergedTags: Record<string, string[]> = merge ? { ...existingTags } : {};

  for (const [cat, vals] of Object.entries(newTags)) {
    if (merge && mergedTags[cat]) {
      mergedTags[cat] = [...new Set([...mergedTags[cat]!, ...vals])];
    } else {
      mergedTags[cat] = vals;
    }
  }

  const updated = { ...readResult.data, tags: mergedTags };

  const validated = validatePage(updated);
  if (!validated.valid) {
    const diagnostics = validated.diagnostics.map((d) => ({
      severity: d.severity,
      path: d.path,
      message: d.message,
    }));
    if (asJson)
      io.printErrorJson({
        command: "set-page-tags",
        status: "error",
        message: "Validation failed.",
        diagnostics,
      });
    else io.printErrorText("Validation failed.");
    return 1;
  }

  if (write) {
    fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }

  if (asJson) {
    io.printJson({
      command: "set-page-tags",
      status: "ok",
      route,
      file,
      written: write,
      tags: mergedTags,
    });
  } else {
    io.printText(`Tags updated: ${route}${write ? " (written)" : " (dry-run)"}`);
    for (const [cat, vals] of Object.entries(mergedTags)) {
      io.printText(`  ${cat}: ${vals.join(", ")}`);
    }
  }
  return 0;
}
