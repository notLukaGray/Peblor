import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

/**
 * Shared utility: resolves responsive values in any accepted shape — array tuple
 * `[mobile, desktop]`, legacy object `{ mobile, desktop }`, breakpoint tier map
 * `{ base?, sm?, md?, … }`, or `{ "@container": … }` — to a single value based
 * on the current breakpoint.
 *
 * Delegates to `resolveResponsiveValue` so all shapes are handled uniformly.
 * Passes scalar (non-responsive) values through unchanged.
 *
 * Used by server-built and client-side column rendering (sectionColumn) to resolve
 * responsive props like columns, columnGaps, and elementOrder.
 */
export function resolveResponsiveUnknown(value: unknown, isMobile: boolean): unknown {
  return resolveResponsiveValue(value as Parameters<typeof resolveResponsiveValue>[0], isMobile);
}
