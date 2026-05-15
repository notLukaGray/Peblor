/**
 * Maps intent-file schema_ref strings to live Zod schemas from @pb/contracts.
 * Add an entry here for each new schema_ref used in an intent file.
 * The generator hard-fails if a schema_ref is not in this registry.
 */

import { z } from "zod";
import {
  elementImageSchema,
  elementVideoSchema,
  elementHeadingSchema,
  elementButtonSchema,
  elementBodySchema,
  elementLinkSchema,
  elementVectorSchema,
  elementSVGSchema,
  elementRichTextSchema,
  elementRangeSchema,
  elementInputSchema,
  elementVideoTimeSchema,
  elementVideoQualitySelectSchema,
  elementSpacerSchema,
  elementDividerSchema,
  elementScrollProgressBarSchema,
  elementModel3DSchema,
  elementRiveSchema,
  elementFormFieldSchema,
  elementAudioSchema,
  elementCounterSchema,
  elementMarqueeSchema,
  elementImageCompareSchema,
  elementTabsSchema,
  elementTooltipSchema,
  elementLottieSchema,
  elementBlockSchema,
  sectionColumnBaseSchema,
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionDividerSchema,
  sectionTriggerSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
  baseSectionPropsSchema,
  motionPropsSchema,
  motionTimingSchema,
  bgBlockSchema,
  moduleBlockSchema,
  modalBuilderSchema,
} from "@pb/contracts";

type AnySchema = z.ZodType & {
  def?: { type?: string; values?: unknown[] | Set<unknown>; shape?: Record<string, AnySchema> };
  options?: AnySchema[];
  shape?: Record<string, AnySchema>;
};

/**
 * Extracts a single member from a ZodDiscriminatedUnion by its `type` literal value.
 * In Zod 4, literal values are stored as arrays in def.values (not Sets).
 */
function extractDUMember(du: z.ZodType, typeValue: string): z.ZodType {
  const opts = (du as AnySchema).options;
  if (!opts) throw new Error(`extractDUMember: schema has no .options (not a union?)`);
  for (const opt of opts) {
    const shape = (opt as AnySchema).shape ?? (opt as AnySchema).def?.shape;
    if (!shape?.["type"]) continue;
    const typeField = shape["type"] as AnySchema;
    const vals = typeField.def?.values;
    const hasValue =
      vals instanceof Set ? vals.has(typeValue) : Array.isArray(vals) && vals.includes(typeValue);
    if (hasValue) return opt;
  }
  throw new Error(`extractDUMember: no member with type="${typeValue}" found`);
}

export const SCHEMA_REGISTRY: Record<string, z.ZodType> = {
  // Elements — directly exported
  elementImageSchema,
  elementVideoSchema,
  elementHeadingSchema,
  elementButtonSchema,
  elementBodySchema,
  elementLinkSchema,
  elementVectorSchema,
  elementSVGSchema,
  elementRichTextSchema,
  elementRangeSchema,
  elementInputSchema,
  elementVideoTimeSchema,
  elementVideoQualitySelectSchema,
  elementSpacerSchema,
  elementDividerSchema,
  elementScrollProgressBarSchema,
  elementModel3DSchema,
  elementRiveSchema,
  elementFormFieldSchema,
  elementAudioSchema,
  elementCounterSchema,
  elementMarqueeSchema,
  elementImageCompareSchema,
  elementTabsSchema,
  elementTooltipSchema,
  elementLottieSchema,
  // Elements — extracted from elementBlockSchema discriminated union (not individually exported)
  elementGroupSchema: extractDUMember(elementBlockSchema, "elementGroup"),
  elementInfiniteScrollSchema: extractDUMember(elementBlockSchema, "elementInfiniteScroll"),
  // Sections — directly exported
  sectionColumnBaseSchema,
  sectionContentBlockSchema,
  sectionScrollContainerSchema,
  sectionDividerSchema,
  sectionTriggerSchema,
  sectionFormBlockSchema,
  sectionRevealSchema,
  // Backgrounds — extracted from bgBlockSchema discriminated union
  backgroundVideoSchema: extractDUMember(bgBlockSchema, "backgroundVideo"),
  backgroundImageSchema: extractDUMember(bgBlockSchema, "backgroundImage"),
  backgroundVariableSchema: extractDUMember(bgBlockSchema, "backgroundVariable"),
  backgroundPatternSchema: extractDUMember(bgBlockSchema, "backgroundPattern"),
  backgroundTransitionSchema: extractDUMember(bgBlockSchema, "backgroundTransition"),
  // Module and Modal — directly exported
  moduleBlockSchema,
  modalBuilderSchema,
  // Motion props — referenced by motion gesture entries
  motionPropsSchema,
  // Motion timing — referenced by motion trigger/exit entries
  motionTimingSchema,
  // Base section props — referenced by section capability entries
  baseSectionPropsSchema,
};
