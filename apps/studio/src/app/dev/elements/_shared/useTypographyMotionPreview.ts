"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLoopIntervalMs } from "@/app/dev/elements/image/preview-motion";
import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";

const LOOP_MS = 2800;

export function useTypographyMotionPreview(active: Record<string, unknown>) {
  const [previewVisible, setPreviewVisible] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [autoLoop, setAutoLoop] = useState(false);
  const pendingAnimateInRef = useRef(false);
  const pendingAutoLoopRef = useRef(false);

  const onPreviewExitComplete = useCallback(() => {
    if (pendingAnimateInRef.current) {
      pendingAnimateInRef.current = false;
      setPreviewKey((k) => k + 1);
      setPreviewVisible(true);
      return;
    }
    if (pendingAutoLoopRef.current) {
      pendingAutoLoopRef.current = false;
      setPreviewKey((k) => k + 1);
      setPreviewVisible(true);
    }
  }, []);

  const animateInPreview = useCallback(() => {
    setPreviewVisible((wasVisible) => {
      if (!wasVisible) {
        // Already fully hidden: no exit runs, so `onExitComplete` never fires — remount here.
        pendingAnimateInRef.current = false;
        setPreviewKey((k) => k + 1);
        return true;
      }
      pendingAnimateInRef.current = true;
      return false;
    });
  }, []);

  const animateOutPreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  const showPreview = useCallback(() => {
    setPreviewVisible(true);
  }, []);

  const loopMs = useMemo(() => {
    const anim = active.animation as PbImageAnimationDefaults | undefined;
    return anim != null ? getLoopIntervalMs(anim) : LOOP_MS;
  }, [active]);

  useEffect(() => {
    if (!autoLoop) return;
    const id = window.setInterval(() => {
      if (pendingAutoLoopRef.current || pendingAnimateInRef.current) return;
      pendingAutoLoopRef.current = true;
      setPreviewVisible(false);
    }, loopMs);
    return () => window.clearInterval(id);
  }, [autoLoop, loopMs]);

  const resetMotionPreview = useCallback(() => {
    pendingAnimateInRef.current = false;
    pendingAutoLoopRef.current = false;
    setPreviewVisible(true);
    setPreviewKey(0);
    setAutoLoop(false);
  }, []);

  return {
    animateInPreview,
    animateOutPreview,
    autoLoop,
    onPreviewExitComplete,
    previewKey,
    previewVisible,
    resetMotionPreview,
    setAutoLoop,
    showPreview,
  };
}
