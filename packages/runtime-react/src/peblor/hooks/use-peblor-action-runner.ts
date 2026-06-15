"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PEBLOR_TRIGGER_EVENT,
  type PeblorTriggerDetail,
} from "@/peblor/triggers/core/trigger-event";
import { useVariableStore } from "@/peblor/runtime/peblor-variable-store";
import { useScrollContainerRef } from "@/peblor/section/position/use-scroll-container";
import { useSmoothScrollTo } from "@/peblor/section/position/smooth-scroll-to-context";
import { resolveVariablePath } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { ACTION_HANDLERS } from "./action-handlers";
import type { ActionHandlerContext, ActionHandlerMap } from "./action-handlers/types";
import type { PeblorAction } from "@pb/contracts/peblor/core/trigger-action-types";

// Action type prefixes and exact types that are legitimately handled inside element components
// via window event listeners (Element3D, ElementRive, ElementVideo, ElementAudio, ElementLottie).
// The root action runner never handles these — they are dispatched to elements by the event bus.
// Logging "Unknown action type" for them would mask real typos in truly unknown types.
const ELEMENT_HANDLED_PREFIXES = ["three.", "rive."] as const;
const ELEMENT_HANDLED_TYPES = new Set([
  "assetPlay",
  "assetPause",
  "assetTogglePlay",
  "assetSeek",
  "assetMute",
  "videoFullscreen",
]);

// These handler groups are lazy-loaded on first dispatch. Dynamic import() is cached
// by the module system, so each group loads at most once per session.
const LAZY_ACTION_TYPES: Record<string, () => Promise<ActionHandlerMap>> = {
  // Fetch API
  fetchApi: () => import("./action-handlers/fetch-api").then((m) => m.FETCH_API_HANDLERS),
  abortFetch: () => import("./action-handlers/fetch-api").then((m) => m.FETCH_API_HANDLERS),
  // Media (sounds, video element controls)
  playSound: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  stopSound: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  setVolume: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  elementPlay: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  elementPause: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  elementSeek: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  backgroundSwitch: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  contentOverride: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  startTransition: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  stopTransition: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  updateTransitionProgress: () => import("./action-handlers/media").then((m) => m.MEDIA_HANDLERS),
  // DOM utilities (clipboard, vibration, CSS vars, URL params)
  copyToClipboard: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  vibrate: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  setDocumentTitle: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  openExternalUrl: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  setCssVariable: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  focusElement: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  blurElement: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  setInputValue: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  dispatchCustomEvent: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  setUrlParam: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  share: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  downloadFile: () => import("./action-handlers/dom").then((m) => m.DOM_HANDLERS),
  // Storage (localStorage, sessionStorage, theme toggle)
  setLocalStorage: () =>
    import("./action-handlers/storage-fetch").then((m) => m.STORAGE_FETCH_HANDLERS),
  setSessionStorage: () =>
    import("./action-handlers/storage-fetch").then((m) => m.STORAGE_FETCH_HANDLERS),
  setTheme: () => import("./action-handlers/storage-fetch").then((m) => m.STORAGE_FETCH_HANDLERS),
  // Timers (cancelTimer, repeatAction)
  cancelTimer: () => import("./action-handlers/timers").then((m) => m.TIMER_HANDLERS),
  repeatAction: () => import("./action-handlers/timers").then((m) => m.TIMER_HANDLERS),
  // Analytics & toast notifications
  trackEvent: () => import("./action-handlers/analytics").then((m) => m.ANALYTICS_HANDLERS),
  showToast: () => import("./action-handlers/analytics").then((m) => m.ANALYTICS_HANDLERS),
};

