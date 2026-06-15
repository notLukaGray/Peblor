import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import {
  elementBodySchema,
  elementButtonSchema,
  elementDividerSchema,
  elementHeadingSchema,
  elementImageSchema,
  elementLinkSchema,
  elementRangeSchema,
  elementInputSchema,
  elementRichTextSchema,
  elementSVGSchema,
  elementSpacerSchema,
  elementScrollProgressBarSchema,
  elementVectorSchema,
  elementVideoSchema,
  elementVideoTimeSchema,
  elementVideoQualitySelectSchema,
} from "./element-content-schemas";
import { elementModel3DSchema } from "./element-model3d-schemas";
import { elementRiveSchema } from "./element-rive-schemas";
import { elementFormFieldSchema } from "./element-form-field-schemas";
import { elementAudioSchema } from "./element-audio-schemas";
import { elementCounterSchema } from "./element-counter-schemas";
import { elementMarqueeSchema } from "./element-marquee-schemas";
import { elementImageCompareSchema } from "./element-image-compare-schemas";
import { elementTabsSchema } from "./element-tabs-schemas";
import { elementTooltipSchema } from "./element-tooltip-schemas";
import { elementLottieSchema } from "./element-lottie-schemas";
import { elementDragSchema } from "./element-drag-schemas";
import { elementEmbedSchema } from "./element-embed-schemas";
import { elementListSchema } from "./element-list-schemas";
import { elementBlockquoteSchema } from "./element-blockquote-schemas";
import { elementTableSchema } from "./element-table-schemas";
import { elementCodeSchema } from "./element-code-schemas";
import { sectionEffectSchema } from "./section-effect-schemas";
import {
  cssInlineStyleSchema,
  jsonNullishOptional,
  jsonValueSchema,
  responsiveStringSchema,
  themeStringSchema,
} from "./schema-primitives";
import { reorderablePropsSchema } from "./schema-shared-primitives";
// Shared lazy element reference — populated after elementBlockSchema is defined below.
// Imported by leaf element schemas (tabs, drag, image-compare) that cannot import
// from this file directly due to the circular dependency (B-4 / C-15).
import { lazyElementBlock, registerElementSchema } from "./lazy-element-ref";
export { lazyElementBlock };
const responsiveTierNumberSchema = z
  .strictObject({
    base: z.number().optional(),
    sm: z.number().optional(),
    md: z.number().optional(),
    lg: z.number().optional(),
    xl: z.number().optional(),
    "2xl": z.number().optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: "Responsive tier map must define at least one tier (base/sm/md/lg/xl/2xl).",
  });
const responsiveNumberSchema = z.union([z.number(), responsiveTierNumberSchema]).optional();
const responsiveElementOrderSchema = z.union([
  z.array(z.string()),
  z
    .strictObject({
      base: z.array(z.string()).optional(),
      sm: z.array(z.string()).optional(),
      md: z.array(z.string()).optional(),
      lg: z.array(z.string()).optional(),
      xl: z.array(z.string()).optional(),
      "2xl": z.array(z.string()).optional(),
    })
    .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
      message: "Responsive tier map must define at least one tier (base/sm/md/lg/xl/2xl).",
    }),
]);

/**
 * Preset reference with per-key override fields.
 * Uses catchall for forward-compatible override keys (C-21).
 */
export const presetReferenceSchema = z.object({ preset: z.string() }).catchall(z.unknown());

const lazyDefinitionBlock = z.union([presetReferenceSchema, lazyElementBlock]);

const nestedElementSectionSchema = z.object({
  elementOrder: jsonNullishOptional(responsiveElementOrderSchema),
  definitions: z.record(z.string(), lazyDefinitionBlock).optional(),
});

const elementGroupSchema = z
  .object({
    type: z.literal("elementGroup"),
    section: nestedElementSectionSchema.optional(),
    disclosure: z
      .object({
        mode: z.enum(["tap", "hover", "tapOrHover"]).optional(),
        anchor: z.enum(["left", "center", "right"]).optional(),
        collapsedWidth: z.union([z.string(), z.number()]).optional(),
        expandedWidth: z.union([z.string(), z.number()]).optional(),
        collapsedHeight: z.union([z.string(), z.number()]).optional(),
        expandedHeight: z.union([z.string(), z.number()]).optional(),
        durationMs: z.number().min(0).max(5000).optional(),
        closeDelayMs: z.number().min(0).max(10000).optional(),
        initiallyOpen: z.boolean().optional(),
        storageKey: z.string().optional(),
        panelKeys: z.array(z.string()).optional(),
        triggerKeys: z.array(z.string()).optional(),
        collapsedStyle: cssInlineStyleSchema.optional(),
        expandedStyle: cssInlineStyleSchema.optional(),
      })
      .optional(),
    /** When set, the element's scrollTop is persisted to localStorage under this key
     *  and restored on mount — useful for navigation sidebars that stay open across pages. */
    scrollStorageKey: z.string().optional(),
    display: responsiveStringSchema.optional(),
    flow: responsiveStringSchema.optional(),
    align: responsiveStringSchema.optional(),
    distribute: responsiveStringSchema.optional(),
    /** Spacing between items; theme fallback when unset — `pbContentGuidelines.frameGapWhenUnset`. */
    gap: responsiveStringSchema.optional(),
    wrap: z.enum(["nowrap", "wrap", "wrap-reverse"]).optional(),
    /** Theme fallback when unset — `pbContentGuidelines.frameRowGapWhenUnset`. */
    rowGap: z.union([z.string(), z.number()]).optional(),
    padding: responsiveStringSchema.optional(),
    /** Per-side padding. Overrides the shorthand `padding` field if set. */
    paddingTop: z.union([z.string(), z.number()]).optional(),
    /** Per-side padding. Overrides the shorthand `padding` field if set. */
    paddingRight: z.union([z.string(), z.number()]).optional(),
    /** Per-side padding. Overrides the shorthand `padding` field if set. */
    paddingBottom: z.union([z.string(), z.number()]).optional(),
    /** Per-side padding. Overrides the shorthand `padding` field if set. */
    paddingLeft: z.union([z.string(), z.number()]).optional(),
    flex: responsiveStringSchema.optional(),
    columnCount: z.number().int().positive().optional(),
    /** Theme fallback when unset — `pbContentGuidelines.frameColumnGapWhenUnset`. */
    columnGap: z.union([z.string(), z.number()]).optional(),
    effects: z.array(sectionEffectSchema).optional(),
    glassLayer: z.enum(["background", "foreground"]).optional(),
  })
  .merge(reorderablePropsSchema)
  .merge(elementLayoutSchema);

