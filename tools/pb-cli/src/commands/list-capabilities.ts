import fs from "node:fs";
import path from "node:path";
import type { CommandIo } from "./types.js";

type ListCapabilitiesArgs = {
  capType?: string;
  asJson: boolean;
  help: boolean;
};

function parseArgs(args: string[]): ListCapabilitiesArgs {
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

  const capType = flag("--type");
  for (let i = 0; i < args.length; i++) {
    if (["--json", "--help", "-h"].includes(args[i]!)) consumed.add(i);
  }

  return { capType, asJson, help };
}

function findCapabilityFiles(root: string): Array<{ file: string; id: string }> {
  const results: Array<{ file: string; id: string }> = [];
  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      console.warn("[pb-cli] Failed to list capability directory", dir, err);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
        walk(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith(".capability.json")) {
        const id = entry.name.replace(/\.capability\.json$/, "");
        results.push({ file: path.join(dir, entry.name), id });
      }
    }
  }
  walk(root);
  return results.sort((a, b) => a.id.localeCompare(b.id));
}

export async function runListCapabilities(args: string[], io: CommandIo): Promise<number> {
  const { capType, asJson, help } = parseArgs(args);

  if (help) {
    io.printText("Usage: pb-cli list-capabilities [--type importer|exporter|cmsAdapter] [--json]");
    io.printText(
      "\nLists all registered capability declarations (*.capability.json) in the project."
    );
    return 0;
  }

  const root = process.cwd();
  let capabilities = findCapabilityFiles(root);

  if (capType) {
    capabilities = capabilities.filter(({ file }) => {
      try {
        const data = JSON.parse(fs.readFileSync(file, "utf8")) as { type?: string };
        return data.type === capType;
      } catch (err) {
        console.warn("[pb-cli] Failed to parse capability file for type filter", file, err);
        return false;
      }
    });
  }

  const loaded = capabilities.map(({ file, id }) => {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      return { id, file, type: data.type ?? "unknown", name: data.name ?? id };
    } catch (e) {
      return {
        id,
        file,
        type: "error",
        name: id,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  if (asJson) {
    io.printJson({
      command: "list-capabilities",
      count: loaded.length,
      ...(capType ? { filterType: capType } : {}),
      capabilities: loaded,
    });
  } else {
    io.printText(`Capabilities (${loaded.length}):`);
    for (const cap of loaded) {
      io.printText(`  [${cap.type}] ${cap.name}  ${cap.file}`);
    }
    if (loaded.length === 0) io.printText("  (none found — create *.capability.json files)");
  }

  return 0;
}
