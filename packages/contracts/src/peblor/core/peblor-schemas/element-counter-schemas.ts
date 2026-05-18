import { z } from "zod";
import { elementLayoutSchema } from "./element-foundation-schemas";
import { jsonNullishOptional, themeStringSchema } from "./schema-primitives";

const counterVariantSchema = jsonNullishOptional(z.enum(["display", "section", "label"]));
const responsiveCssSizeSchema = z.union([
  z.union([z.string(), z.number()]),
  z.tuple([z.union([z.string(), z.number()]), z.union([z.string(), z.number()])]),
]);
const headingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
const counterTriggerSchema = z.enum(["onMount", "onVisible", "onScroll"]).optional();

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
    scroll: counterScrollSchema.optional(),
    level: headingLevelSchema.optional(),
    variant: counterVariantSchema,
    fontFamily: z.string().optional(),
    fontSize: responsiveCssSizeSchema.optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    letterSpacing: z.union([z.string(), z.number()]).optional(),
    color: themeStringSchema.optional(),
    textFill: z
      .union([
        z.object({ type: z.literal("color"), value: themeStringSchema }),
        z.object({ type: z.literal("gradient"), value: themeStringSchema }),
      ])
      .optional(),
    variableKey: z.string().optional(),
  })
  .merge(elementLayoutSchema)
  .superRefine((data, ctx) => {
    const trig = data.trigger ?? "onVisible";
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
      if (!data.scroll) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "scroll is required when trigger is onScroll",
          path: ["scroll"],
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
