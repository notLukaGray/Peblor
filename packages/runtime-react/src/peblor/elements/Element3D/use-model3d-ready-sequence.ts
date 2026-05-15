"use client";

import { useCallback, useRef } from "react";
import { parseNumber, readPayloadObject } from "./model3d-action-parsing";
import { fireModel3DReady } from "./model3d-events";

type Args = {
  id?: string;
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setOpacity: React.Dispatch<React.SetStateAction<number>>;
  setOpacityTransitionMs: React.Dispatch<React.SetStateAction<number>>;
};

export function useModel3DReadySequence({
  id,
  setIsVisible,
  setOpacity,
  setOpacityTransitionMs,
}: Args) {
  const pendingFadeInMsRef = useRef<number | null>(null);

  const prepareLoad = useCallback(
    (payload: unknown) => {
      const payloadObj = readPayloadObject(payload);
      const fadeSpec = payloadObj?.fadeInOnReady;
      if (fadeSpec == null || fadeSpec === false) {
        pendingFadeInMsRef.current = null;
        return;
      }

      const fadeObj = readPayloadObject(fadeSpec);
      const durationMs =
        parseNumber(fadeSpec) ??
        parseNumber(fadeObj?.durationMs ?? fadeObj?.duration ?? fadeObj?.ms) ??
        500;
      pendingFadeInMsRef.current = Math.max(0, durationMs);
      setIsVisible(true);
      setOpacityTransitionMs(0);
      setOpacity(0);
    },
    [setIsVisible, setOpacity, setOpacityTransitionMs]
  );

  const handleReady = useCallback(() => {
    fireModel3DReady(id);
    const fadeMs = pendingFadeInMsRef.current;
    if (fadeMs == null) return;
    pendingFadeInMsRef.current = null;
    setIsVisible(true);
    setOpacityTransitionMs(fadeMs);
    window.requestAnimationFrame(() => setOpacity(1));
  }, [id, setIsVisible, setOpacity, setOpacityTransitionMs]);

  return { prepareLoad, handleReady };
}
