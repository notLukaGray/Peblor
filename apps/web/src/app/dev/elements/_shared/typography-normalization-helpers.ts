import {
  getWorkbenchSession,
  type WorkbenchElementKey,
} from "@/app/dev/workbench/workbench-session";
import { OVERFLOW_OPTIONS } from "@/app/dev/elements/_shared/dev-controls/foundation-constants";
import { clampNumber } from "@/app/dev/elements/image/utils";
import { isThemeStringObject, type ThemeStringLike } from "@/app/dev/elements/_shared/theme-string";

type PersistedTypographyShape = {
  defaultVariant: string;
  variants: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isPersistedTypographyShape(value: unknown): value is PersistedTypographyShape {
  if (!isRecord(value)) return false;
  if (!isRecord(value.variants)) return false;
  return typeof value.defaultVariant === "string";
}

function readFromLegacyStorage(storageKey: string): unknown {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

export function readElementPersistedPayload(
  elementKey: WorkbenchElementKey,
  storageKey: string
): unknown {
  const sessionSlice = getWorkbenchSession().elements?.[elementKey];
  if (sessionSlice != null && isRecord(sessionSlice)) return sessionSlice;
  return readFromLegacyStorage(storageKey);
}

export function readTypographyPersistedPayload(
  elementKey: WorkbenchElementKey,
  storageKey: string
): PersistedTypographyShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readElementPersistedPayload(elementKey, storageKey);
    return isPersistedTypographyShape(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function normalizeTypographyVariants<K extends string, V>(
  variantOrder: readonly K[],
  baseVariants: Record<K, V>,
  incoming: Record<string, unknown>,
  normalizeVariant: (seed: V, incoming?: Partial<V>) => V
): Record<K, V> {
  const next = { ...baseVariants };
  for (const key of variantOrder) {
    next[key] = normalizeVariant(baseVariants[key], incoming[key] as Partial<V> | undefined);
  }
  return next;
}

export function resolveTypographyDefaultVariant<K extends string>(
  variantOrder: readonly K[],
  incomingDefault: string,
  fallback: K
): K {
  return variantOrder.includes(incomingDefault as K) ? (incomingDefault as K) : fallback;
}

export function pickString<T extends ThemeStringLike | undefined>(
  incoming: unknown,
  fallback: T
): T {
  if (typeof incoming === "string" || isThemeStringObject(incoming)) {
    return incoming as T;
  }
  return fallback;
}

export function pickBoolean<T extends boolean | undefined>(incoming: unknown, fallback: T): T {
  return (typeof incoming === "boolean" ? incoming : fallback) as T;
}

export function pickFiniteNumber<T extends number | undefined>(incoming: unknown, fallback: T): T {
  return (typeof incoming === "number" && Number.isFinite(incoming) ? incoming : fallback) as T;
}

export function pickUnitOpacity(
  incoming: unknown,
  fallback: number | undefined
): number | undefined {
  return typeof incoming === "number" && Number.isFinite(incoming)
    ? clampNumber(incoming, 0, 1)
    : fallback;
}

export function pickOverflowValue<T extends string | undefined>(incoming: unknown, fallback: T): T {
  const options = OVERFLOW_OPTIONS as readonly string[];
  return (typeof incoming === "string" && options.includes(incoming) ? incoming : fallback) as T;
}
