/**
 * Runtime variable store for peblor setVariable / conditionalAction.
 * Zustand singleton with subscribeWithSelector middleware.
 * Cleared on route change — no persistence middleware by design.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { JsonValue } from "@pb/contracts/types";

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

interface VariableStore {
  variables: Record<string, JsonValue>;
  setVariable: (key: string, value: JsonValue) => void;
  clearVariables: () => void;
}

// The Zustand store — React components can subscribe via useVariableStore or useVariable.
export const useVariableStore = create<VariableStore>()(
  subscribeWithSelector((set) => ({
    variables: {},
    setVariable: (key: string, value: JsonValue) =>
      set((state) => ({ variables: { ...state.variables, [key]: value } })),
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

export const getVariable = (key: string): JsonValue | undefined =>
  useVariableStore.getState().variables[key];

export const hasVariable = (key: string): boolean => key in useVariableStore.getState().variables;

export const clearVariables = (): void => useVariableStore.getState().clearVariables();
