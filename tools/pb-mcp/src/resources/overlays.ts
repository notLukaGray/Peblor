import fs from "node:fs";
import path from "node:path";
import type { StaticResource, TemplateResource } from "../types.js";
import { OVERLAYS_DIR } from "../lib/paths.js";

function listOverlayFiles(): Array<{ id: string; path: string }> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(OVERLAYS_DIR, { withFileTypes: true });
  } catch (err) {
    console.warn("[pb-mcp] Failed to list overlays directory for resource", err);
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => ({ id: e.name.replace(/\.json$/, ""), path: path.join(OVERLAYS_DIR, e.name) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export const overlaysList: StaticResource = {
  kind: "static",
  uri: "peblor://overlays",
  name: "Overlays",
  description: "All overlay IDs and file paths in content/site/overlays/.",
  mimeType: "application/json",
  read: async () => {
    const overlays = listOverlayFiles();
    return { overlays, count: overlays.length };
  },
};

export const overlayContent: TemplateResource = {
  kind: "template",
  uriTemplate: "peblor://overlay-content/{id}",
  name: "Overlay content",
  description: "Raw JSON for a specific overlay by ID (e.g. peblor://overlay-content/header).",
  mimeType: "application/json",
  match: (uri) => uri.match(/^peblor:\/\/overlay-content\/(.+)$/),
  read: async (_uri, m) => {
    const id = m[1]!;
    const filePath = path.join(OVERLAYS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) throw new Error(`Overlay not found: ${id}`);
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
  },
};