function resolveEventPath(event: Record<string, unknown> | undefined, path: string): unknown {
  if (!event) return undefined;
  const parts = path.split(".").filter(Boolean);
  let current: unknown = event;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function interpolateTokens(
  value: unknown,
  event: Record<string, unknown> | undefined,
  variables: Record<string, import("@pb/contracts/types").JsonValue>
): unknown {
  if (typeof value === "string") {
    // Full-string token: preserve original type (number, boolean, object, etc.)
    const eventFullMatch = value.match(/^\$event\.([A-Za-z0-9_.$-]+)$/);
    if (eventFullMatch?.[1]) {
      const resolved = resolveEventPath(event, eventFullMatch[1]);
      return resolved === undefined ? value : resolved;
    }
    const varFullMatch = value.match(/^\$var\.([A-Za-z0-9_.$-]+)$/);
    if (varFullMatch?.[1]) {
      const resolved = resolveVariablePath(variables, varFullMatch[1]);
      return resolved === undefined ? value : resolved;
    }
    // Substring template: replace $event.path and $var.path occurrences within a larger string
    if (value.includes("$event.") || value.includes("$var.")) {
      return value
        .replace(/\$event\.([A-Za-z0-9_.$-]+)/g, (match, path: string) => {
          const resolved = resolveEventPath(event, path);
          return resolved != null ? String(resolved) : match;
        })
        .replace(/\$var\.([A-Za-z0-9_.$-]+)/g, (match, path: string) => {
          const resolved = resolveVariablePath(variables, path);
          return resolved != null ? String(resolved) : match;
        });
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => interpolateTokens(item, event, variables));
  if (value != null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = interpolateTokens(item, event, variables);
    }
    return out;
  }
  return value;
}

function dispatchHandler(
  handler: (
    payload: Record<string, unknown> | undefined,
    ctx: ActionHandlerContext
  ) => void | Promise<void>,
  action: PeblorTriggerDetail["action"],
  ctx: ActionHandlerContext
): void {
  try {
    const result = handler(action.payload as Record<string, unknown> | undefined, ctx);
    if (result instanceof Promise) {
      result.catch((err: unknown) => {
        console.error(`[peblor] Action "${action.type}" failed:`, err);
      });
    }
  } catch (err) {
    console.error(`[peblor] Action "${action.type}" failed:`, err);
  }
}

function runAction(action: PeblorTriggerDetail["action"], ctx: ActionHandlerContext): void {
  const handler = ACTION_HANDLERS[action.type];
  if (handler) {
    dispatchHandler(handler, action, ctx);
    return;
  }

  const lazyLoader = LAZY_ACTION_TYPES[action.type];
  if (lazyLoader) {
    void lazyLoader()
      .then((handlers) => {
        const lazyHandler = handlers[action.type];
        if (lazyHandler) dispatchHandler(lazyHandler, action, ctx);
      })
      .catch((err: unknown) => {
        console.error(`[peblor] Failed to load handler for "${action.type}":`, err);
      });
    return;
  }

  // Skip logging for action types that are legitimately handled inside element components
  // via their own window event listeners. These are never routed through the root runner.
  const type = action.type;
  if (
    ELEMENT_HANDLED_TYPES.has(type) ||
    ELEMENT_HANDLED_PREFIXES.some((prefix) => type.startsWith(prefix))
  ) {
    return;
  }
  console.warn(`[peblor] Unknown action type: ${type}`);
}

/** Mounts once at root level. Handles all non-section-context peblor actions. */
export function usePeblorActionRunner(): void {
  const router = useRouter();
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fetchAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const fetchDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const waitForUnsubscribesRef = useRef<Set<() => void>>(new Set());
  const scrollContainerRef = useScrollContainerRef();
  const smoothScrollTo = useSmoothScrollTo();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PeblorTriggerDetail>).detail;
      // Use fresh variables at fire time — no stale closure from the last render
      const variables = useVariableStore.getState().variables;
      const action = interpolateTokens(
        detail?.action,
        detail?.event,
        variables
      ) as PeblorTriggerDetail["action"];
      if (!action?.type) return;

      const ctx: ActionHandlerContext = {
        router,
        variables,
        scrollContainerRef: scrollContainerRef as React.RefObject<HTMLElement | null> | null,
        smoothScrollTo: smoothScrollTo as ((top: number) => void) | null,
        audioMap: audioMapRef.current,
        abortControllers: fetchAbortControllersRef.current,
        debounceTimers: fetchDebounceTimersRef.current,
        waitForUnsubscribes: waitForUnsubscribesRef.current,
        fireAction: (a: PeblorAction) => {
          runAction(a as PeblorTriggerDetail["action"], ctx);
        },
      };

      runAction(action, ctx);
    };

    const audioMap = audioMapRef.current;
    const abortControllers = fetchAbortControllersRef.current;
    const debounceTimers = fetchDebounceTimersRef.current;
    const waitForUnsubscribes = waitForUnsubscribesRef.current;
    window.addEventListener(PEBLOR_TRIGGER_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(PEBLOR_TRIGGER_EVENT, handler as EventListener);
      audioMap.forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });
      abortControllers.forEach((c) => c.abort());
      debounceTimers.forEach((t) => clearTimeout(t));
      waitForUnsubscribes.forEach((unsub) => unsub());
      waitForUnsubscribes.clear();
    };
  }, [router, scrollContainerRef, smoothScrollTo]);
}
