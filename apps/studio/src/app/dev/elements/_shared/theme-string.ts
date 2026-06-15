export type ThemeStringObject = {
  value?: string;
  light?: string;
  dark?: string;
};

export type ThemeStringLike = string | ThemeStringObject;

export function isThemeStringObject(value: unknown): value is ThemeStringObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as ThemeStringObject;
  const slots = [candidate.value, candidate.light, candidate.dark];
  const hasAny = slots.some((slot) => slot != null);
  const allStringsOrMissing = slots.every((slot) => slot == null || typeof slot === "string");
  return hasAny && allStringsOrMissing;
}

export function themeStringToInputValue(value: ThemeStringLike | unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const candidate = value as ThemeStringObject;
  // Structured gradient objects (type: "linear"|"radial"|"conic") are not editable
  // as a plain string — return empty so the input shows blank.
  if (!("value" in candidate || "light" in candidate || "dark" in candidate)) return "";
  return candidate.value ?? candidate.light ?? candidate.dark ?? "";
}
