import fs from "node:fs";
import path from "node:path";
import { isRecord } from "../lib/json-file.js";
import { findPresetsDir } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type GrepMatch = {
  route: string;
  file: string;
  path: string;
  type?: string;
  value?: unknown;
};

type GrepOptions = {
  type?: string;
  field?: string;
  value?: string;
  preset?: string;
  asJson: boolean;
  help: boolean;
};

function parseGrepArgs(args: string[]): { query?: string; opts: GrepOptions } {
  const asJson = args.includes("--json");
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
  const preset = flag("--preset");

  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  const query = args.filter((_, i) => !consumed.has(i))[0];

  return { query, opts: { type, field, value, preset, asJson, help } };
}

function grepHelp(io: CommandIo): void {
  io.printText(
    "Usage: pb-cli grep [--type <element-type>] [--field <field>] [--value <val>] [--preset <id>] [--json]"
  );
  io.printText("");
  io.printText("Search across all pages for blocks matching criteria.");
  io.printText("");
  io.printText("Options:");
  io.printText(
    "  --type <type>     Match blocks by their 'type' field (e.g. elementHeading, contentBlock)"
  );
  io.printText("  --field <field>   Match blocks that have this field present");
  io.printText(
    "  --value <val>     Match blocks where --field equals this value (requires --field)"
  );
  io.printText("  --preset <id>     Match blocks that reference this preset ID");
  io.printText("  --json            Output as JSON");
  io.printText("");
  io.printText("Examples:");
  io.printText("  pb-cli grep --type elementVideo");
  io.printText("  pb-cli grep --type contentBlock --field ariaLabel");
  io.printText("  pb-cli grep --preset motion-fade");
  io.printText("  pb-cli grep --field visibility --value protected");
}

function findPagesDir(): string | null {
  const cwd = process.cwd();
  const candidate = path.join(cwd, "content/pages");
  return fs.existsSync(candidate) ? candidate : null;
}

function walkPages(dir: string): Array<{ route: string; file: string }> {
  const results: Array<{ route: string; file: string }> = [];

  function walk(current: string, routePrefix: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-cli] Failed to read directory during grep walk", current, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name), `${routePrefix}/${entry.name}`);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const name = entry.name.replace(/\.json$/, "");
        const route = name === "index" ? routePrefix || "/" : `${routePrefix}/${name}`;
        results.push({ route, file: path.join(current, entry.name) });
      }
    }
  }

  walk(dir, "");
  return results.sort((a, b) => a.route.localeCompare(b.route));
}

function jsonPath(segments: Array<string | number>): string {
  if (segments.length === 0) return "$";
  return segments.reduce<string>((acc, seg) => {
    return typeof seg === "number" ? `${acc}[${seg}]` : `${acc}.${seg}`;
  }, "$");
}

function matchesPreset(block: Record<string, unknown>, presetId: string): boolean {
  const preset = block.preset;
  const presets = block.presets;
  if (typeof preset === "string" && preset === presetId) return true;
  if (Array.isArray(presets) && presets.includes(presetId)) return true;
  if (isRecord(preset)) {
    return Object.values(preset).some((v) => typeof v === "string" && v === presetId);
  }
  return false;
}

function walkNode(
  node: unknown,
  segments: Array<string | number>,
  opts: GrepOptions,
  matches: GrepMatch[],
  route: string,
  file: string
): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkNode(item, [...segments, i], opts, matches, route, file));
    return;
  }
  if (!isRecord(node)) return;

  const nodeType = typeof node.type === "string" ? node.type : undefined;

  let matched = false;

  if (opts.type && opts.field && opts.value) {
    matched =
      nodeType === opts.type &&
      node[opts.field] !== undefined &&
      String(node[opts.field]) === opts.value;
  } else if (opts.type && opts.field) {
    matched = nodeType === opts.type && node[opts.field] !== undefined;
  } else if (opts.type && opts.value) {
    matched = nodeType === opts.type && Object.values(node).some((v) => String(v) === opts.value);
  } else if (opts.type) {
    matched = nodeType === opts.type;
  } else if (opts.field && opts.value) {
    matched = node[opts.field] !== undefined && String(node[opts.field]) === opts.value;
  } else if (opts.field) {
    matched = node[opts.field] !== undefined;
  } else if (opts.preset) {
    matched = matchesPreset(node, opts.preset);
  }

  if (matched) {
    matches.push({
      route,
      file,
      path: jsonPath(segments),
      type: nodeType,
      value: opts.field ? node[opts.field] : undefined,
    });
  }

  for (const [key, child] of Object.entries(node)) {
    walkNode(child, [...segments, key], opts, matches, route, file);
  }
}

