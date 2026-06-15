// Thin loader — reads browser JS extraction scripts from standalone .js files
// under extraction-scripts/ and re-exports them as strings for the steal pipeline.
// The .js files are raw browser-executable scripts, not Node modules.
import fs from "fs";
import path from "path";

const scriptsDir = path.join(import.meta.dirname, "extraction-scripts");

function load(name: string): string {
  return fs.readFileSync(path.join(scriptsDir, name), "utf8").trim();
}

export const LAZY_LOAD_SCROLL_SCRIPT = load("lazy-load-scroll.js");
export const LAYOUT_EXTRACTION_SCRIPT = load("layout-extraction.js");
export const LAYOUT_SNAPSHOT_SCRIPT = load("layout-snapshot.js");
export const TYPOGRAPHY_EXTRACTION_SCRIPT = load("typography-extraction.js");
