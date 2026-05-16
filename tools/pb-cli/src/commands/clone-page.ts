import fs from "node:fs";
import path from "node:path";
import { validatePage } from "@pb/core/validate";
import { findPagesDir, findPageFile, routeToWritePath, readPageJson } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type CloneArgs = {
  sourceRoute?: string;
  destRoute?: string;
  title?: string;
  force: boolean;
  asJson: boolean;
  help: boolean;
};

function parseCloneArgs(args: string[]): CloneArgs {
  const asJson = args.includes("--json");
  const force = args.includes("--force");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const title = flag("--title");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--force", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return {
    sourceRoute: positional[0],
    destRoute: positional[1],
    title,
    force,
    asJson,
    help,
  };
}

function toTitleFromRoute(route: string): string {
  const segment = route.split("/").filter(Boolean).at(-1)?.replace(/[-_]+/g, " ").trim();
  if (!segment) return "Untitled";
  return segment
    .split(" ")
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}`)
    .join(" ");
}

export async function runClonePage(args: string[], io: CommandIo): Promise<number> {
  const { sourceRoute, destRoute, title, force, asJson, help } = parseCloneArgs(args);

  if (help) {
    io.printText(
      'Usage: pb-cli clone <source-route> <dest-route> [--title "..."] [--force] [--json]'
    );
    return 0;
  }

  if (!sourceRoute || !destRoute) {
    io.printErrorText("Error: source and destination routes are required.");
    io.printText(
      'Usage: pb-cli clone <source-route> <dest-route> [--title "..."] [--force] [--json]'
    );
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "clone", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const sourceFile = findPageFile(pagesDir, sourceRoute);
  if (!sourceFile) {
    const msg = `Source page not found: ${sourceRoute}`;
    if (asJson) io.printErrorJson({ command: "clone", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(sourceFile);
  if (!readResult.ok) {
    if (asJson) io.printErrorJson({ command: "clone", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const destFile = routeToWritePath(pagesDir, destRoute);
  if (fs.existsSync(destFile) && !force) {
    const msg = `Destination already exists: ${destFile}. Use --force to overwrite.`;
    if (asJson) io.printErrorJson({ command: "clone", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const derivedTitle = title ?? toTitleFromRoute(destRoute);
  const normalized = destRoute.replace(/^\/+|\/+$/g, "") || "index";
  const cloned: Record<string, unknown> = {
    ...readResult.data,
    title: derivedTitle,
    ...(typeof readResult.data.slug === "string" ? { slug: normalized } : {}),
    ...(typeof readResult.data.canonicalUrl === "string" ? { canonicalUrl: `/${normalized}` } : {}),
  };

  const validated = validatePage(cloned);
  if (!validated.valid) {
    const diagnostics = validated.diagnostics.map((d) => ({
      severity: d.severity,
      path: d.path,
      message: d.message,
    }));
    if (asJson)
      io.printErrorJson({
        command: "clone",
        status: "error",
        message: "Cloned page failed validation.",
        diagnostics,
      });
    else {
      io.printErrorText("Cloned page failed validation:");
      for (const d of diagnostics) io.printErrorText(`  ${d.message}`);
    }
    return 1;
  }

  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, `${JSON.stringify(cloned, null, 2)}\n`, "utf8");

  if (asJson) {
    io.printJson({
      command: "clone",
      status: "ok",
      source: sourceRoute,
      dest: destRoute,
      file: destFile,
      title: derivedTitle,
    });
  } else {
    io.printText(`Cloned ${sourceRoute} → ${destRoute} (${destFile})`);
  }
  return 0;
}
