import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StaticResource } from "../types.js";
import { PEBLOR_ROOT } from "../lib/paths.js";

export const config: StaticResource = {
  kind: "static",
  uri: "peblor://config",
  name: "Peblor Config",
  description: "peblor.config.json — contentDir, validatePagesBaseRef, feature flags.",
  mimeType: "application/json",
  read: async () => JSON.parse(await readFile(join(PEBLOR_ROOT, "peblor.config.json"), "utf-8")),
};
