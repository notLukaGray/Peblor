"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PEBLOR_TRIGGER_EVENT,
  type PeblorTriggerDetail,
  firePeblorAction,
} from "@/peblor/triggers";
import { setVariable, useVariableStore } from "@/peblor/runtime/peblor-variable-store";
import { evaluateConditions } from "@pb/contracts/peblor/core/peblor-condition-evaluator";
import { resolveAuthoredUrl } from "@pb/runtime-react/core/lib/url-policy";

/** Mounts once at root level. Handles all non-section-context peblor actions. */
export function usePeblorActionRunner(): void {
  const router = useRouter();
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PeblorTriggerDetail>).detail;
      const action = detail?.action;
      if (!action?.type) return;

      switch (action.type) {
        // --- Navigation ---
        case "back":
          if (typeof window !== "undefined") window.history.back();
          return;
        case "navigate": {
          const { href, replace } = action.payload;
          if (!href) return;
          const result = resolveAuthoredUrl(href, "internal");
          if (!result.ok) return;
          if (replace) router.replace(result.url);
          else router.push(result.url);
          return;
        }
        case "scrollTo": {
          const p = action.payload ?? {};
          if (p.id) {
            const el = document.getElementById(p.id);
            if (el)
              el.scrollIntoView({ behavior: p.behavior ?? "smooth", block: p.block ?? "start" });
          } else if (p.offset != null) {
            window.scrollTo({ top: p.offset, behavior: p.behavior ?? "smooth" });
          }
          return;
        }
        case "scrollLock":
          document.body.style.overflow = "hidden";
          return;
        case "scrollUnlock":
          document.body.style.overflow = "";
          return;

        // --- Modal (fires a secondary custom event; modal renderer listens) ---
        case "modalOpen":
        case "modalClose":
        case "modalToggle": {
          const p = action.payload ?? {};
          window.dispatchEvent(
            new CustomEvent("peblor-modal", { detail: { type: action.type, id: p.id } })
          );
          return;
        }

        // --- State & Logic ---
        case "setVariable": {
          const payload = action.payload ?? {};
          const { key, value } = payload;
          setVariable(key, value);
          return;
        }
        case "fireMultiple": {
          const { actions, mode = "parallel", delayBetween = 0 } = action.payload;
          if (!Array.isArray(actions)) return;
          if (mode === "sequence") {
            void actions.reduce((promise, a, i) => {
              return promise.then(
                () =>
                  new Promise<void>((resolve) => {
                    setTimeout(
                      () => {
                        firePeblorAction(a, "system");
                        resolve();
                      },
                      i === 0 ? 0 : delayBetween
                    );
                  })
              );
            }, Promise.resolve());
          } else {
            actions.forEach((a) => firePeblorAction(a, "system"));
          }
          return;
        }
        case "conditionalAction": {
          const payload = action.payload;
          const variables = useVariableStore.getState().variables;

          // Evaluate primary condition
          const primaryPasses = evaluateConditions(
            {
              variable: payload.variable,
              operator: payload.operator,
              value: payload.value,
              conditions: payload.conditions,
              logic: payload.logic,
            },
            variables
          );

          if (primaryPasses) {
            if (payload.then) firePeblorAction(payload.then, "system");
            return;
          }

          // Evaluate elseIf chain
          if (payload.elseIf) {
            for (const branch of payload.elseIf) {
              const branchPasses = evaluateConditions(branch, variables);
              if (branchPasses) {
                if (branch.then) firePeblorAction(branch.then, "system");
                return;
              }
            }
          }

          // Else fallback
          if (payload.else) {
            firePeblorAction(payload.else, "system");
          }
          return;
        }

        // --- Element Visibility (fires secondary event; element renderers listen) ---
        case "elementShow":
        case "elementHide":
        case "elementToggle": {
          const { id } = action.payload;
          window.dispatchEvent(
            new CustomEvent("peblor-element-visibility", {
              detail: { type: action.type, id },
            })
          );
          return;
        }

        // --- Media ---
        case "playSound": {
          const { src, volume = 1, loop = false } = action.payload;
          let audio = audioMapRef.current.get(src);
          if (!audio) {
            audio = new Audio(src);
            audioMapRef.current.set(src, audio);
          }
          audio.volume = Math.max(0, Math.min(1, volume));
          audio.loop = loop;
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return;
        }
        case "stopSound": {
          const { src } = action.payload ?? {};
          if (src) {
            const audio = audioMapRef.current.get(src);
            if (audio) {
              audio.pause();
              audio.currentTime = 0;
            }
          } else {
            audioMapRef.current.forEach((a) => {
              a.pause();
              a.currentTime = 0;
            });
          }
          return;
        }
        case "setVolume": {
          const { volume, id: elementId } = action.payload;
          if (elementId) {
            const el = document.getElementById(elementId) as
              | HTMLVideoElement
              | HTMLAudioElement
              | null;
            if (el && "volume" in el) el.volume = Math.max(0, Math.min(1, volume));
          } else {
            audioMapRef.current.forEach((a) => {
              a.volume = Math.max(0, Math.min(1, volume));
            });
          }
          return;
        }

        // --- Browser / Device ---
        case "copyToClipboard": {
          const { text } = action.payload;
          navigator.clipboard?.writeText(text).catch(() => {});
          return;
        }
        case "vibrate": {
          const { pattern = 50 } = action.payload ?? {};
          navigator.vibrate?.(pattern);
          return;
        }
        case "setDocumentTitle": {
          const { title } = action.payload;
          document.title = title;
          return;
        }
        case "openExternalUrl": {
          const { url, target = "_blank" } = action.payload;
          const result = resolveAuthoredUrl(url, "external");
          if (!result.ok) return;
          window.open(result.url, target, "noopener,noreferrer");
          return;
        }

        // --- Section-context actions ---
        // These are handled by usePeblorTriggerListener (section-level), which also
        // listens to PEBLOR_TRIGGER_EVENT on window. Both listeners receive every
        // PEBLOR_TRIGGER_EVENT dispatch — including ones fired from buttons via
        // firePeblorAction. The section listener applies these to section-local state
        // (background overrides, transition state). Explicit no-ops here prevent silent
        // default fall-through while preserving the section listener's handling.
        case "backgroundSwitch":
        case "contentOverride":
        case "startTransition":
        case "stopTransition":
        case "updateTransitionProgress":
          return;

        // --- Analytics ---
        case "trackEvent": {
          const { event, properties } = action.payload;
          // backwards-compat: keep CustomEvent for any external listeners
          window.dispatchEvent(new CustomEvent("peblor-track", { detail: { event, properties } }));
          // facade bridge
          if (
            typeof (window as unknown as Record<string, unknown>).__analytics_track === "function"
          ) {
            (
              (window as unknown as Record<string, unknown>).__analytics_track as (
                event: string,
                props?: Record<string, unknown>
              ) => void
            )(event, { pagePath: window.location.pathname, ...properties });
          }
          return;
        }

        // --- Storage ---
        case "setLocalStorage": {
          const { key, value } = action.payload;
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {}
          return;
        }
        case "setSessionStorage": {
          const { key, value } = action.payload;
          try {
            sessionStorage.setItem(key, JSON.stringify(value));
          } catch {}
          return;
        }
        case "setTheme": {
          const mode = action.payload?.mode;
          const root = document.documentElement;
          const forcedTheme = root.dataset.pbForcedTheme;
          if (forcedTheme === "light" || forcedTheme === "dark") {
            root.classList.remove("light", "dark");
            root.classList.add(forcedTheme);
            return;
          }
          const current = root.classList.contains("dark") ? "dark" : "light";
          const next = mode === "toggle" ? (current === "dark" ? "light" : "dark") : mode;
          if (next !== "light" && next !== "dark") return;
          root.classList.remove("light", "dark");
          root.classList.add(next);
          try {
            localStorage.setItem("theme", next);
          } catch {}
          return;
        }

        default:
          return;
      }
    };

    const audioMap = audioMapRef.current;
    window.addEventListener(PEBLOR_TRIGGER_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(PEBLOR_TRIGGER_EVENT, handler as EventListener);
      audioMap.forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });
    };
  }, [router]);
}
