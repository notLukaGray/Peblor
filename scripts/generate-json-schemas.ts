#!/usr/bin/env npx tsx

/**
 * Generate JSON Schema files from Zod schemas for editor support.
 *
 * VSCode/Cursor use these schemas to provide autocomplete, validation, and
 * hover docs when editing page/section/module JSON files—so you get
 * schema-backed "variables" (property names, types, enums) without memorizing.
 *
 * Usage:
 *   npm run generate-json-schemas
 *
 * Output:
 *   peblor.schema.json       — page files (work/*.json)
 *   definition-block.schema.json    — section/preset blocks (work/slug/*.json, presets/*.json)
 *   definitions-file.schema.json    — sections file (work/*-sections.json)
 *   module.schema.json              — module files (modules/*.json)
 *
 * Wire-up: .vscode/settings.json maps these to file patterns via json.schemas.
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import {
  knownPageTagsConfigSchema,
  type KnownPageTagsConfig,
  peblorSchema,
  peblorDefinitionBlockSchema,
  moduleBlockSchema,
  modalBuilderSchema,
} from "@pb/contracts";
import { resolveContentDir } from "@pb/core/lib/peblor-config";

// Sections file: work/slug-sections.json has only { definitions: { ... } }
const definitionsFileSchema = z.object({
  definitions: z.record(z.string(), peblorDefinitionBlockSchema),
});

const CONTENT_DIR = resolveContentDir();

const SCHEMAS_DIR = path.join(CONTENT_DIR, "schemas");
const TAGS_CONFIG_PATH = path.join(CONTENT_DIR, "config/tags.json");

const toJSONSchemaOptions = {
  target: "draft-2020-12" as const,
  unrepresentable: "any" as const,
  cycles: "ref" as const,
};

/** Keys we never want to be required in JSON schemas (legacy entrance fields removed from element schema). */
const ENTRANCE_REQUIRED_KEYS = new Set([
  "animate",
  "entranceAmount",
  "entranceOnce",
  "entranceDuration",
  "entranceDelay",
  "entranceDistance",
  "entranceEase",
]);

type JsonSchemaObject = Record<string, unknown>;

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function loadKnownPageTagsConfig(): KnownPageTagsConfig | null {
  if (!fs.existsSync(TAGS_CONFIG_PATH)) return null;

  const raw = fs.readFileSync(TAGS_CONFIG_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const result = knownPageTagsConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid known tags config at ${path.relative(process.cwd(), TAGS_CONFIG_PATH)}:\n${formatZodIssues(result.error)}`
    );
  }
  return result.data;
}

function getObject(value: unknown): JsonSchemaObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonSchemaObject;
}

function buildKnownTagsJsonSchema(config: KnownPageTagsConfig): JsonSchemaObject {
  const properties: Record<string, unknown> = {};
  const defaultTags: Record<string, string[]> = {};
  for (const [category, values] of Object.entries(config.knownTags)) {
    properties[category] = {
      type: "array",
      items: values.length > 0 ? { type: "string", enum: values } : false,
      uniqueItems: true,
      default: [],
    };
    defaultTags[category] = [];
  }

  return {
    type: "object",
    description:
      "Taxonomy tags. Categories and values are sourced from src/content/config/tags.json.",
    properties,
    default: defaultTags,
    additionalProperties: false,
  };
}

function applyKnownTagsToPageSchema(
  schema: JsonSchemaObject,
  config: KnownPageTagsConfig | null
): void {
  if (!config) return;

  const properties = getObject(schema.properties);
  if (!properties) return;

  properties.tags = buildKnownTagsJsonSchema(config);

  const filterConfig = getObject(properties.filterConfig);
  const filterProperties = getObject(filterConfig?.properties);
  const categories = getObject(filterProperties?.categories);
  const categoryItems = getObject(categories?.items);
  const categoryItemProperties = getObject(categoryItems?.properties);
  if (categoryItemProperties?.key) {
    categoryItemProperties.key = {
      type: "string",
      enum: Object.keys(config.knownTags),
      description: "Known tag category from src/content/config/tags.json.",
    };
  }
}

/** Recursively walk a JSON Schema object and strip entrance* keys from any "required" arrays. */
function stripEntranceFromRequired(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;

  if (Array.isArray(schema)) {
    return schema.map((item) => stripEntranceFromRequired(item));
  }

  const obj = schema as Record<string, unknown>;

  if (Array.isArray(obj.required)) {
    obj.required = (obj.required as unknown[]).filter(
      (key) => typeof key === "string" && !ENTRANCE_REQUIRED_KEYS.has(key)
    );
  }

  for (const [k, v] of Object.entries(obj)) {
    obj[k] = stripEntranceFromRequired(v);
  }

  return obj;
}

/** Recursively walk and remove from "required" any field whose property definition has a "default". */
function stripDefaultsFromRequired(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;

  if (Array.isArray(schema)) {
    return schema.map((item) => stripDefaultsFromRequired(item));
  }

  const obj = schema as Record<string, unknown>;

  if (Array.isArray(obj.required) && obj.properties && typeof obj.properties === "object") {
    const props = obj.properties as Record<string, unknown>;
    obj.required = (obj.required as unknown[]).filter((key) => {
      if (typeof key !== "string") return true;
      const prop = props[key];
      if (!prop || typeof prop !== "object") return true;
      return !("default" in prop);
    });
  }

  for (const [k, v] of Object.entries(obj)) {
    obj[k] = stripDefaultsFromRequired(v);
  }

  return obj;
}

// ---------------------------------------------------------------------------
// Deduplication: z.toJSONSchema() inlines every type everywhere it's
// referenced, producing 50–110 MB files. We walk the tree to find
// discriminated-union arrays (oneOf/anyOf where every entry has a
// properties.type.const discriminator) and extract each variant into a
// named $defs entry, replacing the inline definition with a $ref.
//
// We run in a fixpoint loop: after extracting top-level unions (element
// types, section types, backgrounds, actions), we re-walk $defs values
// to extract any nested unions within those variants (e.g. the 86-action
// trigger union that appears inside every element's triggers field).
// ---------------------------------------------------------------------------

/**
 * Recursively walk a JSON Schema tree, extracting discriminated-union
 * variants into the root `$defs` and replacing them with `$ref` pointers.
 */
function deduplicateSchema(root: JsonSchemaObject): void {
  if (!root.$defs) root.$defs = {};
  const defs = root.$defs as Record<string, unknown>;

  // Fixpoint: keep walking $defs until no new entries are added.
  // Each pass may extract nested discriminated unions from previously
  // extracted variants (e.g. the trigger action union inside element types).
  let prevDefCount = -1;
  while (Object.keys(defs).length !== prevDefCount) {
    prevDefCount = Object.keys(defs).length;

    // Walk all $defs values (snapshot keys so new additions are visited
    // on the next iteration).
    for (const defKey of Object.keys(defs)) {
      defs[defKey] = walk(defs[defKey], defs);
    }

    // Walk the rest of the schema (properties, etc.) excluding $defs
    for (const key of Object.keys(root)) {
      if (key === "$defs" || key === "$schema" || key === "$id") continue;
      root[key] = walk(root[key], defs);
    }
  }
}

function walk(node: unknown, defs: Record<string, unknown>): unknown {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    // Discriminated union? Extract each variant to $defs.
    if (node.length >= 2 && isDiscriminatedUnion(node as JsonSchemaObject[])) {
      return (node as JsonSchemaObject[]).map((entry) => {
        const constValue = (
          (entry.properties as Record<string, unknown>)?.type as Record<string, unknown>
        ).const as string;
        if (!defs[constValue]) {
          defs[constValue] = entry;
        }
        return { $ref: `#/$defs/${constValue}` };
      });
    }
    // Plain array — recurse into items
    return node.map((item) => walk(item, defs));
  }

  const obj = node as JsonSchemaObject;

  // Recurse into children
  for (const key of Object.keys(obj)) {
    // $defs inside variants are unused — $ref always resolves to the root
    if (key === "$defs") continue;
    obj[key] = walk(obj[key], defs);
  }

  return obj;
}

