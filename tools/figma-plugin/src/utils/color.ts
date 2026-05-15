/**
 * Figma RGBA → CSS color string utilities.
 * Figma represents color channels as 0–1 floats.
 */

function toHexByte(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");
}

/**
 * Converts Figma 0–1 RGB(A) floats to a CSS hex color string.
 * Returns `#rrggbbaa` when alpha is < 1, `#rrggbb` otherwise.
 */
export function figmaRgbToHex(r: number, g: number, b: number, a?: number): string {
  const hex = `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
  if (a !== undefined && a < 1) {
    return `${hex}${toHexByte(a)}`;
  }
  return hex;
}

/**
 * Converts a Figma `SolidPaint` to a CSS color string.
 * Returns `null` for non-solid paint types (gradients, images, etc.).
 */
export function figmaPaintToCSS(paint: Paint): string | null {
  if (paint.type !== "SOLID") return null;
  const { r, g, b } = paint.color;
  const a = paint.opacity ?? 1;
  return figmaRgbToHex(r, g, b, a < 1 ? a : undefined);
}
