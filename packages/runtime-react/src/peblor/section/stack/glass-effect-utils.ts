/**
 * Shared utility functions for the glass effect system.
 * Kept separate so SectionGlassEffect.tsx stays under 250 LOC.
 */

export type GlassDimensions = {
  width: number;
  height: number;
  radius: number;
  cornerRadii: GlassCornerRadii;
};

export type GlassCornerRadii = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

/** Keeps bezel / displacement math inside the drawable frame (short fixed-height + huge rem). */
const GLASS_PHYSICS_RADIUS_EPSILON_PX = 0.5;

/**
 * Single-radius glass maps must not exceed ~half the shorter box edge or the filter folds.
 * CSS may still author `2rem` on a 44px-tall pill; the **used** radius is usually smaller, but
 * some reads still overshoot — clamp here for stable physics.
 */
export function clampGlassPhysicsRadiusPx(
  width: number,
  height: number,
  radiusPx: number,
  epsilonPx = GLASS_PHYSICS_RADIUS_EPSILON_PX
): number {
  if (!Number.isFinite(radiusPx) || radiusPx <= 0) return radiusPx;
  const safeW = Math.max(width, 2);
  const safeH = Math.max(height, 2);
  const cap = Math.min(safeW, safeH) / 2 - epsilonPx;
  if (!Number.isFinite(cap) || cap <= 0) return radiusPx;
  return Math.min(radiusPx, cap);
}

export function uniformGlassCornerRadii(radius: number): GlassCornerRadii {
  return {
    topLeft: radius,
    topRight: radius,
    bottomRight: radius,
    bottomLeft: radius,
  };
}

export function maxGlassCornerRadiusPx(radii: GlassCornerRadii): number {
  return Math.max(radii.topLeft, radii.topRight, radii.bottomRight, radii.bottomLeft);
}

export function clampGlassPhysicsCornerRadiiPx(
  width: number,
  height: number,
  radii: GlassCornerRadii,
  epsilonPx = GLASS_PHYSICS_RADIUS_EPSILON_PX
): GlassCornerRadii {
  const safeW = Math.max(width - epsilonPx * 2, 1);
  const safeH = Math.max(height - epsilonPx * 2, 1);
  const positive = {
    topLeft: Math.max(radii.topLeft, 0),
    topRight: Math.max(radii.topRight, 0),
    bottomRight: Math.max(radii.bottomRight, 0),
    bottomLeft: Math.max(radii.bottomLeft, 0),
  };
  const top = positive.topLeft + positive.topRight;
  const right = positive.topRight + positive.bottomRight;
  const bottom = positive.bottomLeft + positive.bottomRight;
  const left = positive.topLeft + positive.bottomLeft;
  const scale = Math.min(
    1,
    top > 0 ? safeW / top : 1,
    right > 0 ? safeH / right : 1,
    bottom > 0 ? safeW / bottom : 1,
    left > 0 ? safeH / left : 1
  );
  const cap = Math.min(Math.max(width, 2), Math.max(height, 2)) / 2 - epsilonPx;
  const clampCorner = (radius: number) =>
    clampGlassPhysicsRadiusPx(width, height, radius * scale, epsilonPx);
  if (!Number.isFinite(cap) || cap <= 0) return positive;
  return {
    topLeft: clampCorner(positive.topLeft),
    topRight: clampCorner(positive.topRight),
    bottomRight: clampCorner(positive.bottomRight),
    bottomLeft: clampCorner(positive.bottomLeft),
  };
}

export function withGlassPhysicsClamped(d: GlassDimensions): GlassDimensions {
  const cornerRadii = clampGlassPhysicsCornerRadiiPx(d.width, d.height, d.cornerRadii);
  return {
    ...d,
    cornerRadii,
    radius: maxGlassCornerRadiusPx(cornerRadii),
  };
}

