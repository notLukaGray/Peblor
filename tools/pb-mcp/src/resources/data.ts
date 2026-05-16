import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TemplateResource } from "../types.js";
import { DATA_DIR } from "../lib/paths.js";

export const data: TemplateResource = {
  kind: "template",
  uriTemplate: "peblor://data/{name}",
  name: "Site data",
  description: "Site-wide data files: home, layout, presets (e.g. peblor://data/home).",
  mimeType: "application/json",
  match: (uri) => uri.match(/^peblor:\/\/data\/(.+)$/),
  read: async (_uri, m) => JSON.parse(await readFile(join(DATA_DIR, `${m[1]}.json`), "utf-8")),
};
