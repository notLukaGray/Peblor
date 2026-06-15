import { z } from "zod";
import { elementLayoutSchemaBase } from "./element-foundation-schemas";
import {
  jsonNullishOptional,
  jsonValueSchema,
  themeStringSchema,
  variantWithAliases,
} from "./schema-primitives";

/**
 * Inline style sub-keys understood by ElementRange.
 *
 * When `trackColor`, `fillColor`, and `trackHeight` + `thumbSize` are all present the component
 * renders a fully custom two-tone track/thumb.  When only some are provided it falls back to the
 * browser's native range appearance with optional `accentColor` tinting.
 *
 * All values are CSS strings (e.g. "#fff", "2px", "12px") unless noted.
 */
const elementRangeStyleSchema = z.object({
  /** Background color of the empty portion of the track. */
  trackColor: themeStringSchema.optional(),
  /** Fill color of the filled portion of the track and the thumb. */
  fillColor: themeStringSchema.optional(),
  /** CSS `accent-color` applied to the native input when the custom renderer is inactive. */
  accentColor: themeStringSchema.optional(),
  /** Height of the custom track (e.g. "4px"). Required to activate the custom renderer. */
  trackHeight: z.string().optional(),
  /**
   * Width and height of the custom circular thumb (e.g. "12px").
   * Required to activate the custom renderer. Sets both thumbWidth and thumbHeight when
   * those are not explicitly provided.
   */
  thumbSize: z.string().optional(),
  /** Explicit thumb width — overrides thumbSize width when set. */
  thumbWidth: z.string().optional(),
  /** Explicit thumb height — overrides thumbSize height when set. */
  thumbHeight: z.string().optional(),
  /** Border-radius applied to track and fill segments. Defaults to "9999px" (pill). */
  borderRadius: z.string().optional(),
  /** Scale applied to the thumb when the slider is idle (not pressed). 0–2 float. */
  thumbIdleScale: z.union([z.number(), z.string()]).optional(),
  /** Scale applied to the thumb when the slider is actively pressed. 0–2 float. */
  thumbActiveScale: z.union([z.number(), z.string()]).optional(),
  /** Opacity of the glass shell when the slider is idle. 0–1 float. */
  thumbIdleOpacity: z.union([z.number(), z.string()]).optional(),
  /** Opacity of the glass shell when the slider is actively pressed. 0–1 float. */
  thumbActiveOpacity: z.union([z.number(), z.string()]).optional(),
  /** When true, renders a glass backdrop-filter effect on the custom thumb. */
  glassOnThumb: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
});

/**
 * Range slider element.
 *
 * Integrates with VideoControlContext for `action: "volume"` and `action: "seek"`.
 * For all other `action` strings, fires `firePeblorProgressTrigger` with a 0–1
 * normalised ratio on every change event.
 */
export const elementRangeSchema = z
  .object({
    type: z.literal("elementRange"),
    /** Preset key for `pbBuilderDefaultsV1.elements.range` variant templates. */
    variant: jsonNullishOptional(
      variantWithAliases(
        ["default", "slim", "accent"] as const,
        { thick: "default", thin: "slim", colored: "accent" } as const
      )
    ),
    /** Minimum value of the slider. Defaults to 0 in the component. */
    min: z.number().optional(),
    /** Maximum value of the slider. Defaults to 1 in the component. */
    max: z.number().optional(),
    /** Step increment. Defaults to 0.01 in the component. */
    step: z.number().optional(),
    /**
     * Page-builder action type dispatched on every change.
     * Special values understood by the component: `"volume"` and `"seek"` — both
     * delegate to VideoControlContext rather than the action bus.
     * Any other string fires `firePeblorProgressTrigger`.
     */
    action: z.string().optional(),
    /** Arbitrary payload forwarded with the action. Must be JSON-serializable (C-07). */
    actionPayload: jsonNullishOptional(jsonValueSchema),
    /** Accessible label for the `<input type="range">`. Defaults to "Range". */
    ariaLabel: z.string().optional(),
    /** Disabled state for non-interactive/read-only slider contexts. */
    disabled: z.boolean().optional(),
    /**
     * Inline style overrides.  The component reads specific sub-keys for custom rendering
     * (`trackColor`, `fillColor`, `trackHeight`, `thumbSize`, `borderRadius`, `accentColor`).
     * Any additional CSS properties are spread onto the element directly.
     */
    style: elementRangeStyleSchema.optional(),
  })
  // Use elementLayoutSchemaBase (not elementLayoutSchema) so we can omit action/actionPayload.
  // elementRange uses domain-specific action values ("seek", "volume") that are intentionally
  // not trigger-action types — they delegate to VideoControlContext rather than the action bus.
  // Omitting prevents the canonical enum from overwriting the local z.string().optional() above.
  .merge(elementLayoutSchemaBase.omit({ action: true, actionPayload: true }));
