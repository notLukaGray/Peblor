import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const PEBLOR_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
export const CLI_ENTRY = join(PEBLOR_ROOT, "tools/pb-cli/src/index.ts");
export const CONTENT_DIR = join(PEBLOR_ROOT, "content");
export const PAGES_DIR = join(PEBLOR_ROOT, "content/pages");
export const PRESETS_DIR = join(PEBLOR_ROOT, "content/presets");
export const MODALS_DIR = join(PEBLOR_ROOT, "content/modals");
export const MODULES_DIR = join(PEBLOR_ROOT, "content/modules");
export const DATA_DIR = join(PEBLOR_ROOT, "content/data");
export const SITE_DIR = join(PEBLOR_ROOT, "content/site");
export const OVERLAYS_DIR = join(PEBLOR_ROOT, "content/site/overlays");
