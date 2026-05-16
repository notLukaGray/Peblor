import { findPagesDir, findPageFile, routeToWritePath } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type GeneratePageArgs = {
  route?: string;
  intent?: string;
  dryRun: boolean;
  asJson: boolean;
  help: boolean;
};

function parseGeneratePageArgs(args: string[]): GeneratePageArgs {
  const asJson = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const intent = flag("--intent");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--dry-run", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  return { route: positional[0], intent, dryRun, asJson, help };
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

export async function runGeneratePage(args: string[], io: CommandIo): Promise<number> {
  const { route, intent, dryRun, asJson, help } = parseGeneratePageArgs(args);

  if (help) {
    io.printText('Usage: pb-cli generate <route> --intent "..." [--dry-run] [--json]');
    io.printText("");
    io.printText(
      "Returns a scaffold + schema hints + a structured prompt for an AI agent to fill in."
    );
    io.printText("Pass --dry-run to preview without writing (default).");
    return 0;
  }

  if (!route) {
    io.printErrorText("Error: route is required.");
    io.printText('Usage: pb-cli generate <route> --intent "..." [--dry-run] [--json]');
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "generate", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const existingFile = findPageFile(pagesDir, route);
  if (existingFile && !dryRun) {
    const msg = `Page already exists at ${existingFile}. Use --dry-run to preview or clone to duplicate.`;
    if (asJson) io.printErrorJson({ command: "generate", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  const derivedTitle = toTitleFromRoute(route);
  const scaffold = {
    title: derivedTitle,
    description: "",
    sectionOrder: ["hero"],
    definitions: {
      hero: {
        type: "contentBlock",
        elementOrder: ["heading", "body"],
        definitions: {
          heading: { type: "elementHeading", text: "" },
          body: { type: "elementText", text: "" },
        },
      },
    },
  };

  const schemaHints = {
    availableSectionTypes: [
      "contentBlock",
      "sectionColumn",
      "scrollContainer",
      "revealSection",
      "divider",
      "formBlock",
    ],
    commonElementTypes: [
      "elementHeading",
      "elementText",
      "elementImage",
      "elementButton",
      "elementVideo",
      "elementSpacer",
    ],
    fields: {
      page: ["title", "description", "sectionOrder", "definitions", "visibility", "tags"],
      contentBlock: ["type", "elementOrder", "definitions", "columns", "fill", "ariaLabel"],
      elementHeading: ["type", "text", "level", "copyType"],
      elementText: ["type", "text", "copyType"],
      elementButton: ["type", "label", "href", "action", "variant"],
      elementImage: ["type", "url", "alt", "width", "height"],
    },
  };

  const prompt = intent
    ? `You are filling in a peblor page scaffold for the route "${route}".

Intent: "${intent}"

Scaffold to fill:
${JSON.stringify(scaffold, null, 2)}

Available schema hints:
${JSON.stringify(schemaHints, null, 2)}

Instructions:
1. Replace all empty string fields with real content matching the intent.
2. Add or remove sections/elements as needed to best express the intent.
3. Keep all "type" fields exactly as they are.
4. Return only the completed page JSON, no commentary.`
    : `Fill in the page scaffold for route "${route}" using the scaffold and schema hints provided.`;

  const destFile = dryRun ? "(dry-run — not written)" : routeToWritePath(pagesDir, route);

  const result = {
    command: "generate",
    route,
    ...(intent ? { intent } : {}),
    dryRun,
    destFile,
    scaffold,
    schemaHints,
    prompt,
  };

  if (asJson) {
    io.printJson(result);
  } else {
    io.printText(`Generate page: ${route}`);
    if (intent) io.printText(`  Intent: ${intent}`);
    io.printText(`  Scaffold written to: ${destFile}`);
    io.printText("");
    io.printText("Prompt for AI agent:");
    io.printText(prompt);
  }

  return 0;
}
