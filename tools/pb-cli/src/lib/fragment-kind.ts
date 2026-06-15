/**
 * Shared fragment kind inference — single source of truth used by both
 * `validate-fragment` (CLI) and `schema-doctor` (MCP).
 *
 * A "fragment" is any standalone JSON that isn't a full page. We infer what
 * kind of schema to validate against from the `type` discriminator.
 */

/** The canonical set of section type strings. */
export const SECTION_TYPES = new Set([
  "contentBlock",
  "scrollContainer",
  "sectionColumn",
  "revealSection",
  "divider",
  "formBlock",
  "sectionTrigger",
]);

export type FragmentKind =
  | "section"
  | "element"
  | "action"
  | "bg"
  | "module"
  | "overlay"
  | "motion"
  | "fragment";

/**
 * Infer the fragment kind from its value.
 *
 * Handles:
 *  - Direct `{ type: "..." }` objects
 *  - Preset file wrappers: `{ "preset-key": { type: "..." } }`
 */
export function inferFragmentKind(value: unknown): FragmentKind {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "fragment";
  const rec = value as Record<string, unknown>;
  let type = typeof rec.type === "string" ? rec.type : "";

  // Unwrap preset file wrappers: { "preset-key": { type: "..." } }
  if (!type) {
    for (const v of Object.values(rec)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = v as Record<string, unknown>;
        if (typeof inner.type === "string") {
          type = inner.type;
          break;
        }
      }
    }
  }

  if (type.startsWith("element")) return "element";
  if (type.startsWith("background")) return "bg";
  if (type === "module") return "module";
  if (SECTION_TYPES.has(type)) return "section";
  if (type) return "action";
  return "fragment";
}

/**
 * Map a fragment kind to the pb-cli command that validates it.
 */
export function fragmentKindToCliCommand(kind: FragmentKind): string {
  switch (kind) {
    case "section":
      return "validate-section";
    case "element":
      return "validate-element";
    case "action":
      return "validate-action";
    case "bg":
      return "validate-bg";
    case "module":
      return "validate-module-fragment";
    case "overlay":
      return "validate-overlay-fragment";
    default:
      return "validate-fragment";
  }
}
