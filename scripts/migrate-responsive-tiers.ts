#!/usr/bin/env npx tsx
/**
 * Codemod: migrate general responsive values from legacy shapes to canonical tier maps.
 *
 * Converts for GENERAL responsive fields only:
 *   [mobile, desktop]     -> { "base": mobile, "md": desktop }
 *   { mobile, desktop }   -> { "base": mobile, "md": desktop }
 *
 * Hard exclusions (never converted):
 *   - aspectRatio (ambiguous ratio-pair semantics in element-image renderer)
 *   - Section-column subsystem: columns, columnWidths, columnGaps, columnStyles,
 *     itemStyles, gridMode, itemLayout, elementOrder, columnAssignments, columnSpan
 *   - Motion/animation fields: offset, input, output (scroll/animation tuples)
 *   - Any array not exactly length 2 or with non-scalar elements
 *
 * Safe to re-run: idempotent (already-converted { base, md } objects are skipped).
 */

import fs from "fs";
import path from "path";
import { glob } from "fast-glob";

// ---------------------------------------------------------------------------
// Field allowlist — derived from schema inspection of packages/contracts/src.
// Only fields whose schema is routed through responsiveValueSchema() are included.
// ---------------------------------------------------------------------------

const GENERAL_RESPONSIVE_FIELDS = new Set<string>([
  // elementLayoutSchemaBase (element-foundation-schemas.ts)
  "width",
  "height",
  "borderRadius",
  "align",
  "alignY",
  "textAlign",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "margin",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "flexBasis",
  "alignSelf",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "hidden",
  "outline",
  // baseSectionPropsSchema (section-block-base-schemas.ts)
  "ariaLabel",
  "fill",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "sectionGap",
  "stickyOffset",
  "fixedOffset",
  "initialX",
  "initialY",
  // sectionContentBlockSchema (section-block-base-schemas.ts)
  "flexDirection",
  "alignItems",
  "justifyContent",
  "flexWrap",
  "gap",
  "rowGap",
  "columnGap",
  "contentWidth",
  "contentHeight",
  // sectionColumnBaseSchema (section-block-base-schemas.ts)
  "gridAutoRows",
  "gridAutoColumns",
  // typographyOverridesSchema (schema-shared-primitives.ts) — responsive size values
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "paragraphSpacing",
  // elementGroupSchema (element-block-schemas.ts)
  "display",
  "flex",
  // elementInfiniteScrollSchema (element-block-schemas.ts)
  // (alignItems, justifyContent, gap, flexDirection, display, padding, minHeight, maxHeight, minWidth, maxWidth already above)
  // elementBodySchema (element-content-schemas.ts)
  "level",
  // elementImageSchema / elementVideoSchema (element-content-schemas.ts)
  "objectFit",
  // elementCounterSchema (element-counter-schemas.ts)
  // (fontSize already above)
  // elementButtonSchema (element-button-schemas.ts)
  "wrapperPadding",
  "wrapperBorderRadius",
  "wrapperWidth",
  "wrapperHeight",
  "wrapperMinWidth",
  "wrapperMinHeight",
  // elementTabsSchema (element-tabs-schemas.ts)
  "tabGap",
  "tabPadding",
  "tabMinWidth",
  "contentPadding",
  // elementDragSchema (element-drag-schemas.ts)
  "dragHandleWidth",
  "dragHandleHeight",
  // section fill (responsiveThemeStringSchema) — already covered by "fill"
  // baseSectionPropsSchema: responsiveStringSchema fields not yet listed
  "sectionGap",
]);

// ---------------------------------------------------------------------------
// Hard exclusions — fields we must NEVER convert even if a 2-element array
// ---------------------------------------------------------------------------

const EXCLUDED_FIELDS = new Set<string>([
  // Ambiguous ratio-pair semantics — renderer builds "a/b" from 2-tuple
  "aspectRatio",
  // Section-column subsystem — migrated separately in step 2b
  "columns",
  "columnWidths",
  "columnGaps",
  "columnStyles",
  "itemStyles",
  "gridMode",
  "itemLayout",
  "elementOrder",
  "columnAssignments",
  "columnSpan",
  // Motion / animation / scroll — NOT responsive
  "offset",
  "input",
  "output",
  "easing",
  "animate",
  "initial",
  "exit",
  "keyframes",
  "transition",
  "variants",
]);

// ---------------------------------------------------------------------------
// Conversion logic
// ---------------------------------------------------------------------------