const elementInfiniteScrollSchema = z
  .object({
    type: z.literal("elementInfiniteScroll"),
    section: nestedElementSectionSchema,
    scrollDirection: z.enum(["horizontal", "vertical"]).optional(),
    loop: z.boolean().optional(),
    initialIndex: z.number().int().optional(),
    selectedIndexVariable: z.string().optional(),
    selectedIdVariable: z.string().optional(),
    selectedValueVariable: z.string().optional(),
    selectedValues: z.record(z.string(), jsonValueSchema).optional(),
    snapAlign: z.enum(["start", "center", "end"]).optional(),
    centerOnClick: z.boolean().optional(),
    wheelLockMs: z.number().nonnegative().optional(),
    snapDurationMs: z.number().nonnegative().optional(),
    activeScale: responsiveNumberSchema,
    inactiveScale: responsiveNumberSchema,
    activeOpacity: responsiveNumberSchema,
    inactiveOpacity: responsiveNumberSchema,
    activeItemStyle: cssInlineStyleSchema.optional(),
    inactiveItemStyle: cssInlineStyleSchema.optional(),
    align: responsiveStringSchema.optional(),
    distribute: responsiveStringSchema.optional(),
    gap: responsiveStringSchema.optional(),
    rowGap: z.union([z.string(), z.number()]).optional(),
    columnGap: z.union([z.string(), z.number()]).optional(),
    padding: responsiveStringSchema.optional(),
    paddingTop: z.union([z.string(), z.number()]).optional(),
    paddingRight: z.union([z.string(), z.number()]).optional(),
    paddingBottom: z.union([z.string(), z.number()]).optional(),
    paddingLeft: z.union([z.string(), z.number()]).optional(),
    effects: z.array(sectionEffectSchema).optional(),
    /** Accessible label for the carousel listbox (P0.1 follow-up — read from rest in component). */
    ariaLabel: z.string().optional(),
    /** CSS display value for the carousel track container (e.g. "flex"). */
    display: responsiveStringSchema.optional(),
    /** CSS flex-direction for the carousel track (e.g. "column"). */
    flow: responsiveStringSchema.optional(),
    /** Minimum height constraint passed directly to getElementLayoutStyle. */
    minHeight: jsonNullishOptional(responsiveStringSchema),
    /** Minimum width constraint passed directly to getElementLayoutStyle. */
    minWidth: jsonNullishOptional(responsiveStringSchema),
    /** Maximum height constraint passed directly to getElementLayoutStyle. */
    maxHeight: jsonNullishOptional(responsiveStringSchema),
    /** Maximum width constraint passed directly to getElementLayoutStyle. */
    maxWidth: jsonNullishOptional(responsiveStringSchema),
  })
  .merge(elementLayoutSchema);

export const elementBlockSchema = z.discriminatedUnion("type", [
  elementHeadingSchema,
  elementBodySchema,
  elementLinkSchema,
  elementImageSchema,
  elementVideoSchema,
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
  elementButtonSchema,
  elementModel3DSchema,
  elementRiveSchema,
  elementGroupSchema,
  elementInfiniteScrollSchema,
  elementFormFieldSchema,
  elementAudioSchema,
  elementCounterSchema,
  elementMarqueeSchema,
  elementImageCompareSchema,
  elementTabsSchema,
  elementTooltipSchema,
  elementLottieSchema,
  elementDragSchema,
  elementEmbedSchema,
  elementListSchema,
  elementBlockquoteSchema,
  elementTableSchema,
  elementCodeSchema,
]);

/** Element types whose schema includes a `section` field with nested elementOrder + definitions. */
export const NESTED_SECTION_ELEMENT_TYPES = ["elementGroup", "elementInfiniteScroll"] as const;

// Populate the shared lazy ref so leaf schemas (tabs, drag, image-compare) can validate
// nested element types fully at parse time without a circular static import (B-4).
registerElementSchema(elementBlockSchema);

export const cssGradientDefinitionSchema = z.object({
  type: z.literal("cssGradient"),
  value: themeStringSchema,
});

export const sectionDefinitionBlockSchema = z.union([
  presetReferenceSchema,
  elementBlockSchema,
  cssGradientDefinitionSchema,
]);

export { figmaExporterMetaSchema, peblorMetaSchema } from "./figma-exporter-meta-schema";
export type { FigmaExporterMeta, PeblorMeta } from "./figma-exporter-meta-schema";
