import { validatePage } from "@pb/core/validate";
import { findPagesDir, findPageFile, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type FillSectionArgs = {
  route?: string;
  key?: string;
  intent?: string;
  write: boolean;
  asJson: boolean;
  help: boolean;
};

function parseFillSectionArgs(args: string[]): FillSectionArgs {
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

  const key = flag("--key");
  const intent = flag("--intent");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], key, intent, write, asJson, help };
}

function collectElementTypes(def: Record<string, unknown>): string[] {
  const types: string[] = [];
  function walk(node: unknown): void {
    if (!isRecord(node)) return;
    if (typeof node.type === "string" && node.type.startsWith("element")) {
      if (!types.includes(node.type)) types.push(node.type);
    }
    for (const v of Object.values(node)) walk(v);
  }
  walk(def);
  return types;
}

export async function runFillSection(args: string[], io: CommandIo): Promise<number> {
  const { route, key, intent, write, asJson, help } = parseFillSectionArgs(args);

  if (help) {
    io.printText(
      'Usage: pb-cli fill-section <route> --key <sectionKey> --intent "..." [--write] [--json]'
    );
    io.printText("");
    io.printText(
      "Returns the current section + schema hints + a prompt for an AI agent to fill in."
    );
    return 0;
  }

  if (!route || !key) {
    io.printErrorText("Error: route and --key are required.");
    io.printText(
      'Usage: pb-cli fill-section <route> --key <sectionKey> --intent "..." [--write] [--json]'
    );
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "fill-section", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const file = findPageFile(pagesDir, route);
  if (!file) {
    const msg = `Page not found: ${route}`;
    if (asJson) io.printErrorJson({ command: "fill-section", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const readResult = readPageJson(file);
  if (!readResult.ok) {
    if (asJson)
      io.printErrorJson({ command: "fill-section", status: "error", message: readResult.error });
    else io.printErrorText(`Error: ${readResult.error}`);
    return 1;
  }

  const defs = isRecord(readResult.data.definitions) ? readResult.data.definitions : {};
  const section = defs[key];
  if (!section) {
    const msg = `Section key "${key}" not found in page "${route}".`;
    if (asJson) io.printErrorJson({ command: "fill-section", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const elementTypes = isRecord(section) ? collectElementTypes(section) : [];
  const schemaHints = {
    sectionKey: key,
    sectionType: isRecord(section) ? (section.type ?? "unknown") : "unknown",
    detectedElementTypes: elementTypes,
    fillableFields: {
      elementHeading: ["text", "level"],
      elementText: ["text"],
      elementButton: ["label", "href"],
      elementImage: ["url", "alt"],
      elementVideo: ["url", "poster"],
    },
  };

  const prompt = intent
    ? `You are filling in the section "${key}" on page "${route}".

Intent: "${intent}"

Current section JSON:
${JSON.stringify(section, null, 2)}

Schema hints:
${JSON.stringify(schemaHints, null, 2)}

Instructions:
1. Replace all empty string fields with real content matching the intent.
2. Keep all "type" fields exactly as they are.
3. Do not add or remove definition keys — only change field values.
4. Return only the updated section JSON, no commentary.`
    : `Fill in the section "${key}" on page "${route}" using the section JSON and schema hints provided.`;

  const result = {
    command: "fill-section",
    route,
    key,
    ...(intent ? { intent } : {}),
    write,
    section,
    schemaHints,
    prompt,
  };

  if (!write) {
    if (asJson) io.printJson(result);
    else {
      io.printText(`Fill section: ${route} → ${key}`);
      if (intent) io.printText(`  Intent: ${intent}`);
      io.printText("\nPrompt for AI agent:");
      io.printText(prompt);
    }
    return 0;
  }

  // Write mode: validate the page still passes before returning
  const validated = validatePage(readResult.data);
  if (!validated.valid) {
    const diagnostics = validated.diagnostics.map((d) => ({
      severity: d.severity,
      path: d.path,
      message: d.message,
    }));
    if (asJson)
      io.printErrorJson({
        command: "fill-section",
        status: "error",
        message: "Page validation failed.",
        diagnostics,
      });
    else io.printErrorText("Page validation failed.");
    return 1;
  }

  if (asJson) {
    io.printJson({ ...result, written: true, file });
  } else {
    io.printText(`Returned section fill prompt for: ${route} → ${key}`);
    io.printText(`(Use --write after applying the AI output to write the updated page.)`);
  }
  return 0;
}
