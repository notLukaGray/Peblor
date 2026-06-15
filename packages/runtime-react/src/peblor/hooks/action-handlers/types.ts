import type { PeblorAction } from "@pb/contracts/peblor/core/trigger-action-types";

export type { PeblorAction };

export interface ActionHandlerContext {
  router: import("next/dist/shared/lib/app-router-context.shared-runtime").AppRouterInstance;
  variables: Record<string, import("@pb/contracts/types").JsonValue>;
  scrollContainerRef: React.RefObject<HTMLElement | null> | null;
  smoothScrollTo: ((top: number) => void) | null;
  fireAction: (action: PeblorAction) => void;
  audioMap: Map<string, HTMLAudioElement>;
  abortControllers: Map<string, AbortController>;
  debounceTimers: Map<string, ReturnType<typeof setTimeout>>;
  waitForUnsubscribes: Set<() => void>;
}

export type ActionHandler = (
  payload: Record<string, unknown> | undefined,
  ctx: ActionHandlerContext
) => void | Promise<void>;

export type ActionHandlerMap = Record<string, ActionHandler>;
