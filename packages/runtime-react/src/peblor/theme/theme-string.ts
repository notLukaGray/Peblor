/**
 * ThemeString resolution for the React runtime.
 *
 * NOTE: this is a DUPLICATE of the canonical logic in:
 *   packages/core/src/internal/theme-utils.ts
 *
 * TODO: Consolidate this file to re-export from the canonical location
 * instead of maintaining a separate copy.
 */

import type { ThemeString } from "@pb/contracts/types";
import type {
  StructuredGradient,
  GradientStop,
} from "@pb/contracts/peblor/core/peblor-schemas/schema-shared-primitives";

export type PeblorThemeMode = "light" | "dark";
export type { ThemeString };

export function isThemeStringObject(value: unknown): value is Exclude<ThemeString, string> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => key === "value" || key === "light" || key === "dark") &&
    keys.some((key) => key === "value" || key === "light" || key === "dark")
  );
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function resolveThemeStringForMode(
  value: Exclude<ThemeString, string>,
  mode: PeblorThemeMode
): string | undefined {
  const active = nonEmpty(value[mode]);
  if (active) return active;

  const fallback = nonEmpty(value.value);
  if (fallback) return fallback;

  const opposite = mode === "dark" ? nonEmpty(value.light) : nonEmpty(value.dark);
  return opposite;
}

export function isGradient(v: string): boolean {
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
// Structured gradient → CSS string compilation
// ---------------------------------------------------------------------------

function compileGradientStop(stop: GradientStop, mode: PeblorThemeMode): string {
  const color = resolveThemeString(stop.color, mode) ?? "transparent";
  const parts: string[] = [color];
  if (stop.hint != null) parts.push(stop.hint);
  if (stop.position != null) parts.push(stop.position);
  return parts.join(" ");
}

function compileGradientStopCss(stop: GradientStop): string {
  const color = lowerThemeStringToCss(stop.color) ?? "transparent";
  const parts: string[] = [color];
  if (stop.hint != null) parts.push(stop.hint);
  if (stop.position != null) parts.push(stop.position);
  return parts.join(" ");
}

/**
 * Compile a StructuredGradient to a CSS gradient string, resolving each stop's
 * color against the given theme mode.
 */
export function compileStructuredGradient(
  gradient: StructuredGradient,
  mode: PeblorThemeMode
): string {
  const stops = gradient.stops.map((s) => compileGradientStop(s, mode)).join(", ");
  const fn = gradient.repeat ? `repeating-${gradient.type}-gradient` : `${gradient.type}-gradient`;

  if (gradient.type === "linear") {
    const args = gradient.angle ? `${gradient.angle}, ${stops}` : stops;
    return `${fn}(${args})`;
  }
  if (gradient.type === "radial") {
    const shapeParts: string[] = [];
    if (gradient.shape) shapeParts.push(gradient.shape);
    if (gradient.size) shapeParts.push(gradient.size);
    if (gradient.at) shapeParts.push(`at ${gradient.at}`);
    const args = shapeParts.length ? `${shapeParts.join(" ")}, ${stops}` : stops;
    return `${fn}(${args})`;
  }
  // conic
  const conicParts: string[] = [];
  if (gradient.angle) conicParts.push(`from ${gradient.angle}`);
  if (gradient.at) conicParts.push(`at ${gradient.at}`);
  const args = conicParts.length ? `${conicParts.join(" ")}, ${stops}` : stops;
  return `${fn}(${args})`;
}

/**
 * CSS-native variant: emits `light-dark()` inside each stop's color when the stop
 * color differs between modes. The gradient itself has a single CSS string output;
 * per-stop light-dark() is supported by browsers via color-scheme.
 */
export function compileStructuredGradientCss(gradient: StructuredGradient): string {
  const stops = gradient.stops.map((s) => compileGradientStopCss(s)).join(", ");
  const fn = gradient.repeat ? `repeating-${gradient.type}-gradient` : `${gradient.type}-gradient`;

  if (gradient.type === "linear") {
    const args = gradient.angle ? `${gradient.angle}, ${stops}` : stops;
    return `${fn}(${args})`;
  }
  if (gradient.type === "radial") {
    const shapeParts: string[] = [];
    if (gradient.shape) shapeParts.push(gradient.shape);
    if (gradient.size) shapeParts.push(gradient.size);
    if (gradient.at) shapeParts.push(`at ${gradient.at}`);
    const args = shapeParts.length ? `${shapeParts.join(" ")}, ${stops}` : stops;
    return `${fn}(${args})`;
  }
  // conic
  const conicParts: string[] = [];
  if (gradient.angle) conicParts.push(`from ${gradient.angle}`);
  if (gradient.at) conicParts.push(`at ${gradient.at}`);
  const args = conicParts.length ? `${conicParts.join(" ")}, ${stops}` : stops;
  return `${fn}(${args})`;
}

function isStructuredGradient(value: unknown): value is StructuredGradient {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const t = (value as Record<string, unknown>).type;
  return t === "linear" || t === "radial" || t === "conic";
}

export function lowerThemeStringToCss(value: ThemeString | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;

  const light = resolveThemeStringForMode(value, "light");
  const dark = resolveThemeStringForMode(value, "dark");

  if (light == null) return dark;
  if (dark == null || dark === light) return light;

  // light-dark() only accepts <color> values — gradient strings are not colors and
  // browsers silently drop the declaration. Fall back to dark value (this site is
  // dark-by-default) and skip the light-dark() wrapper. This only affects legacy raw
  // CSS gradient strings passed through `themeStringSchema`. For structured gradients
  // (the canonical path via `themeStringOrGradientSchema`), `compileStructuredGradientCss`
  // handles per-stop light-dark() correctly — use that instead.
  if (isGradient(light) || isGradient(dark)) return dark;

  return `light-dark(${light}, ${dark})`;
}

export function resolveThemeString(
  value: ThemeString | undefined,
  mode: PeblorThemeMode
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return resolveThemeStringForMode(value, mode);
}

export function resolveThemeStyleValue(
  value: ThemeString | number | undefined,
  mode: PeblorThemeMode
): string | number | undefined {
  if (value == null || typeof value === "number") return value;
  return resolveThemeString(value, mode);
}

export function resolveThemeStyleObject<T extends Record<string, unknown> | undefined>(
  style: T,
  mode: PeblorThemeMode
): T {
  if (!style) return style;
  let changed = false;
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style)) {
    const resolved = isThemeStringObject(value)
      ? resolveThemeString(value as ThemeString, mode)
      : value;
    out[key] = resolved;
    if (resolved !== value) changed = true;
  }

  return (changed ? out : style) as T;
}

