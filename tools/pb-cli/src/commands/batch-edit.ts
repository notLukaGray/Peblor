import fs from "node:fs";
import { validatePage } from "@pb/core/validate";
import { findPagesDir, walkPages, readPageJson, isRecord } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type BatchEditArgs = {
  type?: string;
  field?: string;
  value?: string;
  patchStr?: string;
  write: boolean;
  dryRun: boolean;
  failFast: boolean;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): BatchEditArgs {
  const asJson = args.includes("--json");
  const write = args.includes("--write");
  const dryRun = args.includes("--dry-run") || !write;
  const failFast = args.includes("--fail-fast");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = args.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return args[i + 1];
  }

  const type = flag("--type");
  const field = flag("--field");
  const value = flag("--value");
  const patchStr = flag("--patch");

  for (let i = 0; i < args.length; i++) {
    if (["--json", "--write", "--dry-run", "--fail-fast", "--help", "-h"].includes(args[i]!))
      consumed.add(i);
  }

  return { type, field, value, patchStr, write, dryRun, failFast, asJson, help };
}

function pageMatchesFilter(
  data: Record<string, unknown>,
  opts: { type?: string; field?: string; value?: string }
): boolean {
  if (!opts.type && !opts.field) return true;

  function walk(node: unknown): boolean {
    if (Array.isArray(node)) return node.some(walk);
    if (!isRecord(node)) return false;
    const nodeType = typeof node.type === "string" ? node.type : undefined;
    let matched = false;
    if (opts.type && opts.field && opts.value) {
      matched =
        nodeType === opts.type &&
        node[opts.field] !== undefined &&
        String(node[opts.field]) === opts.value;
    } else if (opts.type && opts.field) {
      matched = nodeType === opts.type && node[opts.field] !== undefined;
    } else if (opts.type) {
      matched = nodeType === opts.type;
    } else if (opts.field && opts.value) {
      matched = node[opts.field] !== undefined && String(node[opts.field]) === opts.value;
    } else if (opts.field) {
      matched = node[opts.field] !== undefined;
    }
    if (matched) return true;
    return Object.values(node).some(walk);
  }

  return walk(data);
}

function mergePatch(target: unknown, patch: unknown): unknown {
  if (patch === null) return null;
  if (!isRecord(patch) || !isRecord(target)) return patch;
  const result = { ...target };
  for (const [key, val] of Object.entries(patch)) {
    if (val === null) {
      delete result[key];
    } else {
      result[key] = mergePatch(result[key], val);
    }
  }
  return result;
}

export async function runBatchEdit(args: string[], io: CommandIo): Promise<number> {
  const { type, field, value, patchStr, write, dryRun, failFast, asJson, help } = parseArgs(args);

  if (help) {
    io.printText(
      "Usage: pb-cli batch-edit [--type <type>] [--field <f>] [--value <v>] --patch '{...}' [--write] [--dry-run] [--json]"
    );
    io.printText("\nApplies an RFC 7396 merge patch to all pages matching the filter.");
    io.printText("Default: dry-run. Requires --write to actually persist changes.");
    return 0;
  }

  if (!patchStr) {
    io.printErrorText("Error: --patch is required.");
    return 2;
  }

  let patch: unknown;
  try {
    patch = JSON.parse(patchStr);
  } catch {
    io.printErrorText("Error: --patch is not valid JSON.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages not found. Run from the project root.";
    if (asJson) io.printErrorJson({ command: "batch-edit", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const allPages = walkPages(pagesDir);

  type PageEditResult = {
    route: string;
    file: string;
    matched: boolean;
    valid?: boolean;
    written?: boolean;
    errors?: string[];
  };

  const results: PageEditResult[] = [];
  let validationFailed = false;

  for (const { route, file } of allPages) {
    const read = readPageJson(file);
    if (!read.ok) continue;

    const matched = pageMatchesFilter(read.data, { type, field, value });
    if (!matched) {
      results.push({ route, file, matched: false });
      continue;
    }

    const updated = mergePatch(read.data, patch) as Record<string, unknown>;
    const validated = validatePage(updated);

    if (!validated.valid) {
      const errors = validated.diagnostics.map((d) => d.message);
      results.push({ route, file, matched: true, valid: false, errors });
      validationFailed = true;
      if (failFast) break;
      continue;
    }

    results.push({ route, file, matched: true, valid: true, written: false });

    if (!dryRun && write && !validationFailed) {
      fs.writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
      results.at(-1)!.written = true;
    }
  }

  const matchedCount = results.filter((r) => r.matched).length;
  const writtenCount = results.filter((r) => r.written).length;

  if (asJson) {
    const payload = {
      command: "batch-edit",
      dryRun,
      matchedPages: matchedCount,
      writtenPages: writtenCount,
      validationFailed,
      results: results.filter((r) => r.matched),
    };
    if (validationFailed) io.printErrorJson(payload);
    else io.printJson(payload);
  } else {
    io.printText(
      `batch-edit: ${matchedCount} page(s) matched, ${writtenCount} written${dryRun ? " (dry-run)" : ""}`
    );
    for (const r of results.filter((r) => r.matched)) {
      const status = !r.valid ? "INVALID" : r.written ? "written" : "dry-run";
      io.printText(`  [${status}] ${r.route}`);
      if (r.errors) {
        for (const e of r.errors) io.printText(`    ${e}`);
      }
    }
  }

  return validationFailed ? 1 : 0;
}