export function parsePx(value: string | number | undefined, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseLength(
  value: string | number | undefined,
  basis: number,
  fallback: number
): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fallback;
    if (value >= 0 && value <= 1) return value * basis;
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (trimmed.endsWith("%")) {
      const pct = parseFloat(trimmed.slice(0, -1));
      return Number.isFinite(pct) ? (pct / 100) * basis : fallback;
    }
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Mobile fallback helper: when blur is authored as normalized 0..1, keep a minimum floor.
 * Example: 0 -> 0.15, 1 -> 1, values >1 (px-like magnitudes) are preserved.
 */
export function liftNormalizedBlur(value: number, floor = 0.15): number {
  if (!Number.isFinite(value) || value <= 0) return floor;
  if (value >= 1) return value;
  const clampedFloor = clamp(floor, 0, 0.99);
  return clampedFloor + value * (1 - clampedFloor);
}

type MobileBlurPxOptions = {
  floor?: number;
  minPx?: number;
  maxPx?: number;
  logStrength?: number;
  referenceBlur?: number;
  curveExponent?: number;
  maxPxCap?: number;
};

/**
 * Converts authored blur to mobile fallback px using a logarithmic response:
 * low end stays subtle, high values compress instead of exploding.
 */
export function blurToMobileFallbackPx(
  value: number,
  {
    floor = 0.05,
    minPx = 3,
    maxPx = 18,
    logStrength = 3,
    referenceBlur = 4,
    curveExponent = 1,
    maxPxCap = maxPx,
  }: MobileBlurPxOptions = {}
): number {
  if (!Number.isFinite(value)) return Math.round(minPx);
  const safeFloor = clamp(floor, 0, Math.max(referenceBlur, 0.001));
  const safeReference = Math.max(referenceBlur, safeFloor + 0.001);
  const safeStrength = Math.max(logStrength, 0.01);
  const clamped = Math.max(value, safeFloor);
  const numerator = Math.log1p(safeStrength * clamped);
  const denominator = Math.log1p(safeStrength * safeReference);
  const t = clamp(denominator > 0 ? numerator / denominator : 0, 0, 1);
  const easedT = Math.pow(t, Math.max(curveExponent, 0.01));
  const px = minPx + (maxPx - minPx) * easedT;
  return Math.round(Math.min(px, maxPxCap));
}

export function normalizeBezelType(
  value: string | undefined
): "convex_circle" | "convex_squircle" | "concave" | "lip" {
  if (value === "convex_circle") return "convex_circle";
  if (value === "concave") return "concave";
  if (value === "lip") return "lip";
  return "convex_squircle";
}

function parseComputedCornerRadiusPx(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    const a = parsePx(tokens[0], 0);
    const b = parsePx(tokens[1], 0);
    return a > 0 && b > 0 ? Math.min(a, b) : Math.max(a, b, fallback);
  }
  return parsePx(value, fallback);
}

function readComputedCornerRadii(style: CSSStyleDeclaration, fallback?: GlassCornerRadii) {
  return {
    topLeft: parseComputedCornerRadiusPx(style.borderTopLeftRadius, fallback?.topLeft ?? 0),
    topRight: parseComputedCornerRadiusPx(style.borderTopRightRadius, fallback?.topRight ?? 0),
    bottomRight: parseComputedCornerRadiusPx(
      style.borderBottomRightRadius,
      fallback?.bottomRight ?? 0
    ),
    bottomLeft: parseComputedCornerRadiusPx(
      style.borderBottomLeftRadius,
      fallback?.bottomLeft ?? 0
    ),
  };
}

/**
 * Read size + corner radius from an element that already has the intended `border-radius`
 * applied (e.g. glass overlay synced to a host's authored radius). Uses the overlay's used
 * corner radii. When the engine returns two lengths for an elliptical corner, uses `min`
 * so the scalar filter math stays consistent with the tighter curve.
 */
export function readGlassOverlaySyncedDimensions(
  host: HTMLElement,
  overlay: HTMLElement
): GlassDimensions {
  const hostDims = readElementDimensions(host);
  const w = overlay.clientWidth;
  const h = overlay.clientHeight;
  const style = window.getComputedStyle(overlay);
  const cornerRadii = readComputedCornerRadii(style, hostDims.cornerRadii);
  const radius = maxGlassCornerRadiusPx(cornerRadii);
  return {
    width: Math.max(Math.round(w > 0 ? w : hostDims.width), 2),
    height: Math.max(Math.round(h > 0 ? h : hostDims.height), 2),
    radius: radius > 0 ? radius : hostDims.radius,
    cornerRadii:
      radius > 0
        ? cornerRadii
        : {
            ...hostDims.cornerRadii,
          },
  };
}

export function readElementDimensions(el: HTMLElement): GlassDimensions {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const cornerRadii = readComputedCornerRadii(style);
  const radius = maxGlassCornerRadiusPx(cornerRadii);
  // Use layout-space dimensions (client/offset/computed) so parent transforms
  // (e.g. Motion scale) don't inflate filter sizes and cause glass misalignment.
  const computedWidth = parsePx(style.width);
  const computedHeight = parsePx(style.height);
  const widthSource =
    (typeof computedWidth === "number" && computedWidth > 0 ? computedWidth : undefined) ??
    (el.clientWidth > 0 ? el.clientWidth : undefined) ??
    (el.offsetWidth > 0 ? el.offsetWidth : undefined) ??
    rect.width;
  const heightSource =
    (typeof computedHeight === "number" && computedHeight > 0 ? computedHeight : undefined) ??
    (el.clientHeight > 0 ? el.clientHeight : undefined) ??
    (el.offsetHeight > 0 ? el.offsetHeight : undefined) ??
    rect.height;
  return {
    width: Math.round(widthSource),
    height: Math.round(heightSource),
    radius,
    cornerRadii,
  };
}
