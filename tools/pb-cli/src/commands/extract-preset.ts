import fs from "node:fs";
import path from "node:path";
import { validatePage } from "@pb/core/validate";
import {
  findPagesDir,
  findPageFile,
  findPresetsDir,
  readPageJson,
  isRecord,
} from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type ExtractPresetArgs = {
  route?: string;
  defKey?: string;
  presetId?: string;
  write: boolean;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): ExtractPresetArgs {
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

  const defKey = flag("--key");
  const presetId = flag("--preset-id");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], defKey, presetId, write, asJson, help };
}

export async function runExtractPreset(args: string[], io: CommandIo): Promise<number> {
  const { route, defKey, presetId, write, asJson, help } = parseArgs(args);

  if (help) {
    io.printText(
      "Usage: pb-cli extract-preset <route> --key <defKey> --preset-id <id> [--write] [--json]"
    );
    io.printText("\nExtracts a definition block from a page into a named preset file.");
    return 0;
  }

  if (!route || !defKey || !presetId) {
    io.printErrorText("Error: route, --key, and --preset-id are required.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "extract-preset", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const file = findPageFile(pagesDir, route);
  if (!file) {
    const msg = `Page not found: ${route}`;
    if (asJson) io.printErrorJson({ command: "extract-preset", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(file);
  if (!readResult.ok) {
    if (asJson)
      io.printErrorJson({ command: "extract-preset", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const defs = isRecord(readResult.data.definitions) ? readResult.data.definitions : {};
  const definition = defs[defKey];
  if (!definition) {
    const msg = `Definition key "${defKey}" not found in page "${route}".`;
    if (asJson) io.printErrorJson({ command: "extract-preset", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  // Determine preset output path
  const presetsDir = findPresetsDir() ?? path.join(process.cwd(), "content/presets");
  const presetFile = path.join(presetsDir, `${presetId}.json`);

  // Build updated page with preset reference instead of inline definition
  const updatedDefs = { ...defs, [defKey]: { preset: presetId } };
  const updatedPage = { ...readResult.data, definitions: updatedDefs };

  const validated = validatePage(updatedPage);
  const diagnostics = validated.valid
    ? []
    : validated.diagnostics.map((d) => ({
        severity: d.severity,
        path: d.path,
        message: d.message,
      }));

  if (!validated.valid) {
    if (asJson)
      io.printErrorJson({
        command: "extract-preset",
        status: "error",
        message: "Updated page failed validation after extracting preset.",
        diagnostics,
      });
    else io.printErrorText("Updated page failed validation after extracting preset.");
    return 1;
  }

  if (write) {
    fs.mkdirSync(presetsDir, { recursive: true });
    fs.writeFileSync(presetFile, `${JSON.stringify(definition, null, 2)}\n`, "utf8");
    fs.writeFileSync(file, `${JSON.stringify(updatedPage, null, 2)}\n`, "utf8");
  }

  if (asJson) {
    io.printJson({
      command: "extract-preset",
      status: "ok",
      route,
      defKey,
      presetId,
      presetFile,
      written: write,
      preset: definition,
      updatedPage,
    });
  } else {
    io.printText(`Extract preset: "${defKey}" → ${presetId}`);
    io.printText(`  Preset file: ${presetFile}`);
    if (!write) io.printText("  (dry-run — add --write to persist)");
  }

  return 0;
}
