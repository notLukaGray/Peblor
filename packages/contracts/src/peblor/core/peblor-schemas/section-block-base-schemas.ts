import { z } from "zod";
import { REVEAL_PRESET_NAMES } from "../peblor-motion-defaults";
import { responsiveValueSchema } from "./responsive-value-schemas";
import { elementBlockSchema, presetReferenceSchema } from "./element-block-schemas";
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
  conditionOperatorSchema,
  cssInlineStyleSchema,
  cursorSchema,
  jsonNullishOptional,
  reorderablePropsSchema,
  jsonValueSchema,
  responsiveBooleanSchema,
  responsiveSectionAlignSchema,
  responsiveStringSchema,
  responsiveThemeStringSchema,
  triggerActionSchemaCore,
  visibleWhenSchema,
} from "./schema-primitives";
import {
  dividerLayerSchema,
  sectionBorderSchema,
  sectionEffectSchema,
} from "./section-style-and-column-schemas";
import { spacingSchema, overflowClipSchema } from "./layout-sub-schemas";
import { peblorMetaSchema } from "./figma-exporter-meta-schema";
import { analyticsConfigSchema } from "../../../analytics/schemas";

const scrollOpacityRangeSchema = z
  .object({
    input: z.tuple([z.number(), z.number()]).optional(),
    output: z.tuple([z.number(), z.number()]).optional(),
  })
  .optional();

export const sectionContentSizeSchema = z.union([
  z.enum(["full", "hug"]),
  cssWidthOrFunctionSchema,
]);
export const responsiveSectionContentSizeSchema = responsiveValueSchema(sectionContentSizeSchema);

/**
 * Reveal preset name — must be a known entrance preset. Unknown strings cause a
 * schema validation error (C-09). Use jsonNullishOptional so null is treated as
 * absent (CMS-friendly).
 */
const revealPresetSchema = jsonNullishOptional(z.enum(REVEAL_PRESET_NAMES));

const customEventTriggerItemSchema = z.object({
  name: z.string(),
  action: triggerActionSchemaCore,
});
export type CustomEventTriggerDef = z.infer<typeof customEventTriggerItemSchema>;

const elementEventTriggerItemSchema = z.object({
  id: z.string(),
  onClick: triggerActionSchemaCore.optional(),
  onHoverEnter: triggerActionSchemaCore.optional(),
  onHoverLeave: triggerActionSchemaCore.optional(),
  onFocus: triggerActionSchemaCore.optional(),
  onBlur: triggerActionSchemaCore.optional(),
  onChange: triggerActionSchemaCore.optional(),
});
export type ElementEventTriggerDef = z.infer<typeof elementEventTriggerItemSchema>;

const scrollThresholdTriggerItemSchema = z.object({
  threshold: z.union([z.number(), z.string()]),
  onCrossDown: triggerActionSchemaCore.optional(),
  onCrossUp: triggerActionSchemaCore.optional(),
});
export type ScrollThresholdTriggerDef = z.infer<typeof scrollThresholdTriggerItemSchema>;

