import fs from "node:fs";
import path from "node:path";
import { modalBuilderSchema, moduleSchema } from "@pb/contracts";
import { readJsonFile } from "../lib/json-file.js";
import type { CommandIo } from "./types.js";

type ContentKind = "modal" | "module";

function findContentDir(kind: ContentKind): string | null {
  const cwd = process.cwd();
  const dir = path.join(cwd, "content", kind === "modal" ? "modals" : "modules");
  return fs.existsSync(dir) ? dir : null;
}

function writeContentHelp(kind: ContentKind, io: CommandIo): void {
  io.printText(`Usage: pb-cli write-${kind} <id> <file> [--force] [--json]`);
  io.printText(`       pb-cli write-${kind} <id> --inline '<json>' [--force] [--json]`);
  io.printText("");
  io.printText(`Validate and write a ${kind} JSON file to content/${kind}s/<id>.json.`);
  io.printText("Nothing is written if validation fails.");
  io.printText("");
  io.printText("Options:");
  io.printText("  --force    Overwrite if the file already exists");
  io.printText("  --inline   Accept inline JSON string instead of a file path");
  io.printText("  --json     Output as JSON");
}

function parseWriteArgs(args: string[]): {
  id?: string;
  source?: string;
  inline?: string;
  force: boolean;
  asJson: boolean;
  help: boolean;
} {
  const asJson = args.includes("--json");
  const force = args.includes("--force");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  for (let i = 0; i < args.length; i++) {
    if (["--json", "--force", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const inlineIdx = args.indexOf("--inline");
  let inline: string | undefined;
  if (inlineIdx >= 0) {
    consumed.add(inlineIdx);
    consumed.add(inlineIdx + 1);
    inline = args[inlineIdx + 1];
  }

  const positional = args.filter((_, i) => !consumed.has(i));
  const [id, source] = positional;

  return { id, source, inline, force, asJson, help };
}

async function runWriteContent(kind: ContentKind, args: string[], io: CommandIo): Promise<number> {
  if (args[0] === "--help" || args[0] === "-h" || !args[0]) {
    writeContentHelp(kind, io);
    return 0;
  }

  const opts = parseWriteArgs(args);

  if (opts.help) {
    writeContentHelp(kind, io);
    return 0;
  }

  if (!opts.id) {
    io.printErrorText(`Error: <id> is required.`);
    writeContentHelp(kind, io);
    return 2;
  }

  // Load the JSON
  let raw: unknown;
  if (opts.inline) {
    try {
      raw = JSON.parse(opts.inline);
    } catch (err) {
      const msg = `Failed to parse inline JSON: ${err instanceof Error ? err.message : String(err)}`;
      if (opts.asJson)
        io.printErrorJson({ command: `write-${kind}`, status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }
  } else if (opts.source) {
    const read = readJsonFile(opts.source);
    if (!read.ok) {
      const msg = "error" in read ? read.error : "Failed to read file";
      if (opts.asJson)
        io.printErrorJson({ command: `write-${kind}`, status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }
    raw = read.value;
  } else {
    io.printErrorText("Error: provide a file path or --inline '<json>'.");
    writeContentHelp(kind, io);
    return 2;
  }

  // Validate against the schema
  const schema = kind === "modal" ? modalBuilderSchema : moduleSchema;
  const parsed = schema.safeParse(raw);

  const diagnostics = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        severity: "error",
        code: `PB_${kind.toUpperCase()}_INVALID`,
        path: issue.path.length > 0 ? `$.${issue.path.join(".")}` : "$",
        message: issue.message,
      }));

  if (!parsed.success) {
    const payload = {
      command: `write-${kind}`,
      id: opts.id,
      valid: false,
      written: false,
      diagnostics,
    };
    if (opts.asJson) io.printErrorJson(payload);
    else {
      io.printErrorText(`Validation failed for ${kind} "${opts.id}":`);
      for (const d of diagnostics) io.printErrorText(`  [${d.path}] ${d.message}`);
    }
    return 1;
  }

  // Find the content dir and check for existing file
  const contentDir = findContentDir(kind);
  if (!contentDir) {
    const msg = `content/${kind}s/ directory not found. Run from the project root.`;
    if (opts.asJson) io.printErrorJson({ command: `write-${kind}`, status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const outPath = path.join(contentDir, `${opts.id}.json`);
  if (fs.existsSync(outPath) && !opts.force) {
    const msg = `File already exists: ${path.relative(process.cwd(), outPath)}. Use --force to overwrite.`;
    if (opts.asJson) io.printErrorJson({ command: `write-${kind}`, status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 1;
  }

  fs.writeFileSync(outPath, JSON.stringify(raw, null, 2) + "\n", "utf8");

  const payload = {
    command: `write-${kind}`,
    id: opts.id,
    file: path.relative(process.cwd(), outPath),
    valid: true,
    written: true,
    diagnostics: [],
  };

  if (opts.asJson) io.printJson(payload);
  else io.printText(`Written: ${path.relative(process.cwd(), outPath)}`);

  return 0;
}

export async function runWriteModal(args: string[], io: CommandIo): Promise<number> {
  return runWriteContent("modal", args, io);
}

export async function runWriteModule(args: string[], io: CommandIo): Promise<number> {
  return runWriteContent("module", args, io);
}
