import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { jsonNullishOptional, themeStringSchema } from "./schema-primitives";
import {
  headingLevelSchema,
  textFillBaseSchema,
  typographyOverridesSchema,
} from "./schema-shared-primitives";

const counterVariantSchema = jsonNullishOptional(z.enum(["display", "section", "label"]));
/**
 * Counter trigger — when absent, defaults to "onVisible" (matches runtime behavior).
 * Using .optional().default() keeps `trigger` optional in the TypeScript input type
 * (so existing callers need not change) while making the default visible to JSON schema
 * and MCP tooling in the output type.
 */
const counterTriggerSchema = jsonNullishOptional(
  z.enum(["onMount", "onVisible", "onScroll"]).default("onVisible")
);

/** RAF tween: duration in ms; easing matches resolveEasing in ElementCounter (easeOut default when omitted). */
export const counterTweenSchema = z.object({
  duration: z.number().positive(),
  easing: z.string().optional(),
});

/** Scroll-driven mapping: intersection ratio → value (trigger onScroll). */
export const counterScrollSchema = z.object({
  scrollStart: z.number().min(0).max(1).optional(),
  scrollEnd: z.number().min(0).max(1).optional(),
  easing: z.string().optional(),
});

export const elementCounterSchema = z
  .object({
    type: z.literal("elementCounter"),
    target: z.number(),
    start: z.number().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    decimals: z.number().int().nonnegative().optional(),
    separator: z.boolean().optional(),
    locale: z.string().optional(),
    trigger: counterTriggerSchema,
    tween: counterTweenSchema.optional(),
    variableTween: counterTweenSchema.optional(),
    counterScroll: counterScrollSchema.optional(),
    level: headingLevelSchema.optional(),
    variant: counterVariantSchema,
    color: themeStringSchema.optional(),
    textFill: textFillBaseSchema.optional(),
    variableKey: z.string().optional(),
  })
  .merge(typographyOverridesSchema)
  .merge(elementLayoutSchema)
  .superRefine((data, ctx) => {
    // trigger now always has a value from z.default("onVisible") above — no fallback needed.
    const trig = data.trigger;
    const isScroll = trig === "onScroll";
    const hasVar = Boolean(data.variableKey);

    if (hasVar && !isScroll && !data.variableTween) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "variableTween is required when variableKey is set and trigger is not onScroll",
        path: ["variableTween"],
      });
    }

    if (isScroll) {
      if (!data.counterScroll) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "counterScroll is required when trigger is onScroll",
          path: ["counterScroll"],
        });
      }
    } else if (!hasVar) {
      if (!data.tween) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "tween is required when trigger is onMount or onVisible and variableKey is not set",
          path: ["tween"],
        });
      }
    }
  });
