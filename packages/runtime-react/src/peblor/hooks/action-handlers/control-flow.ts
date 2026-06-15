import type { ActionHandler, ActionHandlerMap, PeblorAction } from "./types";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";
import { evaluateConditions } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { useVariableStore } from "@/peblor/runtime/peblor-variable-store";

const handleFireMultiple: ActionHandler = (payload, { waitForUnsubscribes }) => {
  const {
    actions,
    mode = "parallel",
    delayBetween = 0,
    breakIf,
  } = (payload ?? {}) as {
    actions?: PeblorAction[];
    mode?: "parallel" | "sequence";
    delayBetween?: number;
    breakIf?: unknown;
  };
  if (!Array.isArray(actions)) return;
  if (mode === "sequence") {
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    waitForUnsubscribes.add(cancel);
    void actions
      .reduce((promise, a, i) => {
        return promise.then(
          () =>
            new Promise<void>((resolve) => {
              if (cancelled) {
                resolve();
                return;
              }
              setTimeout(
                () => {
                  if (cancelled) {
                    resolve();
                    return;
                  }
                  if (breakIf) {
                    const vars = useVariableStore.getState().variables;
                    if (evaluateConditions(breakIf as never, vars)) {
                      resolve();
                      return;
                    }
                  }
                  firePeblorAction(a, "system");
                  resolve();
                },
                i === 0 ? 0 : delayBetween
              );
            })
        );
      }, Promise.resolve())
      .finally(() => {
        waitForUnsubscribes.delete(cancel);
      });
  } else {
    if (breakIf && evaluateConditions(breakIf as never, useVariableStore.getState().variables))
      return;
    actions.forEach((a) => firePeblorAction(a, "system"));
  }
};

const handleConditionalAction: ActionHandler = (payload) => {
  const p = payload as Record<string, unknown>;
  const variables = useVariableStore.getState().variables;

  const primaryPasses = evaluateConditions(
    {
      conditions: p.conditions as never,
      logic: p.logic as never,
    },
    variables
  );

  if (primaryPasses) {
    if (p.then) firePeblorAction(p.then as PeblorAction, "system");
    return;
  }

  if (p.elseIf) {
    for (const branch of p.elseIf as Array<Record<string, unknown>>) {
      const branchPasses = evaluateConditions(branch as never, variables);
      if (branchPasses) {
        if (branch.then) firePeblorAction(branch.then as PeblorAction, "system");
        return;
      }
    }
  }

  if (p.else) {
    firePeblorAction(p.else as PeblorAction, "system");
  }
};

const handleElementShow: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id: string };
  window.dispatchEvent(
    new CustomEvent("peblor-element-visibility", {
      detail: { type: "elementShow", id },
    })
  );
};

const handleElementHide: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id: string };
  window.dispatchEvent(
    new CustomEvent("peblor-element-visibility", {
      detail: { type: "elementHide", id },
    })
  );
};

const handleElementToggle: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id: string };
  window.dispatchEvent(
    new CustomEvent("peblor-element-visibility", {
      detail: { type: "elementToggle", id },
    })
  );
};

export const CONTROL_FLOW_HANDLERS: ActionHandlerMap = {
  fireMultiple: handleFireMultiple,
  conditionalAction: handleConditionalAction,
  elementShow: handleElementShow,
  elementHide: handleElementHide,
  elementToggle: handleElementToggle,
};
