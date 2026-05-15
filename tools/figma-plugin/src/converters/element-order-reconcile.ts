/**
 * Deterministic merge of `elementOrder` with `definitions` so valid definitions
 * are never omitted solely due to stale or partial order arrays.
 */

export function reconcileElementOrderWithDefinitions(
  elementOrder: string[],
  definitions: Record<string, unknown>
): string[] {
  const definitionKeys = Object.keys(definitions);
  const orderedFromJson = elementOrder.filter((key) => key in definitions);
  const orderedSet = new Set(orderedFromJson);
  return [...orderedFromJson, ...definitionKeys.filter((key) => !orderedSet.has(key))];
}
