import fs from "node:fs";
import path from "node:path";
import {
  findPagesDir,
  findPageFile,
  routeToWritePath,
  readPageJson,
  walkPages,
  isRecord,
} from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type RenameRouteArgs = {
  oldRoute?: string;
  newRoute?: string;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): RenameRouteArgs {
  const asJson = args.includes("--json");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  return { oldRoute: positional[0], newRoute: positional[1], asJson, help };
}

function findRouteRefs(node: unknown, targetRoute: string, found: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => findRouteRefs(item, targetRoute, found));
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, value] of Object.entries(node)) {
    if (
      key === "href" &&
      typeof value === "string" &&
      (value === targetRoute || value === `${targetRoute}/`)
    ) {
      found.push(targetRoute);
    }
    findRouteRefs(value, targetRoute, found);
  }
}

export async function runRenameRoute(args: string[], io: CommandIo): Promise<number> {
  const { oldRoute, newRoute, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli rename-route <old-route> <new-route> [--json]");
    io.printText("\nMoves a page to a new route and updates its metadata.");
    io.printText(
      "Note: other pages referencing the old route via href are reported but not auto-updated."
    );
    return 0;
  }

  if (!oldRoute || !newRoute) {
    io.printErrorText("Error: old and new routes are required.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "rename-route", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const sourceFile = findPageFile(pagesDir, oldRoute);
  if (!sourceFile) {
    const msg = `Page not found: ${oldRoute}`;
    if (asJson) io.printErrorJson({ command: "rename-route", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const destFile = routeToWritePath(pagesDir, newRoute);
  if (fs.existsSync(destFile)) {
    const msg = `Destination already exists: ${destFile}`;
    if (asJson) io.printErrorJson({ command: "rename-route", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(sourceFile);
  if (!readResult.ok) {
    if (asJson)
      io.printErrorJson({ command: "rename-route", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const normalized = newRoute.replace(/^\/+|\/+$/g, "") || "index";
  const updated: Record<string, unknown> = {
    ...readResult.data,
    ...(typeof readResult.data.slug === "string" ? { slug: normalized } : {}),
    ...(typeof readResult.data.canonicalUrl === "string" ? { canonicalUrl: `/${normalized}` } : {}),
  };

  // Check for other pages referencing the old route
  const referencingPages: string[] = [];
  const normalizedOld = oldRoute.startsWith("/") ? oldRoute : `/${oldRoute}`;
  for (const { route: r, file } of walkPages(pagesDir)) {
    if (r === oldRoute) continue;
    const read = readPageJson(file);
    if (!read.ok) continue;
    const refs: string[] = [];
    findRouteRefs(read.data, normalizedOld, refs);
    if (refs.length > 0) referencingPages.push(r);
  }

  // Write the moved file
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  // Remove old file
  fs.rmSync(sourceFile);
  // Remove empty parent directory if it becomes empty
  try {
    const parentDir = path.dirname(sourceFile);
    const remaining = fs.readdirSync(parentDir);
    if (remaining.length === 0) fs.rmdirSync(parentDir);
  } catch {
    // ignore
  }

  if (asJson) {
    io.printJson({
      command: "rename-route",
      status: "ok",
      oldRoute,
      newRoute,
      oldFile: sourceFile,
      newFile: destFile,
      ...(referencingPages.length > 0
        ? {
            warning: "Other pages reference the old route — update them manually.",
            referencingPages,
          }
        : {}),
    });
  } else {
    io.printText(`Renamed: ${oldRoute} → ${newRoute}`);
    io.printText(`  ${sourceFile} → ${destFile}`);
    if (referencingPages.length > 0) {
      io.printText(
        `\nWarning: the following pages reference the old route "${normalizedOld}" — update them manually:`
      );
      for (const r of referencingPages) io.printText(`  ${r}`);
    }
  }
  return 0;
}