export async function runGrep(args: string[], io: CommandIo): Promise<number> {
  const { opts } = parseGrepArgs(args);

  if (opts.help) {
    grepHelp(io);
    return 0;
  }

  if (!opts.type && !opts.field && !opts.preset) {
    io.printErrorText("Error: at least one of --type, --field, or --preset is required.");
    grepHelp(io);
    return 2;
  }

  if (opts.value && !opts.field && !opts.type) {
    io.printErrorText("Error: --value requires --field or --type.");
    return 2;
  }

  const pagesDir = findPagesDir();
  if (!pagesDir) {
    const msg = "content/pages directory not found. Run from the project root.";
    if (opts.asJson) io.printErrorJson({ command: "grep", status: "error", message: msg });
    else io.printErrorText(`Error: ${msg}`);
    return 2;
  }

  const pages = walkPages(pagesDir);
  const allMatches: GrepMatch[] = [];

  // Cache preset files across pages (many pages share the same presets).
  const presetCache = new Map<string, unknown | null>();

  for (const { route, file } of pages) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch (err) {
      console.warn("[pb-cli] Failed to parse page JSON for grep", file, err);
      continue;
    }

    // Scan the page JSON itself.
    walkNode(parsed, [], opts, allMatches, route, file);

    // When matching by type, also scan preset files the page imports.
    // Element types defined inside presets won't appear in the page JSON,
    // so we need to resolve them to get accurate type coverage.
    if (opts.type && Array.isArray(parsed.presets)) {
      const presetsDir = findPresetsDir();
      if (presetsDir) {
        const pagePresets = (parsed.presets as unknown[]).filter(
          (p): p is string => typeof p === "string" && p.endsWith(".json")
        );
        for (const presetFilename of pagePresets) {
          const presetPath = path.join(presetsDir, presetFilename);
          let presetData = presetCache.get(presetPath);
          if (presetData === undefined) {
            try {
              presetData = JSON.parse(fs.readFileSync(presetPath, "utf8"));
            } catch (err) {
              console.warn("[pb-cli] Failed to parse preset for grep", presetPath, err);
              presetData = null;
            }
            presetCache.set(presetPath, presetData);
          }
          if (presetData == null) continue;

          // Walk with a `$(preset:filename)` path prefix so callers can
          // distinguish preset-derived matches from direct page matches.
          // Keep the original page route so results group under the page.
          walkNode(
            presetData,
            [`$(preset:${presetFilename})`],
            { ...opts, preset: undefined },
            allMatches,
            route,
            file
          );
        }
      }
    }
  }

  const byPage = new Map<string, GrepMatch[]>();
  for (const m of allMatches) {
    const bucket = byPage.get(m.route) ?? [];
    bucket.push(m);
    byPage.set(m.route, bucket);
  }

  if (opts.asJson) {
    io.printJson({
      command: "grep",
      criteria: {
        ...(opts.type ? { type: opts.type } : {}),
        ...(opts.field ? { field: opts.field } : {}),
        ...(opts.value ? { value: opts.value } : {}),
        ...(opts.preset ? { preset: opts.preset } : {}),
      },
      totalMatches: allMatches.length,
      pages: Object.fromEntries(
        [...byPage.entries()].map(([route, matches]) => [
          route,
          matches.map((m) => ({ path: m.path, type: m.type, value: m.value })),
        ])
      ),
    });
  } else {
    const parts: string[] = [];
    if (opts.type) parts.push(`type=${opts.type}`);
    if (opts.field) parts.push(`field=${opts.field}`);
    if (opts.value) parts.push(`value=${opts.value}`);
    if (opts.preset) parts.push(`preset=${opts.preset}`);
    io.printText(
      `Grep: ${parts.join(", ")} — ${allMatches.length} match(es) across ${byPage.size} page(s)`
    );
    io.printText("");
    for (const [route, matches] of byPage) {
      io.printText(`  ${route}`);
      for (const m of matches) {
        const detail = m.value !== undefined ? `  = ${JSON.stringify(m.value)}` : "";
        io.printText(`    ${m.path}  [${m.type ?? "?"}]${detail}`);
      }
    }
    if (allMatches.length === 0) io.printText("  (no matches)");
  }

  return allMatches.length > 0 ? 0 : 1;
}
