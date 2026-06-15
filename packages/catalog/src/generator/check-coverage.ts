import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { load as loadYaml } from "js-yaml";
import { ALL_ENTRIES } from "../intent/ENTRIES.js";
import { SCHEMA_REGISTRY } from "./schema-registry.js";
import { walkZodShape } from "./walk-zod.js";
import type { CatalogEntry } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_ROOT = resolve(__dirname, "..", "..");
const INTENT_DIR = join(PACKAGE_ROOT, "src", "intent");
const APPS_WEB_ROOT = resolve(PACKAGE_ROOT, "..", "..");

const STUB_MIN_NON_TYPE_FIELDS = 3;
const STUB_WARN = true;

type IntentFile = {
  id?: string;
  kind?: string;
  schema_ref?: string;
  covers?: Array<{ description?: string; example?: string; minimal?: boolean }>;
};

function idToFilename(id: string): string {
  return id.replace(/\./g, "-").replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`) + ".intent.yaml";
}

function readIntentFile(filePath: string): IntentFile | null {
  try {
    const raw = readFileSync(filePath, "utf8");
    return loadYaml(raw) as IntentFile;
  } catch (err) {
    console.warn("[pb-catalog] Failed to read intent file: " + filePath, err);
    return null;
  }
}

function countNonTypeFields(json: Record<string, unknown>): number {
  let count = 0;
  for (const [key, value] of Object.entries(json)) {
    if (key === "type") continue;
    count++;
    if (Array.isArray(value) && value.length > 0) count++;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as object).length > 0
    ) {
      count++;
    }
  }
  return count;
}

function getValidatableDocs(parsed: unknown): Array<Record<string, unknown>> {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.type === "string") return [obj];
    const subDocs = Object.values(obj).filter(
      (v): v is Record<string, unknown> =>
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        typeof (v as Record<string, unknown>).type === "string"
    );
    if (subDocs.length > 0) return subDocs;
    return [obj];
  }
  return [];
}

let missing = 0;
let schemaFail = 0;
let stubWarn = 0;

for (const id of ALL_ENTRIES) {
  const intentFile = join(INTENT_DIR, idToFilename(id));

  if (!existsSync(intentFile)) {
    console.error(`catalog:check-coverage — missing intent file for "${id}": ${intentFile}`);
    missing++;
    continue;
  }

  const intent = readIntentFile(intentFile);
  if (!intent || !intent.schema_ref) continue;

  const schema = SCHEMA_REGISTRY[intent.schema_ref];
  if (!schema) continue;

  for (const cover of intent.covers ?? []) {
    if (!cover.example) continue;

    const examplePath = join(APPS_WEB_ROOT, cover.example);
    if (!existsSync(examplePath)) {
      console.error(`catalog:check-coverage — example file missing for "${id}": ${examplePath}`);
      missing++;
      continue;
    }

    let parsed: unknown;
    try {
      const raw = readFileSync(examplePath, "utf8");
      parsed = JSON.parse(raw);
    } catch {
      console.error(
        `catalog:check-coverage — example file invalid JSON for "${id}": ${examplePath}`
      );
      schemaFail++;
      continue;
    }

    const docs = getValidatableDocs(parsed);

    if (docs.length === 0) {
      console.error(
        `catalog:check-coverage — example file has no validatable documents for "${id}": ${examplePath}`
      );
      schemaFail++;
      continue;
    }

    let anyPassed = false;
    const allErrors: string[] = [];

    for (const doc of docs) {
      const result = schema.safeParse(doc);
      if (result.success) {
        anyPassed = true;
        const nonTypeCount = countNonTypeFields(doc);
        const isMinimal = cover.minimal === true;

        if (nonTypeCount < STUB_MIN_NON_TYPE_FIELDS && !isMinimal) {
          stubWarn++;
          if (STUB_WARN) {
            console.warn(
              `catalog:check-coverage — possible stub for "${id}" example "${cover.example}": ` +
                `only ${nonTypeCount} non-type field(s) (minimum ${STUB_MIN_NON_TYPE_FIELDS}). ` +
                `Add more fields or set covers[].minimal: true in the intent file.`
            );
          }
        }
      } else {
        const flatErrors = (
          result.error as { errors?: Array<{ path: (string | number)[]; message: string }> }
        ).errors;
        const msg = flatErrors
          ? flatErrors.map((e) => `  ${e.path.join(".") || "(root)"}: ${e.message}`).join("\n")
          : String(result.error);
        allErrors.push(msg);
      }
    }

    if (!anyPassed) {
      schemaFail++;
      console.error(
        `catalog:check-coverage — schema validation failed for "${id}" example "${cover.example}" (${docs.length} document(s)):\n${allErrors.join("\n")}`
      );
    }
  }
}

if (missing > 0 || schemaFail > 0) {
  if (missing > 0) {
    console.error(
      `\ncatalog:check-coverage — ${missing} entries have missing/misconfigured intent files.`
    );
  }
  if (schemaFail > 0) {
    console.error(
      `catalog:check-coverage — ${schemaFail} example file(s) failed schema validation.`
    );
  }
  process.exit(1);
}

console.warn(
  `catalog:check-coverage — all ${ALL_ENTRIES.length} entries have intent files and valid examples. ✓`
);
if (stubWarn > 0) {
  console.warn(
    `\ncatalog:check-coverage — ${stubWarn} possible stub(s) detected (warning only, not failing CI yet).`
  );
} else {
  console.warn(`catalog:check-coverage — no stub warnings. ✓`);
}

// --sweep: report schema fields with zero catalog entry coverage
if (process.argv.includes("--sweep")) {
  runSweep();
}

function runSweep(): void {
  const INFRA = new Set([
    "id",
    "meta",
    "analytics",
    "type",
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
    "marginLeft",
    "marginRight",
    "marginTop",
    "marginBottom",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "flex",
    "flow",
    "wrap",
    "flexGrow",
    "flexShrink",
    "align",
    "alignSelf",
    "distribute",
    "justifySelf",
    "display",
    "gap",
    "rowGap",
    "columnGap",
    "fill",
    "stroke",
    "color",
    "textFill",
    "text",
    "borderRadius",
    "border",
    "borderTop",
    "borderRight",
    "borderBottom",
    "borderLeft",
    "borderWidth",
    "borderStyle",
    "borderGradient",
    "boxShadow",
    "textShadow",
    "filter",
    "bgBlur",
    "clipPath",
    "opacity",
    "scroll",
    "aspectRatio",
    "cursor",
    "layer",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "initialX",
    "initialY",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "wordWrap",
    "textDecoration",
    "ariaLabel",
    "aria",
    "role",
    "tabIndex",
    "figmaConstraints",
    "constraints",
    "align",
    "alignY",
    "priority",
    "fixed",
    "showWhen",
    "wrapperStyle",
    "blendMode",
    "hidden",
    "rotate",
    "flipHorizontal",
    "flipVertical",
    "textTransform",
    "whiteSpace",
    "interactions",
    "dragUnit",
    "dragBehavior",
    "dragAxis",
    "src",
    "alt",
    "imageRotation",
    // Motion infrastructure (low-level)
    "initial",
    "animate",
    "exit",
    "transition",
    "initialVariant",
    "animateVariant",
    "exitVariant",
    "variants",
    "viewport",
    "custom",
    "presenceAffectsLayout",
    "motionTiming",
    "motion",
    "reduceMotion",
    "entrancePreset",
    "exitPreset",
    "entranceMotion",
    "exitMotion",
    "resolvedEntranceMotion",
    // Trigger infrastructure
    "onVisible",
    "onInvisible",
    "onProgress",
    "onViewportProgress",
    "threshold",
    "triggerOnce",
    "rootMargin",
    "delay",
    "action",
    "actionPayload",
    "keyboardTriggers",
    "timerTriggers",
    "cursorTriggers",
    "scrollDirectionTriggers",
    "idleTriggers",
    // Effects coverage (section.effects)
    "effects",
    // Content
    "elements",
    "content",
    // Misc
    "layers",
    "columns",
    "section",
    "elementOrder",
    "gridDebug",
  ]);

  // Collect ALL fields from ALL catalog entries (cross-schema)
  const allCovered = new Set<string>();
  const intentFiles = readdirSync(INTENT_DIR).filter((f) => f.endsWith(".intent.yaml"));
  for (const file of intentFiles) {
    const raw = readFileSync(join(INTENT_DIR, file), "utf8");
    const parsed = loadYaml(raw) as Partial<CatalogEntry>;
    if (!parsed.axes) continue;
    for (const axis of parsed.axes) {
      for (const field of axis.fields ?? []) allCovered.add(field);
    }
  }

  let found = 0;
  for (const [schemaName, schema] of Object.entries(SCHEMA_REGISTRY)) {
    let shapeFields: Record<string, unknown>;
    try {
      shapeFields = walkZodShape(schema) as Record<string, unknown>;
    } catch (err) {
      console.warn("[pb-catalog] Failed to walk Zod shape for schema: " + schemaName, err);
      continue;
    }
    const uncovered: string[] = [];
    for (const field of Object.keys(shapeFields)) {
      if (INFRA.has(field)) continue;
      if (allCovered.has(field)) continue;
      uncovered.push(field);
    }
    if (uncovered.length > 0) {
      found += uncovered.length;
      console.warn(`\n  ${schemaName}:`);
      for (const f of uncovered) console.warn(`    - ${f}`);
    }
  }

  if (found === 0) {
    console.warn("\ncatalog:sweep — all behavioral schema fields have catalog coverage. ✓");
  } else {
    console.warn(`\ncatalog:sweep — ${found} uncovered field(s) across schemas (review above).`);
  }
}
