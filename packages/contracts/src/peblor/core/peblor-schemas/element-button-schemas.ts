import { z } from "zod";
import { elementLayoutSchemaBase } from "./element-foundation-schemas";
import {
  jsonNullishOptional,
  jsonValueSchema,
  referrerPolicySchema,
  responsiveStringSchema,
  themeStringSchema,
  TRIGGER_ACTION_CORE_VARIANTS,
  validateActionPayload,
  variantWithAliases,
} from "./schema-primitives";
import { headingLevelSchema, typographyOverridesSchema } from "./schema-shared-primitives";

/** The union of all canonical trigger action type strings, extracted from the variants tuple. */
type TriggerActionType = (typeof TRIGGER_ACTION_CORE_VARIANTS)[number]["shape"]["type"]["value"];

/**
 * Canonical list of all valid trigger action type strings, derived from
 * TRIGGER_ACTION_CORE_VARIANTS so drift is structurally impossible (C-05).
 *
 * Previously a hand-maintained parallel list; now auto-derived so adding a new
 * variant to schema-primitives.ts automatically makes it valid here too.
 */
export const BUTTON_ACTION_TYPES = TRIGGER_ACTION_CORE_VARIANTS.map(
  (v) => v.shape.type.value
) as TriggerActionType[] as [TriggerActionType, ...TriggerActionType[]];

export const buttonActionSchema = z.enum(BUTTON_ACTION_TYPES);
export type ButtonAction = z.infer<typeof buttonActionSchema>;

