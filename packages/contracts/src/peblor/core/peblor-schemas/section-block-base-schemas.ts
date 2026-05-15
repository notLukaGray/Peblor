import { z } from "zod";
import { REVEAL_PRESET_NAMES } from "../peblor-motion-defaults";
import { elementBlockSchema } from "./element-block-schemas";
import { formFieldBlockSchema } from "./form-field-schemas";
import { motionPropsSchema, motionTimingSchema } from "./motion-props-schema";
import {
  columnAssignmentsRequiredSchema,
  columnCountSchema,
  columnGapsSchema,
  columnSpanMapSchema,
  columnStylesSchema,
  columnWidthsSchema,
  cssWidthOrFunctionSchema,
  elementOrderSchema,
  itemLayoutSchema,
  itemStylesSchema,
  responsiveColumnSpanSchema,
  responsiveGridModeSchema,
} from "./section-style-and-column-schemas";
import {
  jsonNullishOptional,
  jsonValueSchema,
  responsiveBooleanSchema,
  responsiveSectionAlignSchema,
  responsiveStringSchema,
  responsiveThemeStringSchema,
  triggerActionSchema,
} from "./schema-primitives";
import {
  dividerLayerSchema,
  sectionBorderSchema,
  sectionEffectSchema,
} from "./section-style-and-column-schemas";
import { peblorMetaSchema } from "./figma-exporter-meta-schema";
import { analyticsConfigSchema } from "../../../analytics/schemas";

const scrollOpacityRangeSchema = z
  .object({
    input: z.tuple([z.number(), z.number()]).optional(),
    output: z.tuple([z.number(), z.number()]).optional(),
  })
  .optional();

const sectionContentSizeSchema = z.union([z.enum(["full", "hug"]), cssWidthOrFunctionSchema]);
const responsiveSectionContentSizeSchema = z.union([
  sectionContentSizeSchema,
  z.tuple([sectionContentSizeSchema, sectionContentSizeSchema]),
]);

const SECTION_CURSOR_VALUES = [
  "pointer",
  "default",
  "grab",
  "grabbing",
  "crosshair",
  "zoom-in",
  "zoom-out",
  "text",
  "move",
  "not-allowed",
  "auto",
  "none",
] as const;

/** Invalid cursor values fail validation (SCHEMA-3). `null` is coerced to omitted (SCHEMA-2). */
const sectionCursorSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.enum(SECTION_CURSOR_VALUES).optional()
);

const revealPresetSchema = z.preprocess(
  (value) =>
    typeof value === "string" && !(REVEAL_PRESET_NAMES as readonly string[]).includes(value)
      ? undefined
      : value,
  z.enum(REVEAL_PRESET_NAMES).optional()
);

