import fs from "node:fs";
import path from "node:path";
import type { Tool } from "../types.js";
import { OVERLAYS_DIR } from "../lib/paths.js";

function listOverlayFiles(): Array<{ id: string; path: string }> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(OVERLAYS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => ({ id: e.name.replace(/\.json$/, ""), path: path.join(OVERLAYS_DIR, e.name) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const listOverlays: Tool = {
  def: {
    name: "list_overlays",
    description: "List all overlay IDs and file paths in content/site/overlays/.",
    inputSchema: { type: "object", properties: {} },
  },
  run: async () => {
    const overlays = listOverlayFiles();
    return { overlays, count: overlays.length };
  },
};

export const readOverlay: Tool = {
  def: {
    name: "read_overlay",
    description: "Read the JSON content of a specific overlay by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Overlay ID (filename without .json)" },
      },
      required: ["id"],
    },
  },
  run: async (args) => {
    const { id } = args as { id: string };
    const filePath = path.join(OVERLAYS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) throw new Error(`Overlay not found: ${id}`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  },
};

export const writeOverlay: Tool = {
  def: {
    name: "write_overlay",
    description:
      "Write an overlay JSON file. The content must be a valid peblor section block. Use force to overwrite.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Overlay ID (filename without .json)" },
        content: { type: "object", description: "Overlay JSON content (peblor section block)" },
        force: { type: "boolean", description: "Overwrite existing overlay" },
      },
      required: ["id", "content"],
    },
  },
  run: async (args) => {
    const { id, content, force } = args as { id: string; content: unknown; force?: boolean };
    const filePath = path.join(OVERLAYS_DIR, `${id}.json`);
    if (fs.existsSync(filePath) && !force) {
      throw new Error(`Overlay "${id}" already exists. Pass force: true to overwrite.`);
    }
    fs.mkdirSync(OVERLAYS_DIR, { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, "utf-8");
    return { status: "ok", id, file: filePath };
  },
};
