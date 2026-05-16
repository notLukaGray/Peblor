import fs from "node:fs";
import { validatePage } from "@pb/core/validate";
import { findPagesDir, findPageFile, readPageJson } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

const METADATA_FIELDS = [
  "title",
  "description",
  "ogImage",
  "canonicalUrl",
  "robots",
  "keywords",
  "lang",
  "visibility",
  "passwordProtected",
  "forcedTheme",
  "density",
] as const;

type MetadataField = (typeof METADATA_FIELDS)[number];

type SetMetadataArgs = {
  route?: string;
  fields: Partial<Record<MetadataField, string | boolean>>;
  write: boolean;
  asJson: boolean;
  help: boolean;
};

function parseSetMetadataArgs(args: string[]): SetMetadataArgs {
  const asJson = args.includes("--json");
  const write = args.includes("--write");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  function boolFlag(name: string): boolean | undefined {
    if (args.includes(name)) {
      const i = args.indexOf(name);
      consumed.add(i);
      return true;
    }
    return undefined;
  }

  const fields: Partial<Record<MetadataField, string | boolean>> = {};
  for (const f of METADATA_FIELDS) {
    const flagName = `--${f}`;
    if (f === "passwordProtected") {
      const v = boolFlag(flagName);
      if (v !== undefined) fields[f] = v;
    } else {
      const v = flag(flagName);
      if (v !== undefined) fields[f] = v;
    }
  }

  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], fields, write, asJson, help };
}

export async function runSetMetadata(args: string[], io: CommandIo): Promise<number> {
  const { route, fields, write, asJson, help } = parseSetMetadataArgs(args);

  if (help) {
    io.printText(
      'Usage: pb-cli set-metadata <route> [--title "..."] [--description "..."] [--visibility public] ... [--write] [--json]'
    );
    io.printText(`\nSettable fields: ${METADATA_FIELDS.join(", ")}`);
    return 0;
  }

  if (!route) {
    io.printErrorText("Error: route is required.");
    return 2;
  }

  if (Object.keys(fields).length === 0) {
    io.printErrorText("Error: at least one metadata field must be specified.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "set-metadata", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const file = findPageFile(pagesDir, route);
  if (!file) {
    const msg = `Page not found: ${route}`;
    if (asJson) io.printErrorJson({ command: "set-metadata", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(file);
  if (!readResult.ok) {
    if (asJson)
      io.printErrorJson({ command: "set-metadata", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const updated = { ...readResult.data, ...fields };
  const validated = validatePage(updated);
  if (!validated.valid) {
    const diagnostics = validated.diagnostics.map((d) => ({
      severity: d.severity,
      path: d.path,
      message: d.message,
    }));
    if (asJson)
      io.printErrorJson({
        command: "set-metadata",
        status: "error",
        message: "Validation failed after update.",
        diagnostics,
      });
    else io.printErrorText("Validation failed after metadata update.");
    return 1;
  }

  if (write) {
    fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  }

  if (asJson) {
    io.printJson({
      command: "set-metadata",
      status: "ok",
      route,
      file,
      written: write,
      fields,
      page: updated,
    });
  } else {
    io.printText(`Metadata updated: ${route}${write ? " (written)" : " (dry-run)"}`);
    for (const [k, v] of Object.entries(fields)) {
      io.printText(`  ${k}: ${JSON.stringify(v)}`);
    }
  }
  return 0;
}
