import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import {
  jsonNullishOptional,
  referrerPolicySchema,
  responsiveStringSchema,
  themeStringSchema,
  triggerActionSchema,
} from "./schema-primitives";

const _triggerActionOptions = (
  triggerActionSchema._def as unknown as {
    options: Array<z.ZodObject<{ type: z.ZodLiteral<string> }>>;
  }
).options;
export const buttonActionSchema = z.union(
  _triggerActionOptions.map((o) => o.shape.type) as unknown as [
    z.ZodLiteral<string>,
    ...z.ZodLiteral<string>[],
  ]
);
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
    variant: jsonNullishOptional(z.enum(["default", "accent", "ghost", "text"])),
    label: jsonNullishOptional(z.string()),
    copyType: jsonNullishOptional(z.enum(["heading", "body"])),
    level: jsonNullishOptional(
      z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
    ),
    /**
     * Font family override. Use named slots to follow active foundations:
     * `"primary"` | `"secondary"` | `"mono"`.
     */
    fontFamily: jsonNullishOptional(z.string()),
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
    actionPayload: jsonNullishOptional(z.unknown()),
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
    /** Border width in px when `wrapperStroke` draws a border (default 2 at runtime). */
    wrapperStrokeWidth: z.preprocess(
      (value) => {
        if (typeof value === "string") {
          const parsed = Number(value.trim());
          return Number.isFinite(parsed) ? parsed : value;
        }
        return value;
      },
      jsonNullishOptional(z.number().min(0).max(48))
    ),
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
    pointerDownAction: jsonNullishOptional(triggerActionSchema),
    pointerUpAction: jsonNullishOptional(triggerActionSchema),
  })
  .merge(elementLayoutSchema)
  // elementLayoutSchema has `action: z.string()` for generic element interactions.
  // .safeExtend() re-asserts the stricter buttonActionSchema enum after the merge overrides it.
  .safeExtend({ action: jsonNullishOptional(buttonActionSchema) })
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
    const candidate = {
      type: data.action,
      ...(data.actionPayload !== undefined ? { payload: data.actionPayload } : {}),
    };
    const result = triggerActionSchema.safeParse(candidate);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionPayload"],
        message: `actionPayload does not match the expected shape for action "${data.action}"`,
      });
    }
  });
