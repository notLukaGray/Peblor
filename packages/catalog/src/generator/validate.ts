import { existsSync } from "fs";
import { join } from "path";
import { z } from "zod";
import type { CatalogEntry } from "../types.js";
import { walkZodShape, crossCheckAxes } from "./walk-zod.js";
import { SCHEMA_REGISTRY } from "./schema-registry.js";

export interface ValidationError {
  id: string;
  field: string;
  message: string;
}

export function validateEntry(
  entry: Partial<CatalogEntry>,
  appsWebRoot: string
): ValidationError[] {
  const id = entry.id ?? "(unknown)";
  const errors: ValidationError[] = [];

  const fail = (field: string, message: string) => errors.push({ id, field, message });

  if (!entry.feels_like?.trim()) fail("feels_like", "must be non-empty");

  if (!entry.not_this_if || entry.not_this_if.length < 2)
    fail("not_this_if", "must have at least 2 entries");

  if (!entry.does_not_cover || entry.does_not_cover.length < 3)
    fail("does_not_cover", "must have at least 3 entries");

  if (!entry.covers || entry.covers.length < 1) fail("covers", "must have at least 1 entry");

  for (const cover of entry.covers ?? []) {
    const fullPath = join(appsWebRoot, cover.example);
    if (!existsSync(fullPath)) {
      fail(`covers[example=${cover.example}]`, `example file does not exist: ${fullPath}`);
    }
  }

  // Zod schema cross-check: verify every field listed in axes exists on the schema.
  if (entry.schema_ref && entry.axes) {
    const schema: z.ZodType | undefined = SCHEMA_REGISTRY[entry.schema_ref];
    if (!schema) {
      fail(
        "schema_ref",
        `"${entry.schema_ref}" is not in SCHEMA_REGISTRY — add it to src/generator/schema-registry.ts`
      );
    } else {
      try {
        const shapeFields = walkZodShape(schema);
        const axisErrors = crossCheckAxes(entry.axes, shapeFields);
        for (const msg of axisErrors) {
          fail("axes", msg);
        }
      } catch (err) {
        fail("schema_ref", `walkZodShape failed: ${String(err)}`);
      }
    }
  }

  return errors;
}
