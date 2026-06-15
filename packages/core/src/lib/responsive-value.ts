/**
 * Responsive layout value resolution.
 * All responsive values use canonical tier maps `{ base, sm, md, lg, xl, "2xl" }`
 * or `{ "@container": { base, sm, … } }` for container-relative values.
 * Scalars pass through unchanged.
 */

import {
  BREAKPOINT_TIER_MIN_PX,
  BREAKPOINT_TIER_NAMES,
  DESKTOP_TIER_NAME,
} from "@pb/contracts/peblor/core/breakpoint-tiers";
import type { BreakpointTierName } from "@pb/contracts/peblor/core/breakpoint-tiers";

/**
 * Named-tier map: a Tailwind-style mobile-first breakpoint map.
 * At least one tier key must be present.
 *
 * JS resolution collapses the full tier map to a single value based on a
 * representative width per isMobile state:
 *   - isMobile true  → representative tier = base (width 0)
 *   - isMobile false → representative tier = md  (width 768 = DESKTOP_TIER_NAME)
 *
 * Cascade rule: resolve to the value of the largest DEFINED tier whose
 * min-width ≤ representative width, or undefined if none qualifies.
 *
 * NOTE: Tiers above md (lg / xl / 2xl) never affect JS resolution — they are
 * only relevant for CSS @media emission. Full per-tier fidelity is handled
 * by the CSS-emission layer (responsive-style.ts).
 *
 * DESIGN INTENT: JS-side resolution intentionally stays 2-tier (isMobile vs
 * !isMobile) because the runtime uses this for non-style logic (JavaScript
 * behavior branches: which variant to render, which data to fetch, etc.).
 * True multi-tier responsiveness is exclusively a CSS concern — the style
 * emission engine in runtime-react emits breakpoint-prefixed CSS rules that
 * the browser resolves natively. Keeping JS resolution at 2 tiers avoids
 * duplicating the browser's own responsive cascade logic in JavaScript and
 * keeps SSR simple: the server only needs a single boolean (isMobile) to
 * produce a correct initial render.
 */
export type BreakpointTierMap<T> = { [K in BreakpointTierName]?: T };

/**
 * Container-query tier map: the same tier shape, but resolved against the nearest
 * container instead of the viewport. CSS emission turns this into `@container` rules;
 * JS resolution can't know the container width, so it collapses the inner tier map at
 * the same representative width used for viewport tiers (best-effort SSR/non-style value).
 */
export type ContainerTierMap<T> = { "@container": BreakpointTierMap<T> };

/** Representative min-width (px) used for JS resolution of each isMobile state. */
const MOBILE_REPRESENTATIVE_PX = 0;
const DESKTOP_REPRESENTATIVE_PX = BREAKPOINT_TIER_MIN_PX[DESKTOP_TIER_NAME];

/**
 * Resolves a breakpoint tier map to the value active at the given representative
 * width, using a mobile-first cascade.
 */
function resolveTierMap<T>(map: BreakpointTierMap<T>, representativePx: number): T | undefined {
  let result: T | undefined = undefined;
  let bestPx = -1;

  for (const tier of BREAKPOINT_TIER_NAMES) {
    const tierPx = BREAKPOINT_TIER_MIN_PX[tier];
    if (tierPx <= representativePx && tier in map) {
      if (tierPx > bestPx) {
        bestPx = tierPx;
        result = (map as Record<string, T | undefined>)[tier];
      }
    }
  }

  return result;
}

/**
 * Returns true when `value` is a plain object that has at least one tier key.
 */
function isTierMap<T>(value: object): value is BreakpointTierMap<T> {
  for (const tier of BREAKPOINT_TIER_NAMES) {
    if (tier in value) return true;
  }
  return false;
}

/**
 * Resolves a responsive value to the value for the current breakpoint.
 *
 * Accepted shapes:
 *   - scalar T → passthrough (same value for both breakpoints)
 *   - { base?, sm?, md?, lg?, xl?, "2xl"? } tier map → mobile-first cascade
 *     resolved at a representative width (0 for mobile, 768 for desktop).
 *     Tiers above md (lg/xl/2xl) are ignored in JS resolution; they only affect
 *     CSS @media emission.
 *   - { "@container": { base?, … } } container map → same cascade on the inner tier
 *     map (best-effort; true per-container fidelity comes from CSS @container rules).
 */
export function resolveResponsiveValue<T>(
  value: T | BreakpointTierMap<T> | ContainerTierMap<T> | undefined,
  isMobile: boolean
): T | undefined {
  if (value === undefined) return undefined;

  if (typeof value === "object" && value !== null) {
    const representativePx = isMobile ? MOBILE_REPRESENTATIVE_PX : DESKTOP_REPRESENTATIVE_PX;

    // Container map { "@container": { base?, … } } — collapse the inner tier map.
    if ("@container" in value) {
      return resolveTierMap((value as ContainerTierMap<T>)["@container"], representativePx);
    }

    // Named-tier map { base?, sm?, md?, lg?, xl?, "2xl"? }
    if (isTierMap<T>(value)) {
      return resolveTierMap(value as BreakpointTierMap<T>, representativePx);
    }
  }

  return value as T;
}
