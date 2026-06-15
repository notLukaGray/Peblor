import type { ActionHandler, ActionHandlerMap, PeblorAction } from "./types";
import { cancelNamedTimer } from "@/peblor/triggers/core/use-timer-trigger";
import { firePeblorAction } from "@/peblor/triggers/core/trigger-event";

const handleCancelTimer: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id?: string };
  cancelNamedTimer(id!);
};

const handleRepeatAction: ActionHandler = (payload, { waitForUnsubscribes }) => {
  const {
    count,
    action: repeatedAction,
    delayMs = 0,
  } = (payload ?? {}) as {
    count?: number;
    action?: PeblorAction;
    delayMs?: number;
  };
  if ((delayMs ?? 0) > 0) {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cancel = () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };

    waitForUnsubscribes.add(cancel);

    const fire = (i: number) => {
      if (cancelled) return;
      if (i >= (count ?? 0)) {
        waitForUnsubscribes.delete(cancel);
        return;
      }
      firePeblorAction(repeatedAction!, "system");
      timeoutId = setTimeout(() => fire(i + 1), delayMs);
    };
    fire(0);
  } else {
    for (let i = 0; i < (count ?? 0); i++) firePeblorAction(repeatedAction!, "system");
  }
};

export const TIMER_HANDLERS: ActionHandlerMap = {
  cancelTimer: handleCancelTimer,
  repeatAction: handleRepeatAction,
};