export const baseSectionPropsSchema = z.object({
  id: jsonNullishOptional(z.string()),
  /** Namespaced metadata (`meta.figma`, etc.); passthrough preserves extension keys. */
  meta: jsonNullishOptional(peblorMetaSchema),

  /** Analytics config scoped to this section. */
  analytics: analyticsConfigSchema,

  ariaLabel: jsonNullishOptional(responsiveStringSchema),
  fill: jsonNullishOptional(responsiveThemeStringSchema),
  layers: jsonNullishOptional(z.array(dividerLayerSchema)),
  effects: jsonNullishOptional(z.array(sectionEffectSchema)),
  width: jsonNullishOptional(responsiveStringSchema),
  height: jsonNullishOptional(responsiveStringSchema),
  minWidth: jsonNullishOptional(responsiveStringSchema),
  maxWidth: jsonNullishOptional(responsiveStringSchema),
  minHeight: jsonNullishOptional(responsiveStringSchema),
  maxHeight: jsonNullishOptional(responsiveStringSchema),
  align: jsonNullishOptional(responsiveSectionAlignSchema),
  marginLeft: jsonNullishOptional(responsiveStringSchema),
  marginRight: jsonNullishOptional(responsiveStringSchema),
  marginTop: jsonNullishOptional(responsiveStringSchema),
  marginBottom: jsonNullishOptional(responsiveStringSchema),
  borderRadius: jsonNullishOptional(responsiveStringSchema),
  border: jsonNullishOptional(sectionBorderSchema),

  boxShadow: jsonNullishOptional(z.string()),

  filter: jsonNullishOptional(z.string()),

  backdropFilter: jsonNullishOptional(z.string()),
  clipPath: jsonNullishOptional(z.string()),
  overflow: jsonNullishOptional(z.enum(["hidden", "visible", "auto", "scroll"])),
  borderTop: jsonNullishOptional(z.string()),
  borderRight: jsonNullishOptional(z.string()),
  borderBottom: jsonNullishOptional(z.string()),
  borderLeft: jsonNullishOptional(z.string()),
  cursor: sectionCursorSchema,
  aspectRatio: jsonNullishOptional(responsiveStringSchema),
  scrollSpeed: jsonNullishOptional(z.number()),
  initialX: jsonNullishOptional(responsiveStringSchema),
  initialY: jsonNullishOptional(responsiveStringSchema),
  zIndex: jsonNullishOptional(z.number()),
  onVisible: jsonNullishOptional(triggerActionSchema),
  onInvisible: jsonNullishOptional(triggerActionSchema),
  onProgress: jsonNullishOptional(triggerActionSchema),
  onViewportProgress: jsonNullishOptional(triggerActionSchema),
  threshold: jsonNullishOptional(z.number()),
  triggerOnce: jsonNullishOptional(z.boolean()),
  rootMargin: jsonNullishOptional(z.string()),
  delay: jsonNullishOptional(z.number()),

  motion: motionPropsSchema,

  reduceMotion: jsonNullishOptional(z.boolean()),

  motionTiming: jsonNullishOptional(motionTimingSchema),

  scrollOpacityRange: scrollOpacityRangeSchema,
  sticky: jsonNullishOptional(z.boolean()),
  stickyOffset: jsonNullishOptional(responsiveStringSchema),
  stickyPosition: jsonNullishOptional(z.enum(["top", "bottom"])),
  fixed: jsonNullishOptional(z.boolean()),
  fixedPosition: jsonNullishOptional(z.enum(["top", "bottom", "left", "right"])),
  fixedOffset: jsonNullishOptional(responsiveStringSchema),
  // Keyboard triggers for this section (active while section is mounted)
  keyboardTriggers: z
    .array(
      z.object({
        key: z.string(),
        shift: z.boolean().optional(),
        ctrl: z.boolean().optional(),
        alt: z.boolean().optional(),
        meta: z.boolean().optional(),
        onKeyDown: triggerActionSchema.optional(),
        onKeyUp: triggerActionSchema.optional(),
        preventDefault: z.boolean().optional(),
      })
    )
    .optional(),
  // Timer triggers — delays and intervals
  timerTriggers: z
    .array(
      z.object({
        delay: z.number().optional(),
        interval: z.number().optional(),
        maxFires: z.number().optional(),
        action: triggerActionSchema,
      })
    )
    .optional(),
  // Cursor position as progress trigger
  cursorTriggers: z
    .array(
      z.object({
        axis: z.enum(["x", "y"]),
        action: triggerActionSchema,
        throttleMs: z.number().optional(),
      })
    )
    .optional(),
  // Scroll direction triggers — fire actions when user scrolls up or down
  scrollDirectionTriggers: z
    .array(
      z.object({
        onScrollDown: triggerActionSchema.optional(),
        onScrollUp: triggerActionSchema.optional(),

        threshold: z.number().optional(),
      })
    )
    .optional(),
  // Idle/active triggers — fire actions after a period of user inactivity
  idleTriggers: z
    .array(
      z.object({
        idleAfterMs: z.number().optional(),
        onIdle: triggerActionSchema.optional(),
        onActive: triggerActionSchema.optional(),
      })
    )
    .optional(),

  visibleWhen: z
    .object({
      variable: z.string().optional(),
      operator: z
        .enum(["equals", "notEquals", "gt", "gte", "lt", "lte", "contains", "startsWith"])
        .optional(),
      value: jsonValueSchema.optional(),
      conditions: z
        .array(
          z.object({
            variable: z.string(),
            operator: z.enum([
              "equals",
              "notEquals",
              "gt",
              "gte",
              "lt",
              "lte",
              "contains",
              "startsWith",
            ]),
            value: jsonValueSchema,
          })
        )
        .optional(),
      logic: z.enum(["and", "or"]).optional(),
    })
    .optional(),
});

export const sectionDividerSchema = baseSectionPropsSchema.extend({
  type: z.literal("divider"),
});

export const sectionContentBlockSchema = baseSectionPropsSchema.extend({
  type: z.literal("contentBlock"),
  elements: z.array(elementBlockSchema),
  flexDirection: z
    .union([
      z.enum(["row", "column", "row-reverse", "column-reverse"]),
      z.tuple([
        z.enum(["row", "column", "row-reverse", "column-reverse"]),
        z.enum(["row", "column", "row-reverse", "column-reverse"]),
      ]),
    ])
    .optional(),
  alignItems: jsonNullishOptional(responsiveStringSchema),
  justifyContent: jsonNullishOptional(responsiveStringSchema),
  flexWrap: z
    .union([
      z.enum(["nowrap", "wrap", "wrap-reverse"]),
      z.tuple([
        z.enum(["nowrap", "wrap", "wrap-reverse"]),
        z.enum(["nowrap", "wrap", "wrap-reverse"]),
      ]),
    ])
    .optional(),
  gap: jsonNullishOptional(responsiveStringSchema),
  rowGap: jsonNullishOptional(responsiveStringSchema),
  columnGap: jsonNullishOptional(responsiveStringSchema),

  reorderable: jsonNullishOptional(z.boolean()),

  reorderAxis: jsonNullishOptional(z.enum(["x", "y"])),

  reorderDragUnit: jsonNullishOptional(z.enum(["frame", "content"])),

  reorderDragBehavior: jsonNullishOptional(z.enum(["elasticSnap", "free", "none"])),
  contentWidth: jsonNullishOptional(responsiveSectionContentSizeSchema),
  contentHeight: jsonNullishOptional(responsiveSectionContentSizeSchema),
});