export function resolveThemeValueDeep(value: unknown, mode: PeblorThemeMode): unknown {
  if (isThemeStringObject(value)) return resolveThemeString(value, mode);
  if (Array.isArray(value)) return value.map((item) => resolveThemeValueDeep(item, mode));
  if (value == null || typeof value !== "object") return value;

  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const resolved = resolveThemeValueDeep(child, mode);
    out[key] = resolved;
    if (resolved !== child) changed = true;
  }
  return changed ? out : value;
}

/**
 * CSS-native variant of resolveThemeValueDeep.
 * Emits `light-dark(light, dark)` instead of baking one mode's value.
 * Use in server components — the browser resolves the correct variant via color-scheme.
 */
export function lowerThemeValueDeep(value: unknown): unknown {
  if (isThemeStringObject(value)) return lowerThemeStringToCss(value);
  if (Array.isArray(value)) return value.map((item) => lowerThemeValueDeep(item));
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
 * CSS-native variant of resolveThemeStyleObject.
 * Emits `light-dark(light, dark)` instead of baking one mode's value.
 * Use in server components — the browser resolves the correct variant via color-scheme.
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

// ---------------------------------------------------------------------------
// ThemeStringOrGradient — resolvers that handle the structured gradient union
// ---------------------------------------------------------------------------

/**
 * Resolve a ThemeStringOrGradient value to a CSS string for a specific theme mode.
 * If the value is a structured gradient, compiles it to a CSS gradient() string.
 */
export function resolveThemeStringOrGradient(
  value:
    | import("@pb/contracts/peblor/core/peblor-schemas/schema-shared-primitives").ThemeStringOrGradient
    | undefined,
  mode: PeblorThemeMode
): string | undefined {
  if (value == null) return undefined;
  if (isStructuredGradient(value)) return compileStructuredGradient(value, mode);
  return resolveThemeString(value as ThemeString, mode);
}

/**
 * CSS-native variant of resolveThemeStringOrGradient.
 * Emits `light-dark(light, dark)` for theme-string values; compiles structured
 * gradients with per-stop light-dark() color resolution.
 */
export function lowerThemeStringOrGradientToCss(
  value:
    | import("@pb/contracts/peblor/core/peblor-schemas/schema-shared-primitives").ThemeStringOrGradient
    | undefined
): string | undefined {
  if (value == null) return undefined;
  if (isStructuredGradient(value)) return compileStructuredGradientCss(value);
  return lowerThemeStringToCss(value as ThemeString);
}
