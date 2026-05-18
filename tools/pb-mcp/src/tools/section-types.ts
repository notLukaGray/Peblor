import {
  baseSectionPropsSchema,
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionColumnBaseSchema,
  sectionRevealSchema,
  sectionDividerSchema,
  sectionFormBlockSchema,
  sectionTriggerSchema,
} from "@pb/contracts";
import type { z } from "zod";

type AnySchema = z.ZodTypeAny & {
  shape?: Record<string, AnySchema>;
  def?: { shape?: Record<string, AnySchema>; values?: unknown[] | Set<unknown> };
};

function shapeKeys(schema: z.ZodTypeAny): string[] {
  const any = schema as AnySchema;
  const shape = any.shape ?? any.def?.shape ?? {};
  return Object.keys(shape);
}

const baseKeys = new Set(shapeKeys(baseSectionPropsSchema));

const rows: Array<{ type: string; schema: z.ZodTypeAny; structure: string }> = [
  { type: "contentBlock", schema: sectionContentBlockSchema, structure: "elements" },
  { type: "scrollContainer", schema: sectionScrollContainerSchema, structure: "elements" },
  {
    type: "sectionColumn",
    schema: sectionColumnBaseSchema,
    structure: "elements + elementOrder + columnAssignments",
  },
  {
    type: "revealSection",
    schema: sectionRevealSchema,
    structure: "collapsedElements/revealedElements",
  },
  { type: "divider", schema: sectionDividerSchema, structure: "no elements" },
  { type: "formBlock", schema: sectionFormBlockSchema, structure: "fields" },
  { type: "sectionTrigger", schema: sectionTriggerSchema, structure: "trigger-only" },
];

export type SectionTypeSummary = {
  type: string;
  rootFields: string[];
  restrictions: string[];
  structure: string;
};

export function listSectionTypeSummaries(): SectionTypeSummary[] {
  return rows
    .map((row) => {
      const unique = shapeKeys(row.schema)
        .filter((key) => key !== "type" && !baseKeys.has(key))
        .sort((a, b) => a.localeCompare(b));
      return {
        type: row.type,
        rootFields: unique,
        restrictions: [
          "bgKey is page index only and invalid in standalone section files",
          "sectionOrder is a page index field, not a section root field",
        ],
        structure: row.structure,
      };
    })
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function explainSectionTypeSummary(type: string): SectionTypeSummary | null {
  return listSectionTypeSummaries().find((row) => row.type === type) ?? null;
}
