import type { Tool } from "../types.js";
import { runCli } from "../lib/cli.js";
import { findPage } from "../lib/fs.js";
import { filePathToSlugSegments } from "../lib/slug.js";

// ── static knowledge map ──────────────────────────────────────────────────────

type DiagnosticKnowledge = {
  explanation: string;
  likelyCauses: string[];
  suggestedFix: string;
  relatedTools: string[];
};

const DIAGNOSTIC_MAP: Record<string, DiagnosticKnowledge> = {
  PB_STRICT_LOAD_FAILED: {
    explanation:
      "The page wrote to disk but failed the full pipeline validation (preset resolution, " +
      "module hydration, section expansion, cross-reference checks). The file was rolled back.",
    likelyCauses: [
      "A preset key referenced in definitions does not exist in any loaded preset file.",
      "An elementOrder entry references a key not present in definitions.",
      "A sectionOrder entry references a key not present in definitions.",
      "A circular preset reference was introduced.",
      "A module key is invalid or the module file is malformed.",
    ],
    suggestedFix:
      "Run doctor_page on the file — it runs each pipeline stage individually and shows exactly which stage fails. " +
      "Check that all preset keys in the page's presets array resolve to files under content/presets/. " +
      "Use probe_preset_usage to verify preset keys exist across the project.",
    relatedTools: ["doctor_page", "probe_preset_usage", "validate_page"],
  },

  PB_VALIDATION_ERROR: {
    explanation:
      "The page JSON failed schema validation (Zod safeParse against peblorSchema). " +
      "This is a structural error — a required field is missing, a field has the wrong type, " +
      "or a discriminated union type is unrecognised.",
    likelyCauses: [
      "A required field is missing from a section or element definition.",
      "A field value has the wrong type (e.g. a number where a string is expected).",
      "An element type string is not recognised by the discriminated union schema.",
      "A section type string is not registered.",
    ],
    suggestedFix:
      "Check the `path` field in the diagnostic — it points to the JSON location of the error. " +
      "Use get_element_schema or explain_element_type to verify the required fields for that element type. " +
      "Use validate_element or validate_section on the offending fragment to get field-level errors.",
    relatedTools: [
      "get_element_schema",
      "explain_element_type",
      "validate_element",
      "validate_section",
      "doctor_page",
    ],
  },

  PB_UNKNOWN_ERROR: {
    explanation:
      "An unexpected error occurred during validation or pipeline execution — the error shape " +
      "did not match any known pattern. This is often caused by a preset resolution failure " +
      "that produces a null value where an object is expected.",
    likelyCauses: [
      "A preset reference resolves to null or undefined.",
      "Circular preset references (A → B → A).",
      "A JSON parse error in a preset file or module file.",
      "An unexpected runtime exception in the expansion pipeline.",
    ],
    suggestedFix:
      "Run doctor_page with --stage load to check if the preset files load correctly. " +
      "Check the referenced preset files for JSON syntax errors. " +
      "Look for circular references by searching for the preset key in all preset files.",
    relatedTools: ["doctor_page", "probe_preset_usage"],
  },

  PB_FRAGMENT_UNKNOWN: {
    explanation:
      "The fragment kind could not be inferred from the JSON. Either the `type` field is missing, " +
      "or the type string is not recognised as a section, element, action, background, or module.",
    likelyCauses: [
      "The fragment is missing a `type` field.",
      "The type string is misspelled.",
      "The fragment is a partial/incomplete definition.",
      "You are validating a preset file wrapper (outer object has no type, inner does).",
    ],
    suggestedFix:
      "Use validate_fragment which auto-infers the schema. " +
      "For preset wrappers ({ 'preset-key': { type: '…' } }), the inner object needs the type. " +
      "Use list_element_types, list_section_types to verify the correct type string.",
    relatedTools: ["validate_fragment", "list_element_types", "list_section_types"],
  },

  PB_FILE_ERROR: {
    explanation:
      "The file could not be read — it does not exist, is not valid JSON, or is not accessible.",
    likelyCauses: [
      "The file path is wrong or the file has been moved.",
      "The file contains a JSON syntax error.",
      "A sidecar section file is referenced in sectionOrder but does not exist.",
    ],
    suggestedFix:
      "Verify the file path. Use read_page with the route to confirm the page exists. " +
      "For JSON errors, open the file and check for trailing commas, missing quotes, or mismatched braces.",
    relatedTools: ["read_page", "list_pages"],
  },

  PB_ACTION_INVALID: {
    explanation: "A trigger action object failed schema validation.",
    likelyCauses: [
      "An action type string is not in the registered action union.",
      "A required payload field is missing for the given action type.",
      "The payload type does not match what the action schema expects.",
    ],
    suggestedFix:
      "Use explain_action_type to see the payload schema for the specific action. " +
      "Use validate_action to check the action JSON directly.",
    relatedTools: ["explain_action_type", "validate_action", "list_action_types"],
  },
};

const FALLBACK: DiagnosticKnowledge = {
  explanation: "No specific explanation is available for this diagnostic code.",
  likelyCauses: ["Unknown — check the message and path fields for context."],
  suggestedFix:
    "Run doctor_page on the affected page to isolate which pipeline stage fails. " +
    "Check the path field to find the JSON location of the problem.",
  relatedTools: ["doctor_page", "validate_page"],
};

// ── tool ─────────────────────────────────────────────────────────────────────

export const explainDiagnostic: Tool = {
  def: {
    name: "explain_diagnostic",
    description:
      "Turn a peblor diagnostic error code into plain-English explanation, likely causes, and a suggested fix. " +
      "Pass pageRoute to also run doctor_page for richer pipeline-stage context.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "The diagnostic code (e.g. 'PB_STRICT_LOAD_FAILED', 'PB_VALIDATION_ERROR', 'PB_UNKNOWN_ERROR')",
        },
        message: {
          type: "string",
          description: "The diagnostic message string (optional but improves context)",
        },
        path: {
          type: "string",
          description: "The JSON path from the diagnostic (optional, e.g. '$.definitions.hero')",
        },
        pageRoute: {
          type: "string",
          description:
            "If provided, also runs doctor_page to give pipeline-stage context (e.g. '/presets/cards-basic')",
        },
      },
      required: ["code"],
    },
  },

  run: async (args) => {
    const { code, message, path, pageRoute } = args as {
      code: string;
      message?: string;
      path?: string;
      pageRoute?: string;
    };

    const knowledge = DIAGNOSTIC_MAP[code] ?? FALLBACK;

    const base = {
      code,
      ...(message && { message }),
      ...(path && { path }),
      explanation: knowledge.explanation,
      likelyCauses: knowledge.likelyCauses,
      suggestedFix: knowledge.suggestedFix,
      relatedTools: knowledge.relatedTools,
    };

    if (!pageRoute) return base;

    // Enrich with doctor_page output
    let doctorResult: unknown = null;
    try {
      const { path: filePath } = await findPage(pageRoute);
      const segments = filePathToSlugSegments(filePath);
      if (segments) {
        doctorResult = await runCli(["doctor", filePath]);
      }
    } catch (err) {
      console.warn("[pb-mcp] Failed to run doctor enrichment", pageRoute, err);
    }

    return {
      ...base,
      doctorPage: doctorResult,
    };
  },
};
