/**
 * Canonical responsive breakpoint tiers — the single source of truth for the
 * multi-tier responsive system. Tier names and their `min-width` thresholds are
 * shared by the Zod responsive-value schema (contracts), the CSS-emission engine
 * (runtime-react), and the CSS custom-property generation (apps/web).
 *
 * Mobile-first: a tier applies at `min-width` and up; missing tiers cascade from
 * the nearest smaller defined tier. `base` (0) always applies.
 *
 * Backward compatibility: legacy `[mobile, desktop]` tuples and `{ mobile, desktop }`
 * objects map onto `base` and `DESKTOP_TIER_NAME` (md / 768px), so existing content
 * renders identically — below 768 picks the mobile value, 768+ picks the desktop value.
 */

export const BREAKPOINT_TIER_NAMES = ["base", "sm", "md", "lg", "xl", "2xl"] as const;

export type BreakpointTierName = (typeof BREAKPOINT_TIER_NAMES)[number];

/** Minimum viewport width (px) at which each tier becomes active. */
export const BREAKPOINT_TIER_MIN_PX = {
  base: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const satisfies Record<BreakpointTierName, number>;

/**
 * The tier whose boundary separates "mobile" from "desktop" for legacy 2-tier
 * values and for the `isMobile` flag. Historically the single desktop breakpoint
 * was 768px, which is exactly `md` — so legacy behaviour is preserved.
 */
export const DESKTOP_TIER_NAME = "md" satisfies BreakpointTierName;

/** Tiers above `base`, in ascending order — the ones that emit `@media`/`@container` overrides. */
export const BREAKPOINT_OVERRIDE_TIERS: readonly Exclude<BreakpointTierName, "base">[] = [
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
];

export function isBreakpointTierName(value: string): value is BreakpointTierName {
  return (BREAKPOINT_TIER_NAMES as readonly string[]).includes(value);
}

/** CSS custom-property name carrying a tier's min-width, e.g. `--pb-breakpoint-md`. */
export function breakpointTierCssVar(name: BreakpointTierName): string {
  return `--pb-breakpoint-${name}`;
}

/** Record of every tier's CSS custom property → `"<px>px"`, for theme-level emission. */
export function breakpointTiersToCssVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const name of BREAKPOINT_TIER_NAMES) {
    vars[breakpointTierCssVar(name)] = `${BREAKPOINT_TIER_MIN_PX[name]}px`;
  }
  return vars;
}
