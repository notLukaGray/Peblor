"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  collectConditionVariableRoots,
  resolveVariablePath,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import type { JsonValue } from "@pb/contracts/types";
import { useVariableStore } from "@/peblor/runtime/peblor-variable-store";

/**
 * Subscribes to the Zustand variable store for the root keys used by `visibleWhen`
 * conditions and live binding paths. Returns the relevant variable slice.
 *
 * This is the single source of truth for visibleWhen variable subscription.
 * Section components use this directly; element components consume it via
 * useLiveVariableBindings → useElementVisibility.
 */
export function useVisibleWhenVariables(visibleWhen: unknown): Record<string, JsonValue> {
  const conditionKeys = useMemo((): string[] => {
    if (!visibleWhen) return [];
    return [...collectConditionVariableRoots(visibleWhen)];
  }, [visibleWhen]);

  return useVariableStore(
    useShallow(
      (state) =>
        Object.fromEntries(conditionKeys.map((k) => [k, state.variables[k]])) as Record<
          string,
          JsonValue
        >
    )
  );
}

/**
 * Subscribes to the Zustand variable store for the root keys used by `visibleWhen`
 * conditions and live binding paths. Returns the relevant variable slice.
 */
function useConditionAndBindingVariables(
  visibleWhen: unknown,
  bindings: Record<string, string> | null
): Record<string, JsonValue> {
  const conditionKeys = useMemo((): string[] => {
    const keys = new Set<string>();
    if (visibleWhen) {
      for (const k of collectConditionVariableRoots(visibleWhen)) keys.add(k);
    }
    if (bindings) {
      for (const varPath of Object.values(bindings)) keys.add(varPath.split(".")[0]!);
    }
    return [...keys];
  }, [visibleWhen, bindings]);

  return useVariableStore(
    useShallow(
      (state) =>
        Object.fromEntries(conditionKeys.map((k) => [k, state.variables[k]])) as Record<
          string,
          JsonValue
        >
    )
  );
}

type UseLiveVariableBindingsResult = {
  /** Variables from the Zustand store relevant to this element's visibleWhen + bindings. */
  variables: Record<string, JsonValue>;
  /** Override props for the element: field -> resolved variable value, or null if no bindings apply. */
  boundProps: Record<string, JsonValue> | null;
};

/**
 * Resolves live variable bindings for an element block.
 *
 * Given a `bindings` map (element field name -> variable path in the store), subscribes
 * to the relevant variable store keys and produces an override object with resolved values.
 *
 * Also returns the raw variables for use by `visibleWhen` evaluation.
 */
export function useLiveVariableBindings(
  visibleWhen: unknown,
  bindings: Record<string, string> | null
): UseLiveVariableBindingsResult {
  const variables = useConditionAndBindingVariables(visibleWhen, bindings);

  const boundProps = useMemo(() => {
    if (!bindings) return null;
    const overrides: Record<string, JsonValue> = {};
    for (const [field, varPath] of Object.entries(bindings)) {
      const val = resolveVariablePath(variables, varPath);
      if (val !== undefined) overrides[field] = val;
    }
    return Object.keys(overrides).length > 0 ? overrides : null;
  }, [bindings, variables]);

  return { variables, boundProps };
}
