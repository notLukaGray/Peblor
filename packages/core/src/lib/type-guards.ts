/**
 * Lightweight type guards with zero server dependencies.
 * Safe to import from client bundles — no `fs`, no `@pb/contracts`, no internal modules.
 */

/** Type guard that narrows `unknown` to `Record<string, unknown>`. Returns false for null, non-objects, and arrays. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Returns a structured clone of `value` if it is a plain record, or null otherwise. */
export function toRecordClone(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return structuredClone(value) as Record<string, unknown>;
}
