/**
 * Shared helpers for serializing JSON-sourced style objects into CSS text that is
 * injected via a scoped `<style>` tag (pseudo-state styles, responsive `@media` /
 * `@container` rules). Centralised so the sanitization that prevents `<style>` /
 * rule breakout lives in exactly one place.
 */

import { toKebabCase } from "@pb/core/css-keyframe-utils";
export { toKebabCase };

/**
 * Clamp a numeric value between min and max (inclusive).
 * Canonical location for this utility within the runtime-react package.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Restrict a CSS property name to a safe charset. Legitimate CSS property names
 * (including custom properties like `--foo`) only contain ASCII letters and hyphens,
 * so anything else is dropped. Returns "" if nothing safe remains — callers then drop
 * the declaration entirely.
 */
export function sanitizeCssProp(prop: string): string {
  return prop.replace(/[^a-zA-Z0-9-]/g, "");
}

/**
 * Strip characters that could break out of the scoped rule block or the enclosing
 * `<style>` element. Legitimate CSS declaration values never contain `< > { }`, so
 * removing them is behaviour-preserving — functions, units, commas, parens, %, #hex,
 * and spaces all survive untouched.
 */
export function sanitizeCssValue(value: string | number): string {
  return String(value).replace(/[<>{}]/g, "");
}

/**
 * Minimal deterministic string hash (djb2 variant). Same output on server and client —
 * pure arithmetic, no crypto APIs — so SSR and hydration agree on generated class names.
 */
export function hashCssString(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0; // djb2 step
  }
  return hash.toString(36);
}

/** Sanitize an arbitrary string into a safe CSS class-name suffix. */
export function sanitizeForClassName(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
}
