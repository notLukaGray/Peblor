import { z } from "zod";
import { tierMapSchema } from "./responsive-value-schemas";
import { sectionBorderSchema } from "./section-effect-schemas";
import { jsonNullishOptional, themeStringOrGradientSchema } from "./schema-primitives";

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
      return (
        cssWidthPattern.test(t) ||
        /^(min|max|clamp|calc|round|mod|rem|sin|cos|tan|asin|acos|atan|atan2)\([\s\S]+\)$/.test(t)
      );
    },
    { message: "Width must be a length (e.g. 800px), or min/max/clamp(...)" }
  );

export const columnCountSchema = z.union([
  z.number().int().min(1).max(12),
  tierMapSchema(z.number().int().min(1).max(12)),
]);

const columnWidthsValueSchema = z.union([
  z.literal("equal"),
  z.literal("hug"),
  z.array(z.union([z.number().positive(), cssWidthSchema, z.literal("hug")])),
]);

export const columnWidthsSchema = jsonNullishOptional(
  z.union([columnWidthsValueSchema, tierMapSchema(columnWidthsValueSchema)])
);

const columnGapsValueSchema = z.union([z.string(), z.array(z.string())]);
export const columnGapsSchema = jsonNullishOptional(
  z.union([z.array(z.string()), tierMapSchema(columnGapsValueSchema), z.string()])
);

export const columnSpanSchema = jsonNullishOptional(
  z.union([z.number().int().min(1).max(12), z.literal("all")])
);
export const columnSpanMapSchema = z.record(z.string(), columnSpanSchema);

export const responsiveColumnSpanSchema = tierMapSchema(columnSpanMapSchema);

const gridModeSchema = z.enum(["columns", "grid"]);
export const responsiveGridModeSchema = jsonNullishOptional(
  z.union([gridModeSchema, tierMapSchema(gridModeSchema)])
);

export const columnStyleSchema = z.object({
  borderRadius: jsonNullishOptional(z.string()),
  border: jsonNullishOptional(sectionBorderSchema),
  /** Per-side border CSS shorthand (e.g. "1px solid oklch(...)"). Overrides `border` on that side. */
  borderTop: jsonNullishOptional(z.string()),
  borderRight: jsonNullishOptional(z.string()),
  borderBottom: jsonNullishOptional(z.string()),
  borderLeft: jsonNullishOptional(z.string()),
  fill: jsonNullishOptional(themeStringOrGradientSchema),
  padding: jsonNullishOptional(z.string()),
  gap: jsonNullishOptional(z.string()),
  distribute: jsonNullishOptional(
    z.enum(["start", "center", "end", "between", "around", "evenly"])
  ),
  align: jsonNullishOptional(z.enum(["start", "center", "end", "stretch"])),
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
  scroll: jsonNullishOptional(z.enum(["visible", "hidden", "auto", "scroll"])),
  scrollX: jsonNullishOptional(z.enum(["visible", "hidden", "auto", "scroll"])),
  scrollY: jsonNullishOptional(z.enum(["visible", "hidden", "auto", "scroll"])),
});

export const columnStylesSchema = jsonNullishOptional(
  z.union([z.array(columnStyleSchema), tierMapSchema(z.array(columnStyleSchema))])
);

export const itemStyleSchema = columnStyleSchema.extend({});

export const itemStylesSchema = jsonNullishOptional(
  z.union([
    // Responsive tier-map form must be tried BEFORE the flat record branch — otherwise
    // the record branch matches tier keys as element-id keys, validates their nested maps
    // against `itemStyleSchema`, and silently strips every override (C-itemStyles-union-order).
    tierMapSchema(z.record(z.string(), itemStyleSchema)),
    z.record(z.string(), itemStyleSchema),
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
  layer: jsonNullishOptional(z.number()),
  /** CSS grid-area — assign this item to a named template area or a row/col span shorthand. */
  gridArea: jsonNullishOptional(z.string()),
  /** CSS grid-column placement shorthand (e.g. "1 / 3", "span 2"). */
  gridColumn: jsonNullishOptional(z.string()),
  /** CSS grid-row placement shorthand (e.g. "1 / 3", "span 2"). */
  gridRow: jsonNullishOptional(z.string()),
});

const itemLayoutMapSchema = z.record(z.string(), itemLayoutEntrySchema);
export const itemLayoutSchema = jsonNullishOptional(
  z.union([
    // Responsive form must be tried BEFORE the flat record branch — same reason as
    // itemStylesSchema above (C-itemStyles-union-order applies identically here).
    tierMapSchema(itemLayoutMapSchema),
    itemLayoutMapSchema,
  ])
);

export const elementOrderSchema = jsonNullishOptional(
  z.union([z.array(z.string()), tierMapSchema(z.array(z.string()))])
);

const columnAssignmentsRecordSchema = z.record(z.string(), z.number().int().min(0));
export const columnAssignmentsSchema = jsonNullishOptional(
  z.union([tierMapSchema(columnAssignmentsRecordSchema), columnAssignmentsRecordSchema])
);

export const columnAssignmentsRequiredSchema = z.union([
  tierMapSchema(columnAssignmentsRecordSchema),
  columnAssignmentsRecordSchema,
]);
