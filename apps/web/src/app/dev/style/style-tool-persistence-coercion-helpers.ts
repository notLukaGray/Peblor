import { DEFAULT_BREAKPOINTS, type BreakpointDefinitions } from "@/app/theme/pb-breakpoint-tokens";
import { DEFAULT_MOTION_FOUNDATIONS, type MotionFoundations } from "@/app/theme/pb-motion-tokens";
import {
  DEFAULT_OPACITY_SCALE,
  OPACITY_SCALE_KEYS,
  clampUnitOpacity,
  type OpacityScale,
} from "@/app/theme/pb-opacity-tokens";
import type { SpacingScale } from "@/app/theme/pb-spacing-tokens";
import {
  DEFAULT_Z_INDEX_LAYERS,
  Z_INDEX_LAYER_KEYS,
  type ZIndexLayerScale,
} from "@/app/theme/pb-z-index-layers";
import { SPACING_SCALE_SEED_KEYS } from "@/app/dev/style/style-tool-persistence-types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function pickStringMap<T extends string>(
  keys: readonly T[],
  source: unknown,
  fallback: Record<T, string>
): Record<T, string> {
  const out = { ...fallback };
  if (!isRecord(source)) return out;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) out[key] = value.trim();
  }
  return out;
}

export function pickBoolLocks<T extends string>(
  keys: readonly T[],
  source: unknown
): Record<T, boolean> {
  const out = Object.fromEntries(keys.map((key) => [key, false])) as Record<T, boolean>;
  if (!isRecord(source)) return out;
  for (const key of keys) out[key] = source[key] === true;
  return out;
}

export function coerceOpacityScale(source: unknown): OpacityScale {
  const out: OpacityScale = { ...DEFAULT_OPACITY_SCALE };
  if (!isRecord(source)) return out;
  for (const key of OPACITY_SCALE_KEYS) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = clampUnitOpacity(value);
  }
  return out;
}

export function coerceZIndexLayers(source: unknown): ZIndexLayerScale {
  const out: ZIndexLayerScale = { ...DEFAULT_Z_INDEX_LAYERS };
  if (!isRecord(source)) return out;
  for (const key of Z_INDEX_LAYER_KEYS) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = Math.round(value);
  }
  return out;
}

export function toSpacingSeedScale(
  scale: SpacingScale
): Record<(typeof SPACING_SCALE_SEED_KEYS)[number], string> {
  return {
    xs: scale.xs,
    sm: scale.sm,
    md: scale.md,
    lg: scale.lg,
    xl: scale.xl,
    "2xl": scale["2xl"],
    "3xl": scale["3xl"],
    "4xl": scale["4xl"],
  };
}

export function toSpacingSeedLocks(
  locks: Record<keyof SpacingScale, boolean>
): Partial<Record<(typeof SPACING_SCALE_SEED_KEYS)[number], boolean>> {
  return {
    xs: locks.xs,
    sm: locks.sm,
    md: locks.md,
    lg: locks.lg,
    xl: locks.xl,
    "2xl": locks["2xl"],
    "3xl": locks["3xl"],
    "4xl": locks["4xl"],
  };
}

function coerceInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

export function coerceBreakpoints(source: unknown): BreakpointDefinitions {
  if (!isRecord(source)) return { ...DEFAULT_BREAKPOINTS };
  return {
    mobile: coerceInteger(source.mobile, DEFAULT_BREAKPOINTS.mobile),
    desktop: coerceInteger(source.desktop, DEFAULT_BREAKPOINTS.desktop),
  };
}

function pickFiniteNumber(source: unknown, key: string, fallback: number): number {
  if (!isRecord(source)) return fallback;
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pickString(source: unknown, key: string, fallback: string): string {
  if (!isRecord(source)) return fallback;
  const value = source[key];
  return typeof value === "string" ? value : fallback;
}

function coerceMotionDurations(source: unknown): MotionFoundations["durations"] {
  const defaults = DEFAULT_MOTION_FOUNDATIONS.durations;
  const data = isRecord(source) ? source : undefined;
  return {
    instant: pickFiniteNumber(data, "instant", defaults.instant),
    fast: pickFiniteNumber(data, "fast", defaults.fast),
    normal: pickFiniteNumber(data, "normal", defaults.normal),
    slow: pickFiniteNumber(data, "slow", defaults.slow),
    slower: pickFiniteNumber(data, "slower", defaults.slower),
  };
}

function coerceMotionEasings(source: unknown): MotionFoundations["easings"] {
  const defaults = DEFAULT_MOTION_FOUNDATIONS.easings;
  const data = isRecord(source) ? source : undefined;
  return {
    easeIn: pickString(data, "easeIn", defaults.easeIn),
    easeOut: pickString(data, "easeOut", defaults.easeOut),
    easeInOut: pickString(data, "easeInOut", defaults.easeInOut),
    spring: pickString(data, "spring", defaults.spring),
    bounce: pickString(data, "bounce", defaults.bounce),
    linear: pickString(data, "linear", defaults.linear),
  };
}

function coerceReduceMotionPolicy(source: unknown): MotionFoundations["reduceMotionPolicy"] {
  if (source === "disable-all" || source === "replace-with-fade" || source === "honor-system") {
    return source;
  }
  return DEFAULT_MOTION_FOUNDATIONS.reduceMotionPolicy;
}

export function coerceMotionFoundations(source: unknown): MotionFoundations {
  const data = isRecord(source) ? source : undefined;
  return {
    durations: coerceMotionDurations(data?.durations),
    easings: coerceMotionEasings(data?.easings),
    staggerStep: Math.max(
      0,
      pickFiniteNumber(data, "staggerStep", DEFAULT_MOTION_FOUNDATIONS.staggerStep)
    ),
    reduceMotionPolicy: coerceReduceMotionPolicy(data?.reduceMotionPolicy),
  };
}
