import { useEffect } from "react";
import type { JsonValue } from "@pb/contracts";
import { getVariable, setVariable, useVariableStore } from "@pb/runtime-react/dev-core";
import { parseLooseValue } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";

export function useImagePreviewVisibleWhenSync(runtimeDraft: ImageRuntimeDraft) {
  useEffect(() => {
    const key = runtimeDraft.visibleWhenVariable.trim();
    if (!runtimeDraft.visibleWhenEnabled || !key) return;
    const previous = getVariable(key);
    const next = parseLooseValue(runtimeDraft.visibleWhenPreviewValue) as JsonValue;
    setVariable(key, next);
    return () => {
      if (previous !== undefined) {
        setVariable(key, previous);
        return;
      }
      useVariableStore.setState((state) => {
        const variables = { ...state.variables };
        delete variables[key];
        return { variables };
      });
    };
  }, [
    runtimeDraft.visibleWhenEnabled,
    runtimeDraft.visibleWhenPreviewValue,
    runtimeDraft.visibleWhenVariable,
  ]);
}
