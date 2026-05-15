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

export function themeStringToInputValue(value: ThemeStringLike | undefined): string {
  if (typeof value === "string") return value;
  if (!value) return "";
  return value.value ?? value.light ?? value.dark ?? "";
}