const scrollProgressTriggerSchema = z
  .object({
    id: z.string(),
    invert: z.boolean().optional(),

    input: z.tuple([z.number(), z.number()]).optional(),
  })
  .optional();

export const sectionScrollContainerSchema = baseSectionPropsSchema.extend({
  type: z.literal("scrollContainer"),
  elements: z.array(elementBlockSchema),
  scrollDirection: jsonNullishOptional(z.enum(["horizontal", "vertical", "both"])),

  scrollProgressTrigger: scrollProgressTriggerSchema,

  scrollProgressTriggerId: jsonNullishOptional(z.string()),
});

export const sectionColumnBaseSchema = baseSectionPropsSchema.extend({
  type: z.literal("sectionColumn"),
  elements: z.array(elementBlockSchema),
  columns: columnCountSchema,
  columnAssignments: columnAssignmentsRequiredSchema,
  columnWidths: columnWidthsSchema,
  columnGaps: columnGapsSchema,
  columnStyles: columnStylesSchema,
  itemStyles: itemStylesSchema,
  gridMode: responsiveGridModeSchema,
  gridDebug: responsiveBooleanSchema,
  gridAutoRows: jsonNullishOptional(responsiveStringSchema),
  elementOrder: elementOrderSchema,
  columnSpan: z.union([columnSpanMapSchema, responsiveColumnSpanSchema]).optional(),
  itemLayout: itemLayoutSchema,
  contentWidth: jsonNullishOptional(responsiveSectionContentSizeSchema),
  contentHeight: jsonNullishOptional(responsiveSectionContentSizeSchema),
});

export const sectionTriggerSchema = baseSectionPropsSchema.extend({
  type: z.literal("sectionTrigger"),
  id: jsonNullishOptional(z.string()),
  onVisible: jsonNullishOptional(triggerActionSchema),
  onInvisible: jsonNullishOptional(triggerActionSchema),
  onProgress: jsonNullishOptional(triggerActionSchema),
  threshold: jsonNullishOptional(z.number()),
  triggerOnce: jsonNullishOptional(z.boolean()),
  rootMargin: jsonNullishOptional(z.string()),
  delay: jsonNullishOptional(z.number()),
});

export const formHandlerKeySchema = z.enum([
  "unlock",
  "contact",
  "newsletter",
  "waitlist",
  "event-registration",
  "feedback",
  "job-inquiry",
  "quote-request",
  "application",
  "rsvp",
  "unsubscribe",
]);

export const sectionFormBlockSchema = baseSectionPropsSchema.extend({
  type: z.literal("formBlock"),
  fields: z.array(formFieldBlockSchema),

  action: jsonNullishOptional(formHandlerKeySchema),
  method: jsonNullishOptional(z.enum(["post"])),

  actionPayload: jsonNullishOptional(
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  ),
  contentWidth: jsonNullishOptional(responsiveSectionContentSizeSchema),
  contentHeight: jsonNullishOptional(responsiveSectionContentSizeSchema),
});

const revealTriggerModeSchema = z.enum(["hover", "click", "button", "external", "combined"]);
const revealExternalTriggerModeSchema = z.enum(["setTrue", "setFalse", "toggle"]);
const revealExpandAxisSchema = z.enum(["vertical", "horizontal", "both"]);

const revealSizeObjectSchema = z.object({
  height: jsonNullishOptional(z.string()),
  width: jsonNullishOptional(z.string()),
});

export const sectionRevealSchema = baseSectionPropsSchema.extend({
  type: z.literal("revealSection"),

  triggerMode: jsonNullishOptional(revealTriggerModeSchema),

  initialRevealed: jsonNullishOptional(z.boolean()),

  revealOnHover: jsonNullishOptional(z.boolean()),

  revealOnClick: jsonNullishOptional(z.boolean()),

  toggleOnClick: jsonNullishOptional(z.boolean()),

  externalTriggerKey: jsonNullishOptional(z.string()),

  externalTriggerMode: jsonNullishOptional(revealExternalTriggerModeSchema),

  expandAxis: jsonNullishOptional(revealExpandAxisSchema),

  collapsedSize: jsonNullishOptional(revealSizeObjectSchema),

  expandedSize: jsonNullishOptional(revealSizeObjectSchema),

  expandDurationMs: jsonNullishOptional(z.number()),

  collapseDurationMs: jsonNullishOptional(z.number()),

  transitionEasing: jsonNullishOptional(z.string()),

  collapsedElements: jsonNullishOptional(z.array(elementBlockSchema)),

  revealedElements: jsonNullishOptional(z.array(elementBlockSchema)),

  revealStaggerMs: jsonNullishOptional(z.number()),

  revealDurationMs: jsonNullishOptional(z.number()),

  revealPreset: revealPresetSchema,
});
