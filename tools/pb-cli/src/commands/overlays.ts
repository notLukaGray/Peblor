import fs from "node:fs";
import path from "node:path";
import { findOverlaysDir } from "../lib/pages.js";
import type { CommandIo } from "./types.js";

type OverlaySubcmd = "list" | "read" | "write";

type OverlayArgs = {
  sub?: OverlaySubcmd;
  id?: string;
  file?: string;
  force: boolean;
  asJson: boolean;
  help: boolean;
};

function parseOverlayArgs(args: string[]): OverlayArgs {
  const asJson = args.includes("--json");
  const force = args.includes("--force");
  const help = args.includes("--help") || args.includes("-h");
  const consumed = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--force", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }
  const positional = args.filter((_, i) => !consumed.has(i));
  const sub = positional[0] as OverlaySubcmd | undefined;
  return {
    sub,
    id: positional[1],
    file: positional[2],
    force,
    asJson,
    help,
  };
}

function listOverlayFiles(dir: string): Array<{ id: string; path: string }> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn("[pb-cli] Failed to list overlay directory", dir, err);
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => ({ id: e.name.replace(/\.json$/, ""), path: path.join(dir, e.name) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function runOverlays(args: string[], io: CommandIo): Promise<number> {
  const { sub, id, file, force, asJson, help } = parseOverlayArgs(args);

  if (help || !sub) {
    io.printText("Usage: pb-cli list-overlays [--json]");
    io.printText("       pb-cli read-overlay <id>");
    io.printText("       pb-cli write-overlay <id> <file> [--force] [--json]");
    return 0;
  }

  const overlaysDir = findOverlaysDir();

  if (sub === "list") {
    if (!overlaysDir) {
      const result = { command: "list-overlays", overlays: [] };
      if (asJson) io.printJson(result);
      else io.printText("(no overlays directory found)");
      return 0;
    }
    const overlays = listOverlayFiles(overlaysDir);
    if (asJson) {
      io.printJson({ command: "list-overlays", count: overlays.length, overlays });
    } else {
      io.printText(`Overlays (${overlays.length}):`);
      for (const o of overlays) io.printText(`  ${o.id}  ${o.path}`);
      if (overlays.length === 0) io.printText("  (none)");
    }
    return 0;
  }

  if (sub === "read") {
    if (!id) {
      io.printErrorText("Error: overlay id required.");
      return 2;
    }
    if (!overlaysDir) {
      io.printErrorText("Error: overlays directory not found.");
      return 1;
    }
    const overlayFile = path.join(overlaysDir, `${id}.json`);
    if (!fs.existsSync(overlayFile)) {
      const msg = `Overlay not found: ${id}`;
      if (asJson) io.printErrorJson({ command: "read-overlay", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
    try {
      const content = JSON.parse(fs.readFileSync(overlayFile, "utf8")) as unknown;
      if (asJson) io.printJson({ command: "read-overlay", id, content });
      else io.printText(JSON.stringify(content, null, 2));
      return 0;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (asJson) io.printErrorJson({ command: "read-overlay", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }
  }

  if (sub === "write") {
    if (!id || !file) {
      io.printErrorText("Error: overlay id and source file required.");
      io.printText("Usage: pb-cli write-overlay <id> <file> [--force] [--json]");
      return 2;
    }

    const sourcePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    if (!fs.existsSync(sourcePath)) {
      const msg = `Source file not found: ${file}`;
      if (asJson) io.printErrorJson({ command: "write-overlay", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }

    let content: unknown;
    try {
      content = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    } catch (e) {
      const msg = `Failed to parse source file: ${e instanceof Error ? e.message : String(e)}`;
      if (asJson) io.printErrorJson({ command: "write-overlay", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }

    const targetDir = overlaysDir ?? path.join(process.cwd(), "content/site/overlays");
    fs.mkdirSync(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, `${id}.json`);

    if (fs.existsSync(targetFile) && !force) {
      const msg = `Overlay "${id}" already exists. Use --force to overwrite.`;
      if (asJson) io.printErrorJson({ command: "write-overlay", status: "error", message: msg });
      else io.printErrorText(`Error: ${msg}`);
      return 1;
    }

    fs.writeFileSync(targetFile, `${JSON.stringify(content, null, 2)}\n`, "utf8");

    if (asJson) {
      io.printJson({ command: "write-overlay", status: "ok", id, file: targetFile });
    } else {
      io.printText(`Wrote overlay: ${id} → ${targetFile}`);
    }
    return 0;
  }

  io.printErrorText(`Unknown sub-command: ${sub}`);
  return 2;
}

export async function runListOverlays(args: string[], io: CommandIo): Promise<number> {
  return runOverlays(["list", ...args], io);
}

export async function runReadOverlay(args: string[], io: CommandIo): Promise<number> {
  return runOverlays(["read", ...args], io);
}

export async function runWriteOverlay(args: string[], io: CommandIo): Promise<number> {
  return runOverlays(["write", ...args], io);
}
