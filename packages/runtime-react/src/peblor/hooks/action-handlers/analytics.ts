import type { ActionHandler, ActionHandlerMap } from "./types";
import { useToastStore } from "@/peblor/section/toast/use-toast-store";

const handleTrackEvent: ActionHandler = (payload) => {
  const { event, properties } = (payload ?? {}) as {
    event?: string;
    properties?: Record<string, unknown>;
  };
  window.dispatchEvent(new CustomEvent("peblor-track", { detail: { event, properties } }));
  if (typeof (window as unknown as Record<string, unknown>).__analytics_track === "function") {
    (
      (window as unknown as Record<string, unknown>).__analytics_track as (
        event: string,
        props?: Record<string, unknown>
      ) => void
    )(event!, { pagePath: window.location.pathname, ...properties });
  }
};

const handleShowToast: ActionHandler = (payload) => {
  const {
    message,
    variant = "info",
    durationMs = 3000,
  } = (payload ?? {}) as {
    message?: string;
    variant?: "info" | "success" | "warning" | "error";
    durationMs?: number;
  };
  useToastStore.getState().push({ message: message!, variant, durationMs });
};

export const ANALYTICS_HANDLERS: ActionHandlerMap = {
  trackEvent: handleTrackEvent,
  showToast: handleShowToast,
};
