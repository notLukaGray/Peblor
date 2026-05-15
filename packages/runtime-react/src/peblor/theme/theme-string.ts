import type { ThemeString } from "@pb/contracts/types";

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

export function resolveThemeString(
  value: ThemeString | undefined,
  mode: PeblorThemeMode
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;

  const active = nonEmpty(value[mode]);
  if (active) return active;

  const fallback = nonEmpty(value.value);
  if (fallback) return fallback;

  const opposite = mode === "dark" ? nonEmpty(value.light) : nonEmpty(value.dark);
  return opposite;
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