const mediaProgressTriggerItemSchema = z.object({
  id: z.string(),
  at: z.number().min(0).max(1),
  onReach: triggerActionSchemaCore,
  once: z.boolean().optional(),
});
export type MediaProgressTriggerDef = z.infer<typeof mediaProgressTriggerItemSchema>;

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
  selfAlign: jsonNullishOptional(responsiveSectionAlignSchema),
  // Spacing — shared with elements via layout-sub-schemas.ts
  ...spacingSchema.shape,
  sectionGap: jsonNullishOptional(responsiveStringSchema),
  wrapperStyle: jsonNullishOptional(cssInlineStyleSchema),
  borderRadius: jsonNullishOptional(responsiveStringSchema),
  border: jsonNullishOptional(sectionBorderSchema),

  boxShadow: jsonNullishOptional(z.string()),

  filter: jsonNullishOptional(z.string()),

  bgBlur: jsonNullishOptional(z.string()),
  // Overflow/clip — shared with elements via layout-sub-schemas.ts
  ...overflowClipSchema.shape,
  /** Responsive: accepts a plain string or [mobile, desktop] tuple — same as elements (index 0 = mobile, index 1 = desktop). */
  borderTop: jsonNullishOptional(responsiveStringSchema),
  /** Responsive: accepts a plain string or [mobile, desktop] tuple. */
  borderRight: jsonNullishOptional(responsiveStringSchema),
  /** Responsive: accepts a plain string or [mobile, desktop] tuple. */
  borderBottom: jsonNullishOptional(responsiveStringSchema),
  /** Responsive: accepts a plain string or [mobile, desktop] tuple. */
  borderLeft: jsonNullishOptional(responsiveStringSchema),
  cursor: cursorSchema,
  opacity: jsonNullishOptional(z.number().min(0).max(1)),
  /** Responsive: accepts a plain string or [mobile, desktop] tuple. */
  position: jsonNullishOptional(responsiveStringSchema),
  top: jsonNullishOptional(responsiveStringSchema),
  right: jsonNullishOptional(responsiveStringSchema),
  bottom: jsonNullishOptional(responsiveStringSchema),
  left: jsonNullishOptional(responsiveStringSchema),
  inset: jsonNullishOptional(responsiveStringSchema),
  interaction: jsonNullishOptional(z.string()),
  selectable: jsonNullishOptional(z.string()),
  willChange: jsonNullishOptional(z.string()),
  aspectRatio: jsonNullishOptional(responsiveStringSchema),
  scrollSpeed: jsonNullishOptional(z.number()),
  initialX: jsonNullishOptional(responsiveStringSchema),
  initialY: jsonNullishOptional(responsiveStringSchema),
  layer: jsonNullishOptional(z.number()),
  /**
   * Override the CSS `color-scheme` for this section and its descendants.
   * - `"light"` — force light scheme (light-dark() resolves to light value, scrollbars, inputs look light)
   * - `"dark"` — force dark scheme
   * - `"normal"` — inherit the page's active scheme (default; omitting the field has the same effect)
   * Emitted as a CSS `color-scheme` inline property and a `data-color-scheme` attribute for
   * consumer selectors. ThemeString {value,light,dark} objects in descendant elements also
   * resolve against this override when rendered server-side.
   */
  colorScheme: jsonNullishOptional(z.enum(["light", "dark", "normal"])),
  onVisible: jsonNullishOptional(triggerActionSchemaCore),
  onInvisible: jsonNullishOptional(triggerActionSchemaCore),
  onProgress: jsonNullishOptional(triggerActionSchemaCore),
  onViewportProgress: jsonNullishOptional(triggerActionSchemaCore),
  threshold: jsonNullishOptional(z.number()),
  triggerOnce: jsonNullishOptional(z.boolean()),
  rootMargin: jsonNullishOptional(z.string()),
  delay: jsonNullishOptional(z.number()),

  motion: z.preprocess((v) => (v === null ? undefined : v), motionPropsSchema),

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
        onKeyDown: triggerActionSchemaCore.optional(),
        onKeyUp: triggerActionSchemaCore.optional(),
        preventDefault: z.boolean().optional(),
      })
    )
    .optional(),
  // Timer triggers — delays and intervals
  timerTriggers: z
    .array(
      z
        .object({
          id: z.string().optional(),
          delay: z.number().min(1).optional(),
          interval: z.number().min(1).optional(),
          maxFires: z.number().optional(),
          action: triggerActionSchemaCore,
        })
        .refine((item) => item.delay != null || item.interval != null, {
          message: "timerTrigger must have at least one of delay or interval",
        })
    )
    .optional(),
  // Cursor position as progress trigger
  cursorTriggers: z
    .array(
      z.object({
        axis: z.enum(["x", "y"]),
        action: triggerActionSchemaCore,
        throttleMs: z.number().optional(),
      })
    )
    .optional(),
  // Scroll direction triggers — fire actions when user scrolls up or down
  scrollDirectionTriggers: z
    .array(
      z.object({
        onScrollDown: triggerActionSchemaCore.optional(),
        onScrollUp: triggerActionSchemaCore.optional(),

        threshold: z.number().optional(),
      })
    )
    .optional(),
  // Idle/active triggers — fire actions after a period of user inactivity
  idleTriggers: z
    .array(
      z.object({
        idleAfterMs: z.number().optional(),
        onIdle: triggerActionSchemaCore.optional(),
        onActive: triggerActionSchemaCore.optional(),
      })
    )
    .optional(),
  // Variable change triggers — react when a watched variable updates
  variableTriggers: z
    .array(
      z.object({
        variable: z.string(),
        operator: conditionOperatorSchema.optional(),
        value: jsonValueSchema.optional(),
        conditions: z
          .array(
            z.object({
              variable: z.string(),
              operator: conditionOperatorSchema,
              value: jsonValueSchema,
            })
          )
          .optional(),
        logic: z.enum(["and", "or"]).optional(),
        action: triggerActionSchemaCore,
        fireOnMount: z.boolean().optional(),
      })
    )
    .optional(),
  // Tab visibility triggers — react when the browser tab is focused or hidden
  tabVisibilityTriggers: z
    .array(
      z.object({
        onFocus: triggerActionSchemaCore.optional(),
        onBlur: triggerActionSchemaCore.optional(),
      })
    )
    .optional(),
  // Media end triggers — fire actions when a media element (video/audio) finishes playing
  mediaEndTriggers: z
    .array(
      z.object({
        id: z.string(),
        onEnd: triggerActionSchemaCore,
      })
    )
    .optional(),
  // Custom event triggers — react when a named CustomEvent is dispatched via dispatchCustomEvent
  customEventTriggers: z.array(customEventTriggerItemSchema).optional(),
  // Element event triggers — react to click/hover/focus/blur/change on a DOM element by id
  elementEventTriggers: z.array(elementEventTriggerItemSchema).optional(),
  // Scroll threshold triggers — fire when the page scroll position crosses a threshold
  scrollThresholdTriggers: z.array(scrollThresholdTriggerItemSchema).optional(),
  // Media progress triggers — fire when a media element passes a playback percentage
  mediaProgressTriggers: z.array(mediaProgressTriggerItemSchema).optional(),

  visibleWhen: visibleWhenSchema,
});

