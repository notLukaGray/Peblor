/**
 * Responsive layout values: single value = both breakpoints, [mobile, desktop] = override per breakpoint.
 * Convention: array is always [mobile, desktop].
 */

export type ResponsiveValue<T> = T | [T, T];

/**
 * Resolves a responsive value to the value for the current breakpoint.
 * Single value applies to both; two-element array is [mobile, desktop].
 */
export function resolveResponsiveValue<T>(
  value: ResponsiveValue<T> | undefined,
  isMobile: boolean
): T | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return isMobile ? value[0] : value[1];
  return value;
}
