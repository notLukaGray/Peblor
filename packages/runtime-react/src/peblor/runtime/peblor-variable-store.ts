/**
 * Runtime variable store for peblor setVariable / conditionalAction.
 * Zustand singleton with subscribeWithSelector middleware.
 * Cleared on route change — no persistence middleware by design.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { JsonValue } from "@pb/contracts/types";
import { resolveVariablePath } from "@pb/contracts/peblor/core/peblor-condition-evaluator";

// ---------------------------------------------------------------------------
// Dev-only action log store
// ---------------------------------------------------------------------------

interface ActionLogEntry {
  id: number;
  type: string;
  payload: unknown;
  timestamp: number;
  source?: string;
}

interface ActionLogStore {
  entries: ActionLogEntry[];
  push: (entry: Omit<ActionLogEntry, "id">) => void;
  clear: () => void;
}

export const useActionLogStore = create<ActionLogStore>()((set) => ({
  entries: [],
  push: (entry) =>
    set((state) => ({
      entries: [{ ...entry, id: state.entries.length }, ...state.entries].slice(0, 50),
    })),
  clear: () => set({ entries: [] }),
}));

// ---------------------------------------------------------------------------
// Dev-only mutation log store
// ---------------------------------------------------------------------------

export interface MutationLogEntry {
  id: number;
  timestamp: number;
  key: string;
  from: JsonValue | undefined;
  to: JsonValue | undefined;
}

interface MutationLogStore {
  entries: MutationLogEntry[];
  push: (entry: Omit<MutationLogEntry, "id">) => void;
  clear: () => void;
}

export const useMutationLogStore = create<MutationLogStore>()((set) => ({
  entries: [],
  push: (entry) =>
    set((state) => ({
      entries: [{ ...entry, id: state.entries.length }, ...state.entries].slice(0, 100),
    })),
  clear: () => set({ entries: [] }),
}));

function setNestedPath(
  root: Record<string, JsonValue>,
  path: string,
  value: JsonValue
): Record<string, JsonValue> {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return root;
  if (parts.length === 1) return { ...root, [parts[0]!]: value };
  const [head, ...tail] = parts as [string, ...string[]];
  const existing = root[head];
  const parent: Record<string, JsonValue> =
    existing != null && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, JsonValue>)
      : {};
  return { ...root, [head]: setNestedPath(parent, tail.join("."), value) };
}

interface VariableStore {
  variables: Record<string, JsonValue>;
  setVariable: (key: string, value: JsonValue) => void;
  setVariablePath: (path: string, value: JsonValue) => void;
  appendToArray: (key: string, value: JsonValue) => void;
  removeFromArray: (
    key: string,
    options: { index?: number; where?: { path: string; test: (v: JsonValue) => boolean } }
  ) => void;
  mergeVariable: (key: string, value: Record<string, JsonValue>) => void;
  deleteVariable: (key: string) => void;
  clearVariables: () => void;
}

// The Zustand store — React components can subscribe via useVariableStore or useVariable.
export const useVariableStore = create<VariableStore>()(
  subscribeWithSelector((set) => ({
    variables: {},
    setVariable: (key: string, value: JsonValue) =>
      set((state) => ({ variables: { ...state.variables, [key]: value } })),
    setVariablePath: (path: string, value: JsonValue) =>
      set((state) => ({ variables: setNestedPath(state.variables, path, value) })),
    appendToArray: (key: string, value: JsonValue) =>
      set((state) => {
        const existing = state.variables[key];
        const arr = Array.isArray(existing) ? existing : [];
        return { variables: { ...state.variables, [key]: [...arr, value] } };
      }),
    removeFromArray: (
      key: string,
      options: { index?: number; where?: { path: string; test: (v: JsonValue) => boolean } }
    ) =>
      set((state) => {
        const existing = state.variables[key];
        if (!Array.isArray(existing)) return state;
        let next: JsonValue[];
        if (options.index != null) {
          next = existing.filter((_, i) => i !== options.index);
        } else if (options.where) {
          const { path, test } = options.where;
          next = existing.filter((item) => {
            const v = resolveVariablePath({ _: item }, `_.${path}`);
            return !test(v ?? null);
          });
        } else {
          next = existing;
        }
        return { variables: { ...state.variables, [key]: next } };
      }),
    mergeVariable: (key: string, value: Record<string, JsonValue>) =>
      set((state) => {
        const existing = state.variables[key];
        const base =
          existing != null && typeof existing === "object" && !Array.isArray(existing)
            ? (existing as Record<string, JsonValue>)
            : {};
        return { variables: { ...state.variables, [key]: { ...base, ...value } } };
      }),
    deleteVariable: (key: string) =>
      set((state) => {
        const { [key]: _, ...rest } = state.variables;
        return { variables: rest };
      }),
    clearVariables: () => set({ variables: {} }),
  }))
);

// React hook: subscribes to a single variable by key.
// Re-renders only when that key's value changes.
export function useVariable(key: string): JsonValue | undefined {
  return useVariableStore((state) => state.variables[key]);
}

// Imperative API — backward-compatible with the previous Map-based implementation.
// Safe to call outside React (event handlers, action runners, etc.).
export const setVariable = (key: string, value: JsonValue): void =>
  useVariableStore.getState().setVariable(key, value);

export const setVariablePath = (path: string, value: JsonValue): void =>
  useVariableStore.getState().setVariablePath(path, value);

export const appendToArray = (key: string, value: JsonValue): void =>
  useVariableStore.getState().appendToArray(key, value);

export const removeFromArray = (
  key: string,
  options: { index?: number; where?: { path: string; test: (v: JsonValue) => boolean } }
): void => useVariableStore.getState().removeFromArray(key, options);

export const mergeVariable = (key: string, value: Record<string, JsonValue>): void =>
  useVariableStore.getState().mergeVariable(key, value);

export const deleteVariable = (key: string): void =>
  useVariableStore.getState().deleteVariable(key);

export const getVariable = (key: string): JsonValue | undefined =>
  useVariableStore.getState().variables[key];

export const hasVariable = (key: string): boolean => key in useVariableStore.getState().variables;

export const clearVariables = (): void => useVariableStore.getState().clearVariables();

// ---------------------------------------------------------------------------
// Dev-only subscription: diff variable store changes into the mutation log
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "development") {
  useVariableStore.subscribe(
    (state) => state.variables,
    (newVars, prevVars) => {
      const timestamp = Date.now();
      const allKeys = new Set([...Object.keys(newVars), ...Object.keys(prevVars)]);
      for (const key of allKeys) {
        if (!Object.is(newVars[key], prevVars[key])) {
          useMutationLogStore.getState().push({
            timestamp,
            key,
            from: prevVars[key],
            to: newVars[key],
          });
        }
      }
    }
  );
}
