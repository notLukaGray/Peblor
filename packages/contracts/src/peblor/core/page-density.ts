export const PAGE_DENSITY_LEVELS = ["comfortable", "balanced", "compact"] as const;

export type PageDensity = (typeof PAGE_DENSITY_LEVELS)[number];

type DensityMultipliers = {
  space: number;
  radius: number;
};

const PAGE_DENSITY_MULTIPLIERS: Record<PageDensity, DensityMultipliers> = {
  comfortable: { space: 1.14, radius: 1.08 },
  balanced: { space: 1, radius: 1 },
  compact: { space: 0.88, radius: 0.92 },
};

function normalizeDensity(density: string | null | undefined): PageDensity {
  if (density === "comfortable" || density === "compact" || density === "balanced") {
    return density;
  }
  return "balanced";
}

export function getPageDensityMultipliers(density: string | null | undefined): DensityMultipliers {
  return PAGE_DENSITY_MULTIPLIERS[normalizeDensity(density)];
}

export function buildPageDensityCssVars(
  density: string | null | undefined
): Record<string, string> {
  const multipliers = getPageDensityMultipliers(density);
  return {
    "--pb-density-space-multiplier": String(multipliers.space),
    "--pb-density-radius-multiplier": String(multipliers.radius),
  };
}

function isDensityScalableLength(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(calc|min|max|clamp|var)\(.+\)$/i.test(trimmed)) return true;
  return /^-?\d*\.?\d+(px|rem|em|vh|vw|%|ch|ex|cm|mm|in|pt|pc)?$/i.test(trimmed);
}

/** Wraps a length in a density-aware calc() expression for spacing tokens. */
export function scaleSpaceForDensity(value: string): string {
  return isDensityScalableLength(value)
    ? `calc((${value}) * var(--pb-density-space-multiplier, 1))`
    : value;
}

/**
 * Scales spacing shorthands (e.g. padding/margin with 1-4 tokens) per token when possible.
 * Falls back to single-value scaling for non-shorthand or complex expressions.
 */
export function scaleSpaceShorthandForDensity(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const isSimpleShorthand =
    parts.length >= 2 && parts.length <= 4 && parts.every((part) => isDensityScalableLength(part));
  if (!isSimpleShorthand) return scaleSpaceForDensity(value);
  return parts.map((part) => scaleSpaceForDensity(part)).join(" ");
}

/** Wraps a length in a density-aware calc() expression for radius tokens. */
export function scaleRadiusForDensity(value: string): string {
  return isDensityScalableLength(value)
    ? `calc((${value}) * var(--pb-density-radius-multiplier, 1))`
    : value;
}
