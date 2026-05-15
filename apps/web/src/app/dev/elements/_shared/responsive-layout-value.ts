import type {
  PbImageConstraintValues,
  PbResponsiveImageConstraints,
  PbResponsiveValue,
} from "@/app/theme/pb-builder-defaults";

export type PreviewDevice = "mobile" | "desktop";
export type ConstraintField = keyof PbImageConstraintValues;

export function isResponsiveTuple<T>(value: PbResponsiveValue<T> | undefined): value is [T, T] {
  return Array.isArray(value) && value.length === 2;
}

export function hasMobileOverride<T>(value: PbResponsiveValue<T> | undefined): boolean {
  return isResponsiveTuple(value);
}

export function resolveResponsiveValueForDevice<T>(
  value: PbResponsiveValue<T> | undefined,
  device: PreviewDevice
): T | undefined {
  if (value === undefined) return undefined;
  if (isResponsiveTuple(value)) return device === "mobile" ? value[0] : value[1];
  return value;
}

export function setDesktopResponsiveValue<T>(
  current: PbResponsiveValue<T> | undefined,
  desktopValue: T
): PbResponsiveValue<T> {
  if (isResponsiveTuple(current)) return [current[0], desktopValue];
  return desktopValue;
}

export function setMobileResponsiveValue<T>(
  current: PbResponsiveValue<T> | undefined,
  mobileValue: T,
  fallbackDesktop: T
): PbResponsiveValue<T> {
  if (isResponsiveTuple(current)) return [mobileValue, current[1]];
  return [mobileValue, current ?? fallbackDesktop];
}

export function toggleMobileOverride<T>(
  current: PbResponsiveValue<T> | undefined,
  enabled: boolean,
  fallbackValue: T
): PbResponsiveValue<T> | undefined {
  if (enabled) {
    if (isResponsiveTuple(current)) return current;
    const value = current ?? fallbackValue;
    return [value, value];
  }
  if (isResponsiveTuple(current)) return current[1];
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
    ...(isResponsiveTuple(constraints) ? constraints[1] : (constraints ?? {})),
    [field]: value,
  } as PbImageConstraintValues;
  if (isResponsiveTuple(constraints)) return [constraints[0], nextDesktop];
  return nextDesktop;
}

export function setMobileConstraintField(
  constraints: PbResponsiveImageConstraints | undefined,
  field: ConstraintField,
  value: string
): PbResponsiveImageConstraints {
  const desktop = isResponsiveTuple(constraints) ? constraints[1] : (constraints ?? {});
  const mobile = {
    ...(isResponsiveTuple(constraints) ? constraints[0] : desktop),
    [field]: value,
  } as PbImageConstraintValues;
  return [mobile, desktop];
}

export function toggleConstraintsMobileOverride(
  constraints: PbResponsiveImageConstraints | undefined,
  enabled: boolean
): PbResponsiveImageConstraints | undefined {
  if (enabled) {
    if (isResponsiveTuple(constraints)) return constraints;
    const base = normalizeConstraintObject(constraints);
    return [base, base];
  }
  if (!isResponsiveTuple(constraints)) return constraints;
  return normalizeConstraintObject(constraints[1]);
}
