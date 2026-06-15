/**
 * Extracts inline section definitions from page index.json files into sidecar
 * files, leaving only background definitions inline.
 *
 * Usage: node scripts/sidecar-pages.mjs <glob-of-index.json-files>
 * Example: node scripts/sidecar-pages.mjs content/pages/teaching/brand-thinking/index.json
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { glob } from "glob";

const BG_KEYS = new Set(["bg", "bg-product", "bg-solid", "bg-variable"]);

function isBgDefinition(key, value) {
  if (BG_KEYS.has(key)) return true;
  if (typeof value === "object" && value !== null) {
    const type = value.type ?? value.preset ?? "";
    if (
      String(type).startsWith("background") ||
      String(type).startsWith("bg-") ||
      String(value.preset ?? "").startsWith("bg-")
    )
      return true;
  }
  return false;
}

const patterns = process.argv.slice(2);
if (patterns.length === 0) {
  console.error("Usage: node scripts/sidecar-pages.mjs <glob...>");
  process.exit(1);
}

let total = 0;
let sidecarCount = 0;

for (const pattern of patterns) {
  const files = await glob(pattern, { cwd: process.cwd() });
  for (const file of files) {
    const dir = dirname(file);
    const raw = readFileSync(file, "utf8");
    const page = JSON.parse(raw);

    if (!page.definitions || !page.sectionOrder) continue;

    const inlineDefinitions = {};
    const extracted = [];

    for (const [key, value] of Object.entries(page.definitions)) {
      const isSection = page.sectionOrder.includes(key);
      const isBg = isBgDefinition(key, value);

      if (isSection && !isBg) {
        // Write sidecar
        const sidecarPath = join(dir, `${key}.json`);
        writeFileSync(sidecarPath, JSON.stringify(value, null, 2) + "\n");
        extracted.push(key);
        sidecarCount++;
      } else {
        inlineDefinitions[key] = value;
      }
    }

    if (extracted.length > 0) {
      page.definitions = inlineDefinitions;
      writeFileSync(file, JSON.stringify(page, null, 2) + "\n");
      console.log(`${file}: extracted ${extracted.join(", ")}`);
      total++;
    }
  }
}

console.log(`\nDone: ${total} pages updated, ${sidecarCount} sidecars written.`);
