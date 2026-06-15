import { z } from "zod";

/**
 * Builds a strict-object tier map with the canonical tier keys.
 *
 * @param inner  The inner value schema for each tier.
 * @param acceptNull  When `true`, treats JSON `null` the same as absent
 *   (via `z.preprocess`), so CMS-sourced data with explicit nulls validates.
 * @returns A `z.strictObject` tier map refined to require at least one tier.
 */
function createTierMap<T extends z.ZodTypeAny>(inner: T, acceptNull: boolean) {
  const wrap = acceptNull
    ? (x: T) => z.preprocess((v) => (v === null ? undefined : v), x.optional())
    : (x: T) => x.optional();

  return z
    .strictObject({
      base: wrap(inner),
      sm: wrap(inner),
      md: wrap(inner),
      lg: wrap(inner),
      xl: wrap(inner),
      "2xl": wrap(inner),
    })
    .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
      message: "Tier map must define at least one tier (base/sm/md/lg/xl/2xl).",
    });
}

/**
 * Multi-tier responsive value schema factory.
 *
 * Wraps an inner scalar schema (size, string, enum, …) so a property can be expressed
 * as a tier map (mobile-first viewport tiers) or a container query tier map:
 *
 *   1. scalar                                         — one value for all widths
 *   2. `{ base?, sm?, md?, lg?, xl?, "2xl"? }`        — named viewport tiers (mobile-first)
 *   3. `{ "@container": { base?, sm?, … } }`           — same tiers, resolved against the
 *                                                       nearest container instead of the viewport
 */
export function responsiveValueSchema<T extends z.ZodTypeAny>(inner: T) {
  const tierMap = createTierMap(inner, false);

  const containerMap = z.strictObject({
    "@container": tierMap,
  });

  return z.union([inner, tierMap, containerMap]);
}

/**
 * Creates a strict tier-map object schema for responsive values that may come from
 * JSON serialization (where `null` is equivalent to absent).
 * Uses `z.strictObject` so `{ mobile, desktop }` objects cannot accidentally match.
 * At least one tier must be defined.
 *
 * This is the JSON-null-tolerant variant — use wherever column-layout data (or other
 * CMS-sourced responsive values) may contain explicit `null`.
 */
export function tierMapSchema<T extends z.ZodTypeAny>(inner: T) {
  return createTierMap(inner, true);
}

/** Inferred TS type for a responsive value wrapping `T`. */
export type ResponsiveValueOf<T> =
  | T
  | { base?: T; sm?: T; md?: T; lg?: T; xl?: T; "2xl"?: T }
  | { "@container": { base?: T; sm?: T; md?: T; lg?: T; xl?: T; "2xl"?: T } };
