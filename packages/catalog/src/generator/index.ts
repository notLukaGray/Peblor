/**
 * Catalog generator.
 *
 * Reads src/intent/*.intent.yaml, validates each entry, then emits
 * src/generated/catalog.yaml and src/generated/catalog.json.
 *
 * With --ci: fails if regenerated output differs from the checked-in copy.
 * Field-level schema introspection lives in walk-zod.ts and is wired where
 * entry validation needs schema cross-checks.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { load as loadYaml, dump as dumpYaml } from "js-yaml";
import { validateEntry, type ValidationError } from "./validate.js";
import type { CatalogEntry, Catalog } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_ROOT = resolve(__dirname, "..", "..");
const MONOREPO_ROOT = resolve(PACKAGE_ROOT, "..", "..");
const APPS_WEB = MONOREPO_ROOT;
const INTENT_DIR = join(PACKAGE_ROOT, "src", "intent");
const GENERATED_DIR = join(PACKAGE_ROOT, "src", "generated");

const CATALOG_YAML_PATH = join(GENERATED_DIR, "catalog.yaml");
const CATALOG_JSON_PATH = join(GENERATED_DIR, "catalog.json");
const CATALOG_VERSION = "1";

const CI_MODE = process.argv.includes("--ci");

function readIntentFiles(): CatalogEntry[] {
  const files = readdirSync(INTENT_DIR).filter((f) => f.endsWith(".intent.yaml"));

  if (files.length === 0) {
    console.error("catalog:build — no intent files found in", INTENT_DIR);
    process.exit(1);
  }

  const entries: CatalogEntry[] = [];
  const allErrors: ValidationError[] = [];

  for (const file of files.sort()) {
    const raw = readFileSync(join(INTENT_DIR, file), "utf-8");
    const parsed = loadYaml(raw) as Partial<CatalogEntry>;

    const errors = validateEntry(parsed, APPS_WEB);
    if (errors.length > 0) {
      allErrors.push(...errors);
      continue;
    }

    entries.push(parsed as CatalogEntry);
  }

  if (allErrors.length > 0) {
    console.error("\ncatalog:build — validation errors:\n");
    for (const e of allErrors) {
      console.error(`  [${e.id}] ${e.field}: ${e.message}`);
    }
    process.exit(1);
  }

  return entries;
}

function buildCatalog(entries: CatalogEntry[]): Catalog {
  return {
    version: CATALOG_VERSION,
    generated_at: new Date().toISOString(),
    entries,
  };
}

function emitCatalog(catalog: Catalog): void {
  const yamlContent = dumpYaml(catalog, { lineWidth: 100, quotingType: '"' });
  const jsonContent = JSON.stringify(catalog, null, 2) + "\n";

  if (CI_MODE) {
    const existingYaml = existsSync(CATALOG_YAML_PATH)
      ? readFileSync(CATALOG_YAML_PATH, "utf-8")
      : null;
    const existingJson = existsSync(CATALOG_JSON_PATH)
      ? readFileSync(CATALOG_JSON_PATH, "utf-8")
      : null;

    const missing: string[] = [];
    if (!existingYaml) missing.push("src/generated/catalog.yaml");
    if (!existingJson) missing.push("src/generated/catalog.json");

    if (missing.length > 0) {
      console.error(
        `\ncatalog:build --ci — generated output missing:\n  ${missing.join("\n  ")}\n` +
          "Run `npm run catalog:build` to generate the missing files.\n"
      );
      process.exit(1);
    }

    // Normalize generated_at before comparing (it changes every run)
    const normalize = (s: string) =>
      s
        .replace(/"generated_at":\s*"[^"]+"/g, '"generated_at": "<ignored>"')
        .replace(/generated_at:\s*'[^']+'/g, "generated_at: '<ignored>'")
        .replace(/generated_at:\s*[^\n]+/g, "generated_at: <ignored>");

    const yamlDiffers = existingYaml && normalize(existingYaml) !== normalize(yamlContent);
    const jsonDiffers = existingJson && normalize(existingJson) !== normalize(jsonContent);

    if (yamlDiffers || jsonDiffers) {
      console.error(
        "\ncatalog:build --ci — generated output differs from checked-in copy.\n" +
          "Run `npm run catalog:build` and commit the updated generated files.\n"
      );
      process.exit(1);
    }

    console.warn("catalog:build --ci — generated output matches checked-in copy. ✓");
    return;
  }

  writeFileSync(CATALOG_YAML_PATH, yamlContent, "utf-8");
  writeFileSync(CATALOG_JSON_PATH, jsonContent, "utf-8");
  console.warn(`catalog:build — wrote ${entries.length} entries to src/generated/`);
}

const entries = readIntentFiles();
const catalog = buildCatalog(entries);
emitCatalog(catalog);

// satisfy TypeScript — entries reference is used above
const { entries: _e } = catalog;
void _e;
