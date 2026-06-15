/**
 * Returns the same reference as `value` when its JSON-serializable content
 * has not changed.
 *
 * This is useful for stabilizing props that are created as new array/object
 * literals on every render by a parent component. Without this, downstream
 * hooks that list the value in their dependency array would tear down and
 * recreate their effects on every parent render.
 *
 * The comparison uses JSON.stringify with sorted object keys so that
 * semantically equal objects with different key ordering produce the same
 * cache key. Without sorting, values whose key order varies per render would
 * trigger a render-phase update on every frame ("too many re-renders").
 */
import { useState } from "react";

/** JSON.stringify with sorted object keys for stable serialization. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      return Object.keys(v)
        .sort()
        .reduce(
          (sorted, k) => {
            (sorted as Record<string, unknown>)[k] = (v as Record<string, unknown>)[k];
            return sorted;
          },
          {} as Record<string, unknown>
        );
    }
    return v;
  });
}

export function useStableValue<T>(value: T): T {
  type Entry = { value: T; key: string };
  const [state, setState] = useState<Entry>(() => {
    let key: string;
    try {
      key = stableStringify(value);
    } catch {
      key = "";
    }
    return { value, key };
  });

  let key: string;
  try {
    key = stableStringify(value);
  } catch {
    // Non-serializable value (e.g. circular reference, DOM node) —
    // cannot compare, always return the incoming value as-is.
    return value;
  }

  if (key !== state.key) {
    // Value content changed — schedule a state update so the next render
    // returns a stable reference. React 18+ processes setState during render
    // synchronously, so the consumer sees the new value in the same frame.
    setState({ value, key });
    return value;
  }

  return state.value;
}
