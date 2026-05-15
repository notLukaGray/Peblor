import { z } from "zod";
import { sectionBorderSchema } from "./section-effect-schemas";
import { jsonNullishOptional, themeStringSchema } from "./schema-primitives";

const cssWidthPattern =
  /^(?:\d+(?:\.\d+)?(?:fr|%|px|rem|em|vw|vh)|--[a-zA-Z0-9_-]+|[a-zA-Z][a-zA-Z0-9_-]*)$/;
const cssWidthSchema = z.string().refine((val) => cssWidthPattern.test(val.trim()), {
  message:
    "Width must be a valid CSS value: number with unit (fr, %, px, rem, em, vw, vh) or design token",
});

export const cssWidthOrFunctionSchema = z
  .string()
  .min(1)
  .max(120)
  .refine(
    (val) => {
      const t = val.trim();
      return cssWidthPattern.test(t) || /^(min|max|clamp)\([\s\S]+\)$/.test(t);
    },
    { message: "Width must be a length (e.g. 800px), or min/max/clamp(...)" }
  );

export const columnCountSchema = z.union([
  z.number().int().min(1).max(12),
  z
    .object({
      mobile: jsonNullishOptional(z.number().int().min(1).max(12)),
      desktop: jsonNullishOptional(z.number().int().min(1).max(12)),
    })
    .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
      message: "At least one of mobile or desktop must be provided",
    }),
]);

const columnWidthsValueSchema = z.union([
  z.literal("equal"),
  z.literal("hug"),
  z.array(z.union([z.number().positive(), cssWidthSchema, z.literal("hug")])),
]);

export const columnWidthsSchema = jsonNullishOptional(
  z.union([
    columnWidthsValueSchema,
    z
      .object({
        mobile: jsonNullishOptional(columnWidthsValueSchema),
        desktop: jsonNullishOptional(columnWidthsValueSchema),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop columnWidths must be provided",
      }),
  ])
);

export const columnGapsSchema = jsonNullishOptional(
  z.union([
    z.string(),
    z.array(z.string()),
    z.object({
      mobile: jsonNullishOptional(z.union([z.string(), z.array(z.string())])),
      desktop: jsonNullishOptional(z.union([z.string(), z.array(z.string())])),
    }),
  ])
);

export const columnSpanSchema = jsonNullishOptional(
  z.union([z.number().int().min(1).max(12), z.literal("all")])
);
export const columnSpanMapSchema = z.record(z.string(), columnSpanSchema);
export const responsiveColumnSpanSchema = z
  .object({
    mobile: jsonNullishOptional(columnSpanMapSchema),
    desktop: jsonNullishOptional(columnSpanMapSchema),
  })
  .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
    message: "At least one of mobile or desktop columnSpan must be provided",
  });

const gridModeSchema = z.enum(["columns", "grid"]);
export const responsiveGridModeSchema = jsonNullishOptional(
  z.union([
    gridModeSchema,
    z
      .object({
        mobile: jsonNullishOptional(gridModeSchema),
        desktop: jsonNullishOptional(gridModeSchema),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop gridMode must be provided",
      }),
  ])
);

export const columnStyleSchema = z.object({
  borderRadius: jsonNullishOptional(z.string()),
  border: jsonNullishOptional(sectionBorderSchema),
  fill: jsonNullishOptional(themeStringSchema),
  padding: jsonNullishOptional(z.string()),
  gap: jsonNullishOptional(z.string()),
  justifyContent: jsonNullishOptional(
    z.enum(["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"])
  ),
  alignItems: jsonNullishOptional(z.enum(["flex-start", "center", "flex-end", "stretch"])),
  alignX: jsonNullishOptional(z.enum(["left", "center", "right", "stretch"])),
  alignY: jsonNullishOptional(
    z.enum(["top", "center", "bottom", "space-between", "space-around", "space-evenly"])
  ),
  minHeight: jsonNullishOptional(z.string()),
  maxHeight: jsonNullishOptional(z.string()),
  minWidth: jsonNullishOptional(z.string()),
  maxWidth: jsonNullishOptional(z.string()),
  width: jsonNullishOptional(z.string()),
  height: jsonNullishOptional(z.string()),
  overflow: jsonNullishOptional(z.enum(["visible", "hidden", "auto", "scroll"])),
  overflowX: jsonNullishOptional(z.enum(["visible", "hidden", "auto", "scroll"])),
  overflowY: jsonNullishOptional(z.enum(["visible", "hidden", "auto", "scroll"])),
});

export const columnStylesSchema = jsonNullishOptional(
  z.union([
    z.array(columnStyleSchema),
    z
      .object({
        mobile: jsonNullishOptional(z.array(columnStyleSchema)),
        desktop: jsonNullishOptional(z.array(columnStyleSchema)),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop columnStyles must be provided",
      }),
  ])
);

export const itemStyleSchema = columnStyleSchema.extend({});

export const itemStylesSchema = jsonNullishOptional(
  z.union([
    z.record(z.string(), itemStyleSchema),
    z
      .object({
        mobile: jsonNullishOptional(z.record(z.string(), itemStyleSchema)),
        desktop: jsonNullishOptional(z.record(z.string(), itemStyleSchema)),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop itemStyles must be provided",
      }),
  ])
);

export const itemLayoutEntrySchema = z.object({
  column: jsonNullishOptional(z.number().int().min(0).max(11)),
  row: jsonNullishOptional(z.number().int().min(0)),
  columnSpan: columnSpanSchema,
  rowSpan: jsonNullishOptional(z.number().int().min(1).max(50)),
  order: jsonNullishOptional(z.number().int()),
  alignX: jsonNullishOptional(z.enum(["left", "center", "right", "stretch"])),
  alignY: jsonNullishOptional(z.enum(["top", "center", "bottom", "stretch"])),
  zIndex: jsonNullishOptional(z.number()),
});

const itemLayoutMapSchema = z.record(z.string(), itemLayoutEntrySchema);
export const itemLayoutSchema = jsonNullishOptional(
  z.union([
    itemLayoutMapSchema,
    z
      .object({
        mobile: jsonNullishOptional(itemLayoutMapSchema),
        desktop: jsonNullishOptional(itemLayoutMapSchema),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop itemLayout must be provided",
      }),
  ])
);

export const elementOrderSchema = jsonNullishOptional(
  z.union([
    z.array(z.string()),
    z
      .object({
        mobile: jsonNullishOptional(z.array(z.string())),
        desktop: jsonNullishOptional(z.array(z.string())),
      })
      .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
        message: "At least one of mobile or desktop elementOrder must be provided",
      }),
  ])
);

export const columnAssignmentsSchema = jsonNullishOptional(
  z.union([
    z.record(z.string(), z.number().int().min(0)),
    z.object({
      mobile: jsonNullishOptional(z.record(z.string(), z.number().int().min(0))),
      desktop: jsonNullishOptional(z.record(z.string(), z.number().int().min(0))),
    }),
  ])
);

export const columnAssignmentsRequiredSchema = z.union([
  z.record(z.string(), z.number().int().min(0)),
  z
    .object({
      mobile: jsonNullishOptional(z.record(z.string(), z.number().int().min(0))),
      desktop: jsonNullishOptional(z.record(z.string(), z.number().int().min(0))),
    })
    .refine((obj) => obj.mobile !== undefined || obj.desktop !== undefined, {
      message: "At least one of mobile or desktop columnAssignments must be provided",
    }),
]);