/**
 * Check if a value is a scalar (string, number, boolean — but not null/undefined/object/array).
 */
function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/**
 * Attempt to convert a value for a given field key.
 * Returns the converted value, or undefined if no conversion is needed/safe.
 */
function convertValue(key: string, value: unknown): unknown | undefined {
  // Skip excluded fields
  if (EXCLUDED_FIELDS.has(key)) return undefined;
  // Skip non-allowlisted fields
  if (!GENERAL_RESPONSIVE_FIELDS.has(key)) return undefined;

  // Case 1: 2-element array of scalars → { base, md }
  if (Array.isArray(value) && value.length === 2 && isScalar(value[0]) && isScalar(value[1])) {
    return { base: value[0], md: value[1] };
  }

  // Case 2: { mobile?, desktop? } object with exactly those keys → { base, md }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    // Must have ONLY mobile/desktop keys (at least one)
    if (
      keys.length >= 1 &&
      keys.length <= 2 &&
      keys.every((k) => k === "mobile" || k === "desktop") &&
      (obj.mobile !== undefined || obj.desktop !== undefined)
    ) {
      const result: Record<string, unknown> = {};
      if (obj.mobile !== undefined) result.base = obj.mobile;
      if (obj.desktop !== undefined) result.md = obj.desktop;
      return result;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Deep walk and transform
// ---------------------------------------------------------------------------

type Counts = Map<string, number>;

function walkAndTransform(data: unknown, counts: Counts, depth = 0): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => walkAndTransform(item, counts, depth + 1));
  }
  if (data !== null && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const converted = convertValue(key, value);
      if (converted !== undefined) {
        // Verify the conversion is actually different from the existing value
        // (idempotency: skip if already a tier-map { base, md })
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          const vObj = value as Record<string, unknown>;
          const vKeys = Object.keys(vObj);
          // Already a canonical tier-map — skip
          if (
            vKeys.length > 0 &&
            vKeys.every((k) => ["base", "sm", "md", "lg", "xl", "2xl", "@container"].includes(k))
          ) {
            result[key] = walkAndTransform(value, counts, depth + 1);
            continue;
          }
        }
        result[key] = converted;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      } else {
        result[key] = walkAndTransform(value, counts, depth + 1);
      }
    }
    return result;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const contentDir = path.resolve(import.meta.dirname ?? __dirname, "../content");

  // Glob all JSON files under content/, excluding the generated schemas/ directory
  const files = await glob("**/*.json", {
    cwd: contentDir,
    ignore: ["schemas/**"],
    absolute: true,
    onlyFiles: true,
  });

  console.log(`Found ${files.length} JSON files to process.\n`);

  const totalCounts: Counts = new Map();
  let filesModified = 0;
  let filesSkipped = 0;

  for (const filePath of files.sort()) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      console.error(`ERROR reading ${filePath}: ${err}`);
      continue;
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`ERROR parsing ${filePath}: ${err}`);
      continue;
    }

    const localCounts: Counts = new Map();
    const transformed = walkAndTransform(data, localCounts);

    if (localCounts.size === 0) {
      filesSkipped++;
      continue;
    }

    // Merge local counts into total
    for (const [key, count] of localCounts) {
      totalCounts.set(key, (totalCounts.get(key) ?? 0) + count);
    }

    // Write back — use 2-space indent to match existing content formatting
    const newRaw = JSON.stringify(transformed, null, 2) + "\n";
    try {
      fs.writeFileSync(filePath, newRaw, "utf-8");
    } catch (err) {
      console.error(`ERROR writing ${filePath}: ${err}`);
      continue;
    }

    const relativePath = path.relative(contentDir, filePath);
    const summary = Array.from(localCounts.entries())
      .map(([k, n]) => `${k}(${n})`)
      .join(", ");
    console.log(`  MODIFIED ${relativePath} [${summary}]`);
    filesModified++;
  }

  console.log("\n=== Migration summary ===");
  console.log(`Files modified:  ${filesModified}`);
  console.log(`Files unchanged: ${filesSkipped}`);
  console.log(`\nPer-field conversion counts:`);

  const sorted = Array.from(totalCounts.entries()).sort(([, a], [, b]) => b - a);
  let total = 0;
  for (const [key, count] of sorted) {
    console.log(`  ${key.padEnd(22)} ${count}`);
    total += count;
  }
  console.log(`  ${"TOTAL".padEnd(22)} ${total}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
