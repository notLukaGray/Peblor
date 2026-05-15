import fs from "node:fs";
import path from "node:path";
import { findCluster } from "@pb/catalog";
import { validatePage } from "@pb/core/validate";
import { readJsonFile } from "../lib/json-file.js";
import { schemaTypeHint } from "./explain-schema.js";
import type { CommandIo } from "./types.js";

type ScaffoldArgs = {
  route?: string;
  outPath?: string;
  from?: string;
  help: boolean;
  asJson: boolean;
  force: boolean;
};

type EmptyPageRoot = {
  title: string;
  description: string;
  sectionOrder: string[];
  definitions: Record<string, unknown>;
};

function parseScaffoldArgs(args: string[]): ScaffoldArgs {
  const asJson = args.includes("--json");
  const force = args.includes("--force");
  const outIndex = args.indexOf("--out");
  const fromIndex = args.indexOf("--from");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined;
  const from = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
  const help = args.includes("--help") || args.includes("-h");

  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--json" || args[i] === "--force" || args[i] === "--help" || args[i] === "-h")
      consumed.add(i);
    if (args[i] === "--out" || args[i] === "--from") {
      consumed.add(i);
      if (i + 1 < args.length) consumed.add(i + 1);
    }
  }

  const route = args.find((_, index) => !consumed.has(index));
  return { route, outPath, from, help, asJson, force };
}

function toTitleFromRoute(route: string): string {
  const segment = route.split("/").filter(Boolean).at(-1)?.replace(/[-_]+/g, " ").trim();
  if (!segment) return "Untitled";
  return segment
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function routeToIndexPath(route: string): string {
  const normalized = route.replace(/^\/+|\/+$/g, "");
  const segments = normalized.split("/").filter(Boolean);
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error(
        `Route contains unsafe segment: "${segment}". Use --out for explicit target paths.`
      );
    }
  }
  return path.join("apps", "web", "src", "content", "pages", normalized, "index.json");
}

function buildEmptyPage(route: string): EmptyPageRoot {
  return {
    title: toTitleFromRoute(route),
    description: "",
    sectionOrder: [],
    definitions: {},
  };
}

function withFromScaffold(page: EmptyPageRoot, from?: string): EmptyPageRoot {
  if (!from) return page;
  if (from.endsWith(".json")) {
    const read = readJsonFile(from);
    if (!read.ok || read.value == null || typeof read.value !== "object") return page;
    const rec = read.value as Record<string, unknown>;
    const type = typeof rec.type === "string" ? rec.type : "";
    if (
      ["contentBlock", "sectionColumn", "scrollContainer", "revealSection", "divider"].includes(
        type
      )
    ) {
      page.sectionOrder = ["hero"];
      page.definitions.hero = rec;
      return page;
    }
    if (type.startsWith("element")) {
      page.sectionOrder = ["hero"];
      page.definitions.hero = {
        type: "contentBlock",
        elementOrder: ["item"],
        definitions: { item: rec },
      };
      return page;
    }
    return page;
  }

  const cluster = findCluster(from);
  if (!cluster) return page;
  const type = schemaTypeHint(cluster);
  if (!type) return page;
  if (
    ["contentBlock", "sectionColumn", "scrollContainer", "revealSection", "divider"].includes(type)
  ) {
    page.sectionOrder = ["hero"];
    page.definitions.hero = { type, elementOrder: [], definitions: {} };
    return page;
  }
  if (type.startsWith("element")) {
    page.sectionOrder = ["hero"];
    page.definitions.hero = {
      type: "contentBlock",
      elementOrder: ["item"],
      definitions: { item: { type } },
    };
  }
  return page;
}

export async function runScaffold(args: string[], io: CommandIo): Promise<number> {
  const { route, outPath, from, help, asJson, force } = parseScaffoldArgs(args);
  if (help) {
    io.printText(
      "Usage: pb-cli scaffold <route> [--out <file>] [--from <cluster-id|preset.json>] [--force] [--json]"
    );
    return 0;
  }
  if (!route && !outPath) {
    io.printUsage();
    return 2;
  }

  let targetRelative: string;
  try {
    targetRelative = outPath ?? routeToIndexPath(route!);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (asJson) io.printErrorJson({ command: "scaffold", status: "error", message });
    else io.printErrorText(message);
    return 2;
  }
  const targetAbsolute = path.isAbsolute(targetRelative)
    ? targetRelative
    : path.join(process.cwd(), targetRelative);

  if (fs.existsSync(targetAbsolute) && !force) {
    const message = `Refusing to overwrite existing file without --force: ${targetRelative}`;
    if (asJson)
      io.printErrorJson({ command: "scaffold", status: "error", file: targetRelative, message });
    else io.printErrorText(message);
    return 1;
  }

  const pageTitle = route ?? (outPath ? path.basename(outPath, path.extname(outPath)) : "untitled");
  const page = withFromScaffold(buildEmptyPage(pageTitle), from);
  const validated = validatePage(page);
  if (!validated.valid) {
    const diagnostics = validated.diagnostics.map((diagnostic) => ({
      severity: diagnostic.severity,
      path: diagnostic.path,
      message: diagnostic.message,
    }));
    if (asJson)
      io.printErrorJson({
        command: "scaffold",
        status: "error",
        file: targetRelative,
        message: "Generated scaffold did not pass page validation.",
        diagnostics,
      });
    else {
      io.printErrorText("Generated scaffold did not pass page validation.");
      for (const diagnostic of diagnostics)
        io.printErrorText(
          `ERROR ${Array.isArray(diagnostic.path) ? diagnostic.path.join(".") : String(diagnostic.path ?? "$")} ${diagnostic.message}`
        );
    }
    return 2;
  }

  fs.mkdirSync(path.dirname(targetAbsolute), { recursive: true });
  fs.writeFileSync(targetAbsolute, `${JSON.stringify(page, null, 2)}\n`, "utf8");

  if (asJson) {
    io.printJson({
      command: "scaffold",
      file: targetRelative,
      written: true,
      ...(from ? { from } : {}),
      page,
    });
  } else {
    io.printText(`Wrote scaffold: ${targetRelative}`);
  }
  return 0;
}