/** Every entry has a `properties.type.const` discriminator? */
function isDiscriminatedUnion(arr: JsonSchemaObject[]): boolean {
  return arr.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (entry.$ref) return false; // already extracted
    const t = (entry.properties as Record<string, unknown>)?.type as
      | Record<string, unknown>
      | undefined;
    return typeof t?.const === "string" && t.const.length > 0;
  });
}

// ---------------------------------------------------------------------------

function writeSchemaFile(filename: string, schema: object): void {
  const filePath = path.join(SCHEMAS_DIR, filename);
  const cleaned = stripDefaultsFromRequired(stripEntranceFromRequired(schema)) as JsonSchemaObject;
  deduplicateSchema(cleaned);
  const wrapped = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: filename,
    ...cleaned,
  };
  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
  // Minified output — pretty-printing was adding ~80% whitespace overhead
  fs.writeFileSync(filePath, JSON.stringify(wrapped), "utf-8");
  const stats = fs.statSync(filePath);
  process.stdout.write(`  ✓ ${filename} (${(stats.size / 1024).toFixed(1)} KB)\n`);
}

function main(): void {
  process.stdout.write("Generating JSON schemas...\n");
  const knownTagsConfig = loadKnownPageTagsConfig();

  // Page: full page JSON (work/slug.json, work/foo.json)
  process.stdout.write("  → peblor.schema.json\n");
  const pageSchema = z.toJSONSchema(peblorSchema, toJSONSchemaOptions);
  if (pageSchema && typeof pageSchema === "object") {
    applyKnownTagsToPageSchema(pageSchema as JsonSchemaObject, knownTagsConfig);
    writeSchemaFile("peblor.schema.json", pageSchema as object);
  }

  // Definition block: section files (work/slug/nav.json) and preset blocks (presets/*.json)
  process.stdout.write("  → definition-block.schema.json\n");
  const definitionSchema = z.toJSONSchema(peblorDefinitionBlockSchema, toJSONSchemaOptions);
  if (definitionSchema && typeof definitionSchema === "object") {
    writeSchemaFile("definition-block.schema.json", definitionSchema as object);
  }

  // Module: module JSON (modules/*.json)
  process.stdout.write("  → module.schema.json\n");
  const moduleSchema = z.toJSONSchema(moduleBlockSchema, toJSONSchemaOptions);
  if (moduleSchema && typeof moduleSchema === "object") {
    writeSchemaFile("module.schema.json", moduleSchema as object);
  }

  // Modal: modal definition JSON (modals/*.json)
  process.stdout.write("  → modal.schema.json\n");
  const modalSchema = z.toJSONSchema(modalBuilderSchema, toJSONSchemaOptions);
  if (modalSchema && typeof modalSchema === "object") {
    writeSchemaFile("modal.schema.json", modalSchema as object);
  }

  // Definitions-only file: work/slug-sections.json
  process.stdout.write("  → definitions-file.schema.json\n");
  const definitionsFile = z.toJSONSchema(definitionsFileSchema, toJSONSchemaOptions);
  if (definitionsFile && typeof definitionsFile === "object") {
    writeSchemaFile("definitions-file.schema.json", definitionsFile as object);
  }

  process.stdout.write("Done.\n");
}

main();
