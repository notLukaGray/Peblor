/** Named font slots available in peblor JSON content. */
export type FontSlotName = "primary" | "secondary" | "mono";

const SLOT_VARS: Record<FontSlotName, string> = {
  primary: "var(--font-primary)",
  secondary: "var(--font-secondary)",
  mono: "var(--font-mono-face)",
};

/**
 * Resolves a `fontFamily` value from peblor element JSON to a CSS
 * `font-family` string.
 *
 * Named slots (`"primary"`, `"secondary"`, `"mono"`) resolve to the
 * corresponding CSS custom property so the active typeface is always
 * respected regardless of source (local or webfont).
 *
 * Any other string is passed through as-is, allowing raw CSS values
 * (e.g. `"Georgia, serif"`) as an escape hatch.
 *
 * @example
 * // In element JSON:
 * { "type": "elementBody", "text": "Hello", "fontFamily": "secondary" }
 */
export function resolveFontFamily(fontFamily: string | undefined): string | undefined {
  if (!fontFamily) return undefined;
  return SLOT_VARS[fontFamily as FontSlotName] ?? fontFamily;
}
