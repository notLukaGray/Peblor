"use client";

import { useEffect, useRef } from "react";
import type { TriggerAction } from "@pb/contracts/types";
import type {
  ConditionOperator,
  VariableCondition,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import {
  evaluateConditions,
  resolveVariablePath,
} from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { firePeblorAction } from "./trigger-event";
import { useVariableStore } from "@/peblor/runtime/peblor-variable-store";
import type { JsonValue } from "@pb/contracts/types";

export type VariableTriggerDef = {
  variable: string;
  operator?: ConditionOperator;
  value?: JsonValue;
  conditions?: Array<VariableCondition>;
  logic?: "and" | "or";
  action: TriggerAction;
  fireOnMount?: boolean;
};

export function useVariableTrigger(defs: VariableTriggerDef[]): void {
  const prevVariablesRef = useRef<Record<string, JsonValue>>({});

  useEffect(() => {
    prevVariablesRef.current = useVariableStore.getState().variables;

    for (const def of defs) {
      if (!def.fireOnMount) continue;
      const vars = useVariableStore.getState().variables;
      if (evaluateConditions(def, vars)) {
        firePeblorAction(def.action, "trigger", {
          variable: def.variable,
          previousValue: undefined,
          currentValue: resolveVariablePath(vars, def.variable),
        });
      }
    }

    const unsubscribe = useVariableStore.subscribe(
      (state) => state.variables,
      (variables) => {
        const previous = prevVariablesRef.current;
        prevVariablesRef.current = variables;

        for (const def of defs) {
          const prevValue = resolveVariablePath(previous, def.variable);
          const nextValue = resolveVariablePath(variables, def.variable);
          if (Object.is(prevValue, nextValue)) continue;
          if (!evaluateConditions(def, variables)) continue;

          firePeblorAction(def.action, "trigger", {
            variable: def.variable,
            previousValue: prevValue,
            currentValue: nextValue,
          });
        }
      }
    );

    return unsubscribe;
  }, [defs]);
}
