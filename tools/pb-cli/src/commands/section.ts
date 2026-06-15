import fs from "node:fs";
import path from "node:path";
import { createPbClient } from "@pb/sdk";
import { CONTRACT_VERSION } from "@pb/contracts";
import { readJsonFile, isRecord, resolveInputPath } from "../lib/json-file.js";
import type { CommandIo } from "./types.js";

type PageLike = {
  sectionOrder?: string[];
  definitions?: Record<string, unknown>;
  [key: string]: unknown;
};

function asPageLike(value: unknown): PageLike | null {
  if (!isRecord(value)) return null;
  return value as PageLike;
}

function findPageFile(routeOrPath: string): string | null {
  if (path.isAbsolute(routeOrPath) || routeOrPath.endsWith(".json")) {
    const abs = resolveInputPath(routeOrPath);
    return fs.existsSync(abs) ? abs : null;
  }

  // Resolve route → content/pages/...
  const cwd = process.cwd();
  const normalized = routeOrPath.replace(/^\//, "").replace(/\/$/, "") || "index";
  const candidates = [
    path.join(cwd, "content/pages", normalized, "index.json"),
    path.join(cwd, "content/pages", `${normalized}.json`),
    path.join(cwd, "content/pages", "index.json"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function parseSectionArgs(args: string[]): {
  subcommand: string;
  routeOrPath: string;
  key?: string;
  type?: string;
  after?: string;
  before?: string;
  to?: number;
  definition?: unknown;
  write: boolean;
  asJson: boolean;
  help: boolean;
} {
  const [subcommand = "", routeOrPath = "", ...rest] = args;
  const consumed = new Set<number>();

  function flag(name: string): string | undefined {
    const i = rest.indexOf(name);
    if (i < 0) return undefined;
    consumed.add(i);
    consumed.add(i + 1);
    return rest[i + 1];
  }

  const key = flag("--key");
  const type = flag("--type");
  const after = flag("--after");
  const before = flag("--before");
  const toRaw = flag("--to");
  const defRaw = flag("--definition");

  const write = rest.includes("--write");
  const asJson = rest.includes("--json");
  const help = rest.includes("--help") || rest.includes("-h");

  let definition: unknown;
  if (defRaw) {
    try {
      definition = JSON.parse(defRaw);
    } catch (err) {
      console.warn("[pb-cli] Failed to parse section definition as JSON, using raw string", err);
      definition = defRaw;
    }
  }

  return {
    subcommand,
    routeOrPath,
    key,
    type,
    after,
    before,
    to: toRaw !== undefined ? Number(toRaw) : undefined,
    definition,
    write,
    asJson,
    help,
  };
}

function sectionHelp(io: CommandIo): void {
  io.printText("Usage: pb-cli section <subcommand> <route|file> [options]");
  io.printText("");
  io.printText("Subcommands:");
  io.printText("  list <route|file>                           List sections and their types");
  io.printText(
    "  add  <route|file> --key <key> --definition '<json>' [--after <key>] [--before <key>] [--write] [--json]"
  );
  io.printText("  remove <route|file> --key <key> [--write] [--json]");
  io.printText("  move <route|file> --key <key> --to <index> [--write] [--json]");
  io.printText("");
  io.printText("Options:");
  io.printText("  --write    Write the result back to disk");
  io.printText("  --json     Output as JSON");
}

export async function runSection(args: string[], io: CommandIo): Promise<number> {
  if (args[0] === "--help" || args[0] === "-h" || !args[0]) {
    sectionHelp(io);
    return 0;
  }

  const opts = parseSectionArgs(args);

  if (opts.help) {
    sectionHelp(io);
    return 0;
  }

  if (!opts.routeOrPath) {
    io.printErrorText("Error: route or file path is required.");
    sectionHelp(io);
    return 2;
  }

  const filePath = findPageFile(opts.routeOrPath);
  if (!filePath) {
    const msg = `Page not found: ${opts.routeOrPath}`;
    if (opts.asJson) io.printErrorJson({ command: "section", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const read = readJsonFile(filePath);
  if (!read.ok) {
    const msg = "error" in read ? read.error : "Failed to read page";
    if (opts.asJson) io.printErrorJson({ command: "section", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const page = asPageLike(read.value);
  if (!page) {
    const msg = "Page is not a valid JSON object.";
    if (opts.asJson) io.printErrorJson({ command: "section", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const sectionOrder: string[] = Array.isArray(page.sectionOrder) ? [...page.sectionOrder] : [];
  const definitions: Record<string, unknown> = isRecord(page.definitions)
    ? { ...page.definitions }
    : {};

  // ── list ──────────────────────────────────────────────────────────────────
  if (opts.subcommand === "list") {
    const sections = sectionOrder.map((key, index) => {
      const def = definitions[key];
      const type = isRecord(def) && typeof def.type === "string" ? def.type : "unknown";
      return { index, key, type };
    });

    if (opts.asJson) {
      io.printJson({
        command: "section",
        subcommand: "list",
        file: filePath,
        total: sections.length,
        sections,
      });
    } else {
      io.printText(`Sections in ${path.relative(process.cwd(), filePath)}:`);
      for (const s of sections) io.printText(`  [${s.index}] ${s.key}  (${s.type})`);
      if (sections.length === 0) io.printText("  (none)");
    }
    return 0;
  }

  // ── add ───────────────────────────────────────────────────────────────────
  if (opts.subcommand === "add") {
    if (!opts.key) {
      const msg = "--key is required for section add";
      if (opts.asJson)
        io.printErrorJson({ command: "section", subcommand: "add", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }
    if (!isRecord(opts.definition)) {
      const msg = "--definition <json> is required and must be a JSON object";
      if (opts.asJson)
        io.printErrorJson({ command: "section", subcommand: "add", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }
    if (definitions[opts.key] !== undefined) {
      const msg = `Key "${opts.key}" already exists in definitions`;
      if (opts.asJson)
        io.printErrorJson({ command: "section", subcommand: "add", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }

    // Determine insertion index
    let insertAt = sectionOrder.length;
    if (opts.after !== undefined) {
      const idx = sectionOrder.indexOf(opts.after);
      if (idx < 0) {
        const msg = `--after key "${opts.after}" not found in sectionOrder`;
        if (opts.asJson)
          io.printErrorJson({
            command: "section",
            subcommand: "add",
            status: "error",
            message: msg,
          });
        else io.printErrorText(`Error: ${msg}`);
        return 2;
      }
      insertAt = idx + 1;
    } else if (opts.before !== undefined) {
      const idx = sectionOrder.indexOf(opts.before);
      if (idx < 0) {
        const msg = `--before key "${opts.before}" not found in sectionOrder`;
        if (opts.asJson)
          io.printErrorJson({
            command: "section",
            subcommand: "add",
            status: "error",
            message: msg,
          });
        else io.printErrorText(`Error: ${msg}`);
        return 2;
      }
      insertAt = idx;
    }

    sectionOrder.splice(insertAt, 0, opts.key);
    definitions[opts.key] = opts.definition;

    const updated = { ...page, sectionOrder, definitions };
    const pb = createPbClient({ contractVersion: CONTRACT_VERSION });
    const result = await pb.validate(updated);
    const diagnostics = result.diagnostics;

    if (opts.write && result.valid) {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf8");
    }

    const payload = {
      command: "section",
      subcommand: "add",
      file: filePath,
      key: opts.key,
      insertAt,
      valid: result.valid,
      written: opts.write && result.valid,
      diagnostics,
      sectionOrder,
    };

    if (result.valid) {
      io.printJson(payload);
    } else {
      io.printErrorJson(payload);
      return 1;
    }
    return 0;
  }

  // ── remove ────────────────────────────────────────────────────────────────
  if (opts.subcommand === "remove") {
    if (!opts.key) {
      const msg = "--key is required for section remove";
      if (opts.asJson)
        io.printErrorJson({
          command: "section",
          subcommand: "remove",
          status: "error",
          message: msg,
        });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }

    const idx = sectionOrder.indexOf(opts.key);
    if (idx < 0) {
      const msg = `Key "${opts.key}" not found in sectionOrder`;
      if (opts.asJson)
        io.printErrorJson({
          command: "section",
          subcommand: "remove",
          status: "error",
          message: msg,
        });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }

    sectionOrder.splice(idx, 1);
    delete definitions[opts.key];

    const updated = { ...page, sectionOrder, definitions };
    const pb = createPbClient({ contractVersion: CONTRACT_VERSION });
    const result = await pb.validate(updated);

    if (opts.write && result.valid) {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf8");
    }

    const payload = {
      command: "section",
      subcommand: "remove",
      file: filePath,
      key: opts.key,
      removedAt: idx,
      valid: result.valid,
      written: opts.write && result.valid,
      diagnostics: result.diagnostics,
      sectionOrder,
    };

    if (result.valid) {
      io.printJson(payload);
    } else {
      io.printErrorJson(payload);
      return 1;
    }
    return 0;
  }

  // ── move ──────────────────────────────────────────────────────────────────
  if (opts.subcommand === "move") {
    if (!opts.key) {
      const msg = "--key is required for section move";
      if (opts.asJson)
        io.printErrorJson({
          command: "section",
          subcommand: "move",
          status: "error",
          message: msg,
        });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }
    if (opts.to === undefined || !Number.isFinite(opts.to)) {
      const msg = "--to <index> is required for section move";
      if (opts.asJson)
        io.printErrorJson({
          command: "section",
          subcommand: "move",
          status: "error",
          message: msg,
        });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }

    const fromIdx = sectionOrder.indexOf(opts.key);
    if (fromIdx < 0) {
      const msg = `Key "${opts.key}" not found in sectionOrder`;
      if (opts.asJson)
        io.printErrorJson({
          command: "section",
          subcommand: "move",
          status: "error",
          message: msg,
        });
      else io.printErrorText(`Error: ${msg}`);
      return 2;
    }

    const toIdx = Math.max(0, Math.min(opts.to, sectionOrder.length - 1));
    sectionOrder.splice(fromIdx, 1);
    sectionOrder.splice(toIdx, 0, opts.key);

    const updated = { ...page, sectionOrder, definitions };
    const pb = createPbClient({ contractVersion: CONTRACT_VERSION });
    const result = await pb.validate(updated);

    if (opts.write && result.valid) {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + "\n", "utf8");
    }

    const payload = {
      command: "section",
      subcommand: "move",
      file: filePath,
      key: opts.key,
      from: fromIdx,
      to: toIdx,
      valid: result.valid,
      written: opts.write && result.valid,
      diagnostics: result.diagnostics,
      sectionOrder,
    };

    if (result.valid) {
      io.printJson(payload);
    } else {
      io.printErrorJson(payload);
      return 1;
    }
    return 0;
  }

  // Unknown subcommand
  sectionHelp(io);
  return 2;
}
