/**
 * Pure utility functions for ThemeString resolution — framework-agnostic.
 *
 * These functions detect ThemeString objects ({ value?, light?, dark? }) and
 * convert them to CSS `light-dark()` function calls at build time, eliminating
 * the need for client-side theme resolution for color values.
 *
 * **CANONICAL LOCATION.** There are duplicate copies of the lowering logic in:
 * - packages/core/src/internal/element-layout-utils/layout-style.ts (GRADIENT_RE, lowerThemeStringToCss)
 * - packages/runtime-react/src/peblor/theme/theme-string.ts
 * TODO: Consolidate those copies to import from here.
 *
 * The runtime-react package's `theme-string.ts` re-exports for backward compat.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a raw ThemeString object before resolution. */
export type ThemeStringObject = { value?: string; light?: string; dark?: string };

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Check whether `value` is a ThemeString object — i.e. a plain object whose
 * keys are exclusively members of the set {"value", "light", "dark"} and
 * that has at least one of those keys present.
 *
 * This is a structural check, not a schema parse, so it is safe to use on
 * arbitrary untyped JSON (e.g. a Record<string, unknown> node during the
 * pre-compile walk).
 */
export function isThemeStringObject(value: unknown): value is ThemeStringObject {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => key === "value" || key === "light" || key === "dark") &&
    keys.some((key) => key === "value" || key === "light" || key === "dark")
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isGradient(v: string): boolean {
  return (
    v.startsWith("linear-gradient") ||
    v.startsWith("radial-gradient") ||
    v.startsWith("conic-gradient") ||
    v.startsWith("repeating-linear-gradient") ||
    v.startsWith("repeating-radial-gradient") ||
    v.startsWith("repeating-conic-gradient")
  );
}

// ---------------------------------------------------------------------------
// Lowering — convert ThemeString → CSS light-dark()
// ---------------------------------------------------------------------------

/**
 * Convert a ThemeString value to a CSS value using the `light-dark()` function.
 *
 * | Input                        | Output                         |
 * |------------------------------|--------------------------------|
 * | `{#fff}` (plain string)      | `#fff`                         |
 * | `{ light: "#fff" }`          | `#fff`                         |
 * | `{ dark: "#000" }`           | `#000`                         |
 * | `{ value: "#888" }`          | `#888`                         |
 * | `{ light: "#fff", dark: "#000" }` | `light-dark(#fff, #000)` |
 * | `{ light: "#fff", dark: "#fff" }` | `#fff`                  |
 * | `undefined`                  | `undefined`                    |
 *
 * Gradient strings are excluded (they are not valid <color> values for the
 * CSS `light-dark()` function). When either side is a gradient, the dark
 * value is returned as a safe fallback (matching the site's dark-by-default
 * design).
 */
export function lowerThemeStringToCss(
  value: string | ThemeStringObject | undefined
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;

  const val = nonEmpty(value.value);
  // Use `value` as a fallback for each mode-specific field. This handles the
  // common pattern `{ value: "#111", dark: "#eee" }` where `value` is the
  // light-mode default and `dark` is an explicit dark-mode override.
  const light = nonEmpty(value.light) ?? val;
  const dark = nonEmpty(value.dark) ?? val;

  // Both light and dark present and different → light-dark()
  if (light != null && dark != null && light !== dark) {
    // light-dark() only accepts <color> values — gradient strings are not colors
    // and browsers silently drop the declaration. Fall back to dark value.
    if (isGradient(light) || isGradient(dark)) return dark;
    return `light-dark(${light}, ${dark})`;
  }

  // Single value or both identical: prefer explicit value field, then light, then dark
  return val ?? light ?? dark;
}

/**
 * Deep-recursively walk a value tree and convert every ThemeString object
 * found to a CSS `light-dark()` string. Handles nested objects and arrays.
 *
 * Returns the original reference if nothing changed; a new tree otherwise.
 */
export function lowerThemeValueDeep(value: unknown): unknown {
  if (isThemeStringObject(value)) return lowerThemeStringToCss(value);
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const resolved = lowerThemeValueDeep(item);
      if (resolved !== item) changed = true;
      return resolved;
    });
    return changed ? out : value;
  }
  if (value == null || typeof value !== "object") return value;

  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const resolved = lowerThemeValueDeep(child);
    out[key] = resolved;
    if (resolved !== child) changed = true;
  }
  return changed ? out : value;
}

/**
 * Convert ThemeString values in a flat style record (e.g. `wrapperStyle`).
 * Only resolves top-level values — does NOT recurse into nested objects
 * (use `lowerThemeValueDeep` for that).
 */
export function lowerThemeStyleObject<T extends Record<string, unknown> | undefined>(style: T): T {
  if (!style) return style;
  let changed = false;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style)) {
    const resolved = isThemeStringObject(value) ? lowerThemeStringToCss(value) : value;
    out[key] = resolved;
    if (resolved !== value) changed = true;
  }

  return (changed ? out : style) as T;
}
