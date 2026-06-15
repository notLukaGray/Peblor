import type {
  PbImageConstraintValues,
  PbResponsiveImageConstraints,
  PbResponsiveValue,
} from "@/app/theme/pb-builder-defaults";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";

export type PreviewDevice = "mobile" | "desktop";
export type ConstraintField = keyof PbImageConstraintValues;

/** Check whether `value` is a responsive tier map (has tier keys like base/md). */
export function isResponsiveTierMap<T>(
  value: PbResponsiveValue<T> | undefined
): value is { base?: T; md?: T } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return BREAKPOINT_TIER_NAMES.some((tier) => tier in (value as Record<string, unknown>));
}

export function hasMobileOverride<T>(value: PbResponsiveValue<T> | undefined): boolean {
  return isResponsiveTierMap(value);
}

export function resolveResponsiveValueForDevice<T>(
  value: PbResponsiveValue<T> | undefined,
  device: PreviewDevice
): T | undefined {
  // Delegates to the canonical resolver so every shape (scalar, tier map, container map)
  // collapses to a single value for this device's representative width.
  return resolveResponsiveValue(value, device === "mobile");
}

export function setDesktopResponsiveValue<T>(
  current: PbResponsiveValue<T> | undefined,
  desktopValue: T
): PbResponsiveValue<T> {
  if (isResponsiveTierMap(current)) return { base: current.base, md: desktopValue };
  return desktopValue;
}

export function setMobileResponsiveValue<T>(
  current: PbResponsiveValue<T> | undefined,
  mobileValue: T,
  fallbackDesktop: T
): PbResponsiveValue<T> {
  if (isResponsiveTierMap(current)) return { base: mobileValue, md: current.md ?? fallbackDesktop };
  return {
    base: mobileValue,
    md: resolveResponsiveValueForDevice(current, "desktop") ?? fallbackDesktop,
  };
}

export function toggleMobileOverride<T>(
  current: PbResponsiveValue<T> | undefined,
  enabled: boolean,
  fallbackValue: T
): PbResponsiveValue<T> | undefined {
  if (enabled) {
    if (isResponsiveTierMap(current)) return current;
    const value = resolveResponsiveValueForDevice(current, "desktop") ?? fallbackValue;
    return { base: value, md: value };
  }
  if (isResponsiveTierMap(current)) return current.md;
  return current;
}

function normalizeConstraintObject(
  value: PbImageConstraintValues | undefined
): PbImageConstraintValues | undefined {
  if (!value) return undefined;
  const next: PbImageConstraintValues = {};
  if (typeof value.minWidth === "string") next.minWidth = value.minWidth;
  if (typeof value.maxWidth === "string") next.maxWidth = value.maxWidth;
  if (typeof value.minHeight === "string") next.minHeight = value.minHeight;
  if (typeof value.maxHeight === "string") next.maxHeight = value.maxHeight;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function resolveConstraintsForDevice(
  constraints: PbResponsiveImageConstraints | undefined,
  device: PreviewDevice
): PbImageConstraintValues | undefined {
  return normalizeConstraintObject(resolveResponsiveValueForDevice(constraints, device));
}

export function setDesktopConstraintField(
  constraints: PbResponsiveImageConstraints | undefined,
  field: ConstraintField,
  value: string
): PbResponsiveImageConstraints {
  const nextDesktop = {
    ...(isResponsiveTierMap(constraints)
      ? constraints.md
      : (resolveResponsiveValueForDevice(constraints, "desktop") ?? {})),
    [field]: value,
  } as PbImageConstraintValues;
  if (isResponsiveTierMap(constraints)) return { base: constraints.base, md: nextDesktop };
  return nextDesktop;
}

export function setMobileConstraintField(
  constraints: PbResponsiveImageConstraints | undefined,
  field: ConstraintField,
  value: string
): PbResponsiveImageConstraints {
  const desktop = isResponsiveTierMap(constraints)
    ? constraints.md
    : (resolveResponsiveValueForDevice(constraints, "desktop") ?? {});
  const mobile = {
    ...(isResponsiveTierMap(constraints) ? constraints.base : desktop),
    [field]: value,
  } as PbImageConstraintValues;
  return { base: mobile, md: desktop };
}

export function toggleConstraintsMobileOverride(
  constraints: PbResponsiveImageConstraints | undefined,
  enabled: boolean
): PbResponsiveImageConstraints | undefined {
  if (enabled) {
    if (isResponsiveTierMap(constraints)) return constraints;
    const base = resolveConstraintsForDevice(constraints, "desktop");
    return { base, md: base };
  }
  if (!isResponsiveTierMap(constraints)) return constraints;
  return normalizeConstraintObject(constraints.md);
}
