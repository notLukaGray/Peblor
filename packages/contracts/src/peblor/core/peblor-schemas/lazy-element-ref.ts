/**
 * Shared lazy element block reference for use in element schema files that are
 * themselves imported by element-block-schemas.ts (creating a circular dependency).
 *
 * Usage pattern (B-4 / C-15):
 * 1. Leaf element schemas (tabs, drag, image-compare) import `lazyElementBlock` from
 *    this module instead of statically importing from element-block-schemas.ts.
 * 2. element-block-schemas.ts calls `registerElementSchema(elementBlockSchema)` after
 *    defining it, storing the reference in the module-level variable below.
 * 3. `lazyElementBlock` reads that reference at parse time (via z.lazy) — by which
 *    point element-block-schemas.ts has been initialised regardless of import order.
 *
 * Why not a static import? element-block-schemas.ts imports the leaf schemas at module
 * init time. If a leaf schema statically imports back from element-block-schemas.ts, Node
 * returns a partially-initialised module (circular ESM dep) and `const` bindings are
 * still in TDZ, causing ReferenceError.
 */
import { z, type ZodTypeAny } from "zod";

let _elementSchema: ZodTypeAny | null = null;

/**
 * Called by element-block-schemas.ts immediately after `elementBlockSchema` is defined.
 * Idempotent — safe to call multiple times (e.g. after vi.resetModules in tests).
 */
export function registerElementSchema(schema: ZodTypeAny): void {
  _elementSchema = schema;
}

/**
 * A lazy reference to the full elementBlockSchema discriminated union.
 * Safe to import from any file — resolved at parse time, not at module init time.
 */
export const lazyElementBlock: z.ZodType<unknown> = z.lazy(() => {
  if (!_elementSchema) {
    // This should only happen if element-block-schemas.ts was never imported.
    // In normal usage (production or tests that import via element-block-schemas),
    // registerElementSchema() will have been called before any safeParse().
    throw new Error(
      "[peblor/contracts] lazyElementBlock used before element-block-schemas.ts was loaded. " +
        "Import element-block-schemas directly (or any file that transitively imports it) " +
        "before calling safeParse() on schemas that contain nested elements."
    );
  }
  return _elementSchema;
});
