export type ParseCssContext = {
  rootFontSizePx: number;
  viewportWidth: number;
  viewportHeight: number;
  isVertical: boolean;
};

export function getDefaultParseCssContext(isVertical: boolean): ParseCssContext | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  try {
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      rootFontSizePx: Number.isFinite(fs) ? fs : 16,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      isVertical,
    };
  } catch {
    return null;
  }
}

export function normalizeCssValue(input: string): string {
  return input.trim();
}

export function parseNumericWithUnit(value: string): { num: number; unit: string } | null {
  const match = value.match(/^([\d.]+)(px|vh|vw|rem|em|%)$/);
  if (!match || match[1] == null || match[2] == null) return null;
  const num = parseFloat(match[1]);
  return Number.isFinite(num) ? { num, unit: match[2] } : null;
}

export function convertToPixels(
  parsed: { num: number; unit: string },
  ctx: ParseCssContext | null
): number | null {
  const { num, unit } = parsed;
  if (unit === "px") return num;
  if (unit === "%") return null;
  if (!ctx) return null;
  if (unit === "vh" && ctx.isVertical) return (num / 100) * ctx.viewportHeight;
  if (unit === "vw" && !ctx.isVertical) return (num / 100) * ctx.viewportWidth;
  if (unit === "rem" || unit === "em") return num * ctx.rootFontSizePx;
  return null;
}

export function parseCssValueToPixels(
  value: number | string | undefined,
  isVertical: boolean
): number | null {
  if (value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = normalizeCssValue(value);
  const parsed = parseNumericWithUnit(normalized);
  if (!parsed) return null;
  const ctx = getDefaultParseCssContext(isVertical);
  return convertToPixels(parsed, ctx);
}