export const sectionPageTriggerSchema = baseSectionPropsSchema.extend({
  type: z.literal("pageTrigger"),
  onMount: jsonNullishOptional(triggerActionSchemaCore),
  onUnmount: jsonNullishOptional(triggerActionSchemaCore),
});

export const sectionDividerSchema = baseSectionPropsSchema.extend({
  type: z.literal("divider"),
});

export const sectionContentBlockSchema = baseSectionPropsSchema
  .extend({
    type: z.literal("contentBlock"),
    elements: z.array(elementBlockSchema),
    flow: responsiveValueSchema(
      z.enum(["row", "column", "row-reverse", "column-reverse"])
    ).optional(),
    align: jsonNullishOptional(responsiveStringSchema),
    distribute: jsonNullishOptional(responsiveStringSchema),
    wrap: responsiveValueSchema(z.enum(["nowrap", "wrap", "wrap-reverse"])).optional(),
    gap: jsonNullishOptional(responsiveStringSchema),
    rowGap: jsonNullishOptional(responsiveStringSchema),
    columnGap: jsonNullishOptional(responsiveStringSchema),

    contentWidth: jsonNullishOptional(responsiveSectionContentSizeSchema),
    contentHeight: jsonNullishOptional(responsiveSectionContentSizeSchema),
  })
  .merge(reorderablePropsSchema);

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
  /** CSS grid-auto-columns — implicit column track size(s) when items overflow defined tracks. */
  gridAutoColumns: jsonNullishOptional(responsiveStringSchema),
  /**
   * CSS grid-auto-flow — controls the auto-placement algorithm.
   * "row" (default) | "column" | "row dense" | "column dense"
   */
  gridAutoFlow: jsonNullishOptional(
    z.enum(["row", "column", "row dense", "column dense", "dense"])
  ),
  /**
   * CSS grid-template-areas — multi-line string (one string per row, space-separated area names).
   * Example: '"header header" "sidebar content" "footer footer"'
   */
  gridTemplateAreas: jsonNullishOptional(z.string()),
  elementOrder: elementOrderSchema,
  columnSpan: z.union([columnSpanMapSchema, responsiveColumnSpanSchema]).optional(),
  itemLayout: itemLayoutSchema,
  contentWidth: jsonNullishOptional(responsiveSectionContentSizeSchema),
  contentHeight: jsonNullishOptional(responsiveSectionContentSizeSchema),
});

export const sectionTriggerSchema = baseSectionPropsSchema.extend({
  type: z.literal("sectionTrigger"),
  id: jsonNullishOptional(z.string()),
  // onVisible, onInvisible, onProgress, threshold, triggerOnce, rootMargin, delay
  // are inherited from baseSectionPropsSchema — no need to redeclare.
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

  collapsedElements: jsonNullishOptional(
    z.array(z.union([presetReferenceSchema, elementBlockSchema]))
  ),

  revealedElements: jsonNullishOptional(
    z.array(z.union([presetReferenceSchema, elementBlockSchema]))
  ),

  revealStaggerMs: jsonNullishOptional(z.number()),

  revealDurationMs: jsonNullishOptional(z.number()),

  revealPreset: revealPresetSchema,
});
