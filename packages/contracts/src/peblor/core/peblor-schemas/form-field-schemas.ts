import { z } from "zod";
import { responsiveElementBodyVariantSchema } from "./element-foundation-schemas";
import { sectionEffectSchema } from "./section-effect-schemas";
import {
  cssInlineStyleSchema,
  responsiveElementAlignSchema,
  responsiveStringSchema,
  responsiveThemeStringSchema,
  responsiveTextAlignSchema,
  triggerActionSchema,
} from "./schema-primitives";
import { analyticsConfigSchema } from "../../../analytics/schemas";

/** Option for choice fields (radio, select, checkboxGroup). */
export const formFieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

/** Style (appearance) modifiers — how the form field looks. Reuses element-style primitives. */
export const formFieldStyleSchema = z.object({
  width: responsiveStringSchema.optional(),
  align: responsiveElementAlignSchema.optional(),
  marginTop: responsiveStringSchema.optional(),
  marginBottom: responsiveStringSchema.optional(),
  marginLeft: responsiveStringSchema.optional(),
  marginRight: responsiveStringSchema.optional(),
  textAlign: responsiveTextAlignSchema.optional(),
  padding: responsiveStringSchema.optional(),
  fill: responsiveThemeStringSchema.optional(),
  stroke: responsiveThemeStringSchema.optional(),
  borderRadius: responsiveStringSchema.optional(),
  borderWidth: responsiveStringSchema.optional(),
  effects: z.array(sectionEffectSchema).optional(),
  wrapperStyle: cssInlineStyleSchema.optional(),
  /** Optional Tailwind/class override for label (e.g. "text-lg font-bold"). Default typography from level. */
  labelClassName: z.string().optional(),
  /** Optional Tailwind/class override for input/control (e.g. "text-lg"). Default typography from level. */
  inputClassName: z.string().optional(),
  /** Optional inline style object applied directly to the native input/control element. */
  inputStyle: cssInlineStyleSchema.optional(),
  /** Optional class for error message text. */
  errorClassName: z.string().optional(),
});

/** fieldType enum: one container, many types. Validation and HTML behavior follow from type. */
export const formFieldTypeSchema = z.enum([
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "time",
  "datetime-local",
  "color",
  "search",
  "paragraph",
  "checkbox",
  "checkboxGroup",
  "radio",
  "select",
  "switch",
  "range",
  "hidden",
  "button",
  "row",
  // Legacy alias accepted so existing JSON still parses; new content should use fieldType "button".
  "submit",
]);

export const formButtonTypeSchema = z.enum(["submit", "reset", "button"]);

const formFieldContentSchema = z.object({
  type: z.literal("formField"),
  fieldType: formFieldTypeSchema,
  /** Typography level (1–6), same as element body. Drives label and input text size from JSON. */
  level: responsiveElementBodyVariantSchema.optional(),
  name: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  autocomplete: z.string().optional(),
  value: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  rows: z.number().optional(),
  min: z.union([z.number(), z.string()]).optional(),
  max: z.union([z.number(), z.string()]).optional(),
  step: z.union([z.number(), z.string()]).optional(),
  options: z.array(formFieldOptionSchema).optional(),
  accept: z.string().optional(),
  multiple: z.boolean().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  showCharacterCount: z.boolean().optional(),
  /** Mobile keyboard type hint (e.g. "numeric" shows a number pad without type="number" constraints). */
  inputMode: z
    .enum(["none", "text", "decimal", "numeric", "tel", "search", "email", "url"])
    .optional(),
  spellCheck: z.boolean().optional(),
  buttonType: formButtonTypeSchema.optional(),
  loadingText: z.string().optional(),
  action: triggerActionSchema.optional(),
  href: z.string().optional(),
  gap: responsiveStringSchema.optional(),
  columns: z.number().int().min(1).optional(),
  /** Analytics config scoped to this form field. */
  analytics: analyticsConfigSchema,
});

export type FormFieldOption = z.infer<typeof formFieldOptionSchema>;
export type FormFieldStyle = z.infer<typeof formFieldStyleSchema>;
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
export type FormButtonType = z.infer<typeof formButtonTypeSchema>;
export type FormFieldBlock = z.infer<typeof formFieldContentSchema> &
  FormFieldStyle & {
    fields?: FormFieldBlock[];
  };

/** Common (content) + Style merged into one form field block. */
export const formFieldBlockSchema: z.ZodType<FormFieldBlock> = z.lazy(() =>
  formFieldContentSchema
    .extend({
      fields: z.array(formFieldBlockSchema).optional(),
    })
    .merge(formFieldStyleSchema)
    .superRefine((field, ctx) => {
      const needsOptions =
        field.fieldType === "select" ||
        field.fieldType === "radio" ||
        field.fieldType === "checkboxGroup";
      if (needsOptions && (!Array.isArray(field.options) || field.options.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: `${field.fieldType} fields require a non-empty options array`,
        });
      }

      if (field.fieldType === "button" || field.fieldType === "submit") {
        const label = typeof field.label === "string" ? field.label.trim() : "";
        if (!label) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["label"],
            message: `${field.fieldType} fields require a non-empty label`,
          });
        }
      }

      if (field.fieldType === "row") {
        if (!Array.isArray(field.fields) || field.fields.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fields"],
            message: "row fields require a non-empty fields array",
          });
        }
      } else if (Array.isArray(field.fields)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields"],
          message: `fields is only valid on row fields, not "${field.fieldType}"`,
        });
      }

      if (
        field.buttonType !== undefined &&
        field.fieldType !== "button" &&
        field.fieldType !== "submit"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["buttonType"],
          message: `buttonType is only valid on button fields, not "${field.fieldType}"`,
        });
      }

      if (field.multiple === true && field.fieldType !== "select") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["multiple"],
          message: `multiple is only valid on select fields, not "${field.fieldType}"`,
        });
      }
    })
) as z.ZodType<FormFieldBlock>;
