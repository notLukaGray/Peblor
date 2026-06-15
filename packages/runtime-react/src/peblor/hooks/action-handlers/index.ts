import type { ActionHandlerMap } from "./types";
import { NAVIGATION_HANDLERS } from "./navigation";
import { STATE_HANDLERS } from "./state";
import { MODAL_HANDLERS } from "./modal";
import { CONTROL_FLOW_HANDLERS } from "./control-flow";

// media, dom, storage-fetch, timers, analytics are lazy-loaded in use-peblor-action-runner.ts
export const ACTION_HANDLERS: ActionHandlerMap = {
  ...NAVIGATION_HANDLERS,
  ...STATE_HANDLERS,
  ...MODAL_HANDLERS,
  ...CONTROL_FLOW_HANDLERS,
};
