"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import {
  MODEL3D_READY_EVENT,
  type Model3DReadyDetail,
} from "@/peblor/elements/Element3D/model3d-events";

export type Model3DReadyButtonExitConfig = {
  targetId?: string;
  fadeOutMs: number;
  exitEasing?: string;
  unmountAfterFade: boolean;
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function parseTargetId(payload: unknown): string | undefined {
  const obj = readRecord(payload);
  if (!obj) return undefined;
  if (typeof obj.id === "string") return obj.id;
  if (typeof obj.targetId === "string") return obj.targetId;
  if (typeof obj.target === "string") return obj.target;
  const target = readRecord(obj.target);
  if (target && typeof target.id === "string") return target.id;
  return undefined;
}

function parseConfig(
  action: string | undefined,
  actionPayload: unknown
): Model3DReadyButtonExitConfig | null {
  if (!action?.startsWith("three.")) return null;
  const payloadObj = readRecord(actionPayload);
  if (!payloadObj) return null;

  const fadeSpec = payloadObj.buttonFadeOutOnModelReady;
  if (fadeSpec == null || fadeSpec === false) return null;

  const fadeObj = readRecord(fadeSpec);
  const defaultExitMs =
    (MOTION_DEFAULTS.transition.exitDuration ?? MOTION_DEFAULTS.transition.duration) * 1000;
  const fadeOutMs =
    parseNumber(fadeSpec) ??
    parseNumber(fadeObj?.durationMs ?? fadeObj?.duration ?? fadeObj?.ms) ??
    defaultExitMs;
  const exitEasing =
    (typeof fadeObj?.easing === "string" ? fadeObj.easing : undefined) ??
    (typeof fadeObj?.exitEasing === "string" ? fadeObj.exitEasing : undefined);
  const unmountAfterFade =
    parseBoolean(payloadObj.buttonUnmountOnModelReady) ??
    parseBoolean(fadeObj?.unmountAfterFade) ??
    true;

  return {
    targetId: parseTargetId(actionPayload),
    fadeOutMs: Math.max(0, fadeOutMs),
    exitEasing,
    unmountAfterFade,
  };
}

function isConfig(c: Model3DReadyButtonExitConfig | null): c is Model3DReadyButtonExitConfig {
  return c != null;
}

export function useModel3DReadyButtonExit(action: string | undefined, actionPayload: unknown) {
  const config = useMemo(() => parseConfig(action, actionPayload), [action, actionPayload]);
  const [showButton, setShowButton] = useState(true);
  const armedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !config) return;

    const onReady = (event: Event) => {
      if (!armedRef.current) return;
      const detail = (event as CustomEvent<Model3DReadyDetail>).detail;
      if (
        config.targetId &&
        detail?.authoredId !== config.targetId &&
        detail?.elementId !== config.targetId
      ) {
        return;
      }
      if (config.unmountAfterFade) setShowButton(false);
    };

    window.addEventListener(MODEL3D_READY_EVENT, onReady as EventListener);
    return () => window.removeEventListener(MODEL3D_READY_EVENT, onReady as EventListener);
  }, [config]);

  const arm = () => {
    if (!config) return;
    armedRef.current = true;
  };

  const hasExit = isConfig(config) && (config.unmountAfterFade ?? true);
  const isMounted = showButton;
  const defaultExitMs =
    (MOTION_DEFAULTS.transition.exitDuration ?? MOTION_DEFAULTS.transition.duration) * 1000;
  const exitDurationMs = config?.fadeOutMs ?? defaultExitMs;
  const exitEasing = config?.exitEasing ?? MOTION_DEFAULTS.transition.ease;

  return {
    isMounted,
    arm,
    hasExit,
    showButton,
    exitDurationMs,
    exitEasing,
  };
}
