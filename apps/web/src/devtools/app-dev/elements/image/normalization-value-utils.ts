import type {
  PbImageAnimationCurve,
  PbImageConstraintValues,
  PbResponsiveImageConstraints,
  PbResponsiveValue,
} from "@/app/theme/pb-builder-defaults";
import { CURVE_PRESET_OPTIONS } from "@/app/dev/elements/image/constants";

export function normalizeBezierTuple(
  value: unknown,
  fallback: [number, number, number, number]
): [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) return fallback;
  return value.map((entry, index) => {
    const parsed = Number(entry);
    return Number.isFinite(parsed) ? parsed : fallback[index];
  }) as [number, number, number, number];
}

export function normalizeCurve(
  seed: PbImageAnimationCurve,
  incoming?: Partial<PbImageAnimationCurve>
): PbImageAnimationCurve {
  const preset =
    incoming?.preset && CURVE_PRESET_OPTIONS.includes(incoming.preset)
      ? incoming.preset
      : seed.preset;
  return {
    preset,
    customBezier: normalizeBezierTuple(incoming?.customBezier, seed.customBezier),
  };
}

function normalizeResponsivePair<T>(
  incoming: unknown,
  isValid: (value: unknown) => value is T
): [T, T] | undefined {
  if (!Array.isArray(incoming) || incoming.length !== 2) return undefined;
  if (!isValid(incoming[0]) || !isValid(incoming[1])) return undefined;
  return [incoming[0], incoming[1]];
}

export function normalizeResponsiveValue<T>(
  seed: PbResponsiveValue<T> | undefined,
  incoming: unknown,
  isValid: (value: unknown) => value is T
): PbResponsiveValue<T> | undefined {
  const tuple = normalizeResponsivePair(incoming, isValid);
  if (tuple) return tuple;
  if (isValid(incoming)) return incoming;
  return seed;
}

export function isConstraintObject(value: unknown): value is PbImageConstraintValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const validValue = (entry: unknown) => entry == null || typeof entry === "string";
  return (
    validValue(record.minWidth) &&
    validValue(record.maxWidth) &&
    validValue(record.minHeight) &&
    validValue(record.maxHeight)
  );
}

export function normalizeConstraints(
  seed: PbResponsiveImageConstraints | undefined,
  incoming: unknown
): PbResponsiveImageConstraints | undefined {
  const tuple = normalizeResponsivePair(
    incoming,
    (entry): entry is PbImageConstraintValues | undefined =>
      entry === undefined || isConstraintObject(entry)
  );
  if (tuple) return tuple;
  if (incoming === undefined || isConstraintObject(incoming)) {
    return incoming as PbImageConstraintValues | undefined;
  }
  return seed;
}

export function asString(value: unknown): value is string {
  return typeof value === "string";
}

export function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNonNegativeNumber(value: unknown, fallback: number): number {
  return Math.max(0, toFiniteNumber(value, fallback));
}