export function parseButtonAction(value: string | undefined): ButtonAction | undefined {
  if (value == null || value === "") return undefined;
  const result = buttonActionSchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export const elementButtonSchema = z
  .object({
    type: z.literal("elementButton"),
    /** Preset key for `pbBuilderDefaultsV1.elements.button` variant templates. */
    variant: jsonNullishOptional(
      variantWithAliases(
        ["default", "accent", "ghost", "text"] as const,
        {
          primary: "accent",
          secondary: "ghost",
          tertiary: "text",
          link: "text",
          naked: "text",
        } as const
      )
    ),
    label: jsonNullishOptional(z.string()),
    copyType: jsonNullishOptional(z.enum(["heading", "body"])),
    level: jsonNullishOptional(headingLevelSchema),
    wordWrap: jsonNullishOptional(z.boolean()),
    vectorRef: jsonNullishOptional(z.string()),
    href: jsonNullishOptional(z.string()),
    external: jsonNullishOptional(z.boolean()),
    target: jsonNullishOptional(z.enum(["_self", "_blank", "_parent", "_top"])),
    rel: jsonNullishOptional(z.string()),
    download: jsonNullishOptional(z.union([z.boolean(), z.string()])),
    hreflang: jsonNullishOptional(z.string()),
    ping: jsonNullishOptional(z.string()),
    referrerPolicy: jsonNullishOptional(referrerPolicySchema),
    /** The action string — must be a known trigger action type. */
    action: jsonNullishOptional(buttonActionSchema),
    actionPayload: jsonNullishOptional(jsonValueSchema),
    linkDefault: jsonNullishOptional(themeStringSchema),
    linkHover: jsonNullishOptional(themeStringSchema),
    linkActive: jsonNullishOptional(themeStringSchema),
    linkDisabled: jsonNullishOptional(themeStringSchema),
    linkTransition: jsonNullishOptional(z.union([z.string(), z.number()])),
    disabled: jsonNullishOptional(z.boolean()),
    loading: jsonNullishOptional(z.boolean()),
    loadingLabel: jsonNullishOptional(z.string()),
    wrapperFill: jsonNullishOptional(themeStringSchema),
    wrapperStroke: jsonNullishOptional(themeStringSchema),
    wrapperFillRef: jsonNullishOptional(z.string()),
    wrapperStrokeRef: jsonNullishOptional(z.string()),
    /** Border width in px when `wrapperStroke` draws a border (default 2 at runtime). Numeric values only (C-22). */
    wrapperStrokeWidth: jsonNullishOptional(z.number().min(0).max(48)),
    wrapperPadding: jsonNullishOptional(responsiveStringSchema),
    wrapperBorderRadius: jsonNullishOptional(responsiveStringSchema),
    /** Explicit width for the padded wrapper pill (e.g. "10rem", "100%"). */
    wrapperWidth: jsonNullishOptional(responsiveStringSchema),
    /** Explicit height for the padded wrapper pill (e.g. "2.75rem", "44px"). */
    wrapperHeight: jsonNullishOptional(responsiveStringSchema),
    /** Minimum width for the padded wrapper pill — useful for fixed-size icon buttons or glass. */
    wrapperMinWidth: jsonNullishOptional(responsiveStringSchema),
    /** Minimum height for the padded wrapper pill — sets a minimum tap target without fixed height. */
    wrapperMinHeight: jsonNullishOptional(responsiveStringSchema),
    /** Fill color on hover. Falls back to a subtle brightness shift if unset. */
    wrapperFillHover: jsonNullishOptional(themeStringSchema),
    /** Stroke/border color on hover. */
    wrapperStrokeHover: jsonNullishOptional(themeStringSchema),
    /** Fill color when pressed/active. */
    wrapperFillActive: jsonNullishOptional(themeStringSchema),
    /** Scale transform on hover (default 1). */
    wrapperScaleHover: jsonNullishOptional(z.number()),
    /** Scale transform when pressed (e.g. 0.97). */
    wrapperScaleActive: jsonNullishOptional(z.number()),
    /** Scale transform when disabled (default 1). */
    wrapperScaleDisabled: jsonNullishOptional(z.number()),
    /** Opacity multiplier on hover (0–1). Stacks on top of hover fill. */
    wrapperOpacityHover: jsonNullishOptional(z.number()),
    /** Fill color when disabled. */
    wrapperFillDisabled: jsonNullishOptional(themeStringSchema),
    /** CSS transition override for all wrapper state changes. */
    wrapperTransition: jsonNullishOptional(z.string()),
    /**
     * Extra CSS custom properties applied on the interactive wrapper (keys must start with `--`).
     * Merged after built-in state vars so authors can override or add advanced tokens.
     */
    wrapperInteractionVars: jsonNullishOptional(z.record(z.string(), themeStringSchema)),
    bgFill: jsonNullishOptional(
      z.object({
        fill: themeStringSchema,
        backgroundSize: jsonNullishOptional(z.string()),
        motion: jsonNullishOptional(
          z.array(
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal("pointer"),
                ease: z.number().min(0.01).max(1).optional(),
              }),
              z.object({
                type: z.literal("loop"),
                to: z.record(z.string(), z.array(z.union([z.string(), z.number()])).min(2)),
                transition: z.object({
                  duration: z.number(),
                  ease: z
                    .union([z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])])
                    .optional(),
                  delay: z.number().optional(),
                  repeatType: z.enum(["loop", "reverse", "mirror"]).optional(),
                }),
              }),
              z.object({
                type: z.literal("entrance"),
                from: z.record(z.string(), z.union([z.string(), z.number()])),
                to: z.record(z.string(), z.union([z.string(), z.number()])),
                transition: z.object({
                  duration: z.number(),
                  ease: z
                    .union([z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])])
                    .optional(),
                  delay: z.number().optional(),
                }),
              }),
            ])
          )
        ),
      })
    ),
    // pointerDownAction / pointerUpAction are not declared here because they are
    // available via the `interactions` field from elementLayoutSchemaBase (merged
    // below), which provides onPointerDown / onPointerUp through the shared
    // elementInteractionsSchema — both go through the same firePeblorAction dispatch.
  })
  // fontFamily is the only typography override the button exposes; pick it from the
  // shared schema so the inner type (jsonNullishOptional(z.string())) stays in sync.
  .merge(typographyOverridesSchema.pick({ fontFamily: true }))
  .merge(elementLayoutSchemaBase.omit({ action: true, actionPayload: true }))
  .refine(
    (data) => {
      const hasLink = data.href != null && data.href !== "";
      const hasAction = data.action != null;
      return !hasLink || !hasAction;
    },
    {
      message: "elementButton: use either href (link) or action (button function), not both",
      path: ["href"],
    }
  )
  .superRefine((data, ctx) => {
    if (!data.action) return;
    validateActionPayload(data.action, data.actionPayload, ctx);
  });
