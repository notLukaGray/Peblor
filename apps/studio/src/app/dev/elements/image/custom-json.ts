export type CustomJsonMode = "patch" | "replace";

export function parseVariantJson(input: string): { value?: unknown; error?: string } {
  try {
    const value = JSON.parse(input) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { error: "JSON must be an object." };
    }
    return { value };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON.";
    return { error: message };
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function arraysDeepEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!deepEqual(a[i], b[i])) return false;
  }
  return true;
}

function objectsDeepEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return arraysDeepEqual(a, b);
  if (isPlainObject(a) && isPlainObject(b)) return objectsDeepEqual(a, b);
  return false;
}

function diffObject(base: unknown, next: unknown): unknown {
  if (deepEqual(base, next)) return undefined;
  if (isPlainObject(base) && isPlainObject(next)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(next)) {
      const diff = diffObject(base[key], next[key]);
      if (diff !== undefined) out[key] = diff;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return next;
}

export function createVariantDiff<T>(base: T, next: T): Record<string, unknown> {
  const diff = diffObject(base, next);
  return isPlainObject(diff) ? diff : {};
}
