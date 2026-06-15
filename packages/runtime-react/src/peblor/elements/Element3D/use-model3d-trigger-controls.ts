"use client";

import { useEffect, useRef } from "react";
import { PEBLOR_TRIGGER_EVENT, type PeblorTriggerDetail } from "@/peblor/triggers";
import type { Model3DAction, PeblorAction } from "@pb/contracts/types";
import { subscribeToElementActions } from "@/peblor/triggers/action-bus";
import type {
  Model3DAnimationCommand,
  Model3DCameraCommand,
  Model3DCameraEffectsValue,
  Model3DCameraPreset,
  Model3DVideoTextureCommand,
  Model3DTransformCommand,
  Model3DMaterialCommand,
  Model3DSceneCommand,
  Model3DPostProcessingCommand,
} from "./model3d-controls";
import { dispatchModel3DTriggerAction } from "./model3d-trigger-dispatch";

type TriggerControlsArgs = {
  id?: string;
  opacity: number;
  setLoadedState: (
    next: boolean | ((prev: boolean) => boolean),
    options?: { transition?: boolean }
  ) => void;
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setOpacity: React.Dispatch<React.SetStateAction<number>>;
  setOpacityTransitionMs: React.Dispatch<React.SetStateAction<number>>;
  setCameraEffectsOverride: React.Dispatch<
    React.SetStateAction<Model3DCameraEffectsValue | null | undefined>
  >;
  setAnimationCommand: React.Dispatch<React.SetStateAction<Model3DAnimationCommand | null>>;
  setCameraCommand: React.Dispatch<React.SetStateAction<Model3DCameraCommand | null>>;
  setVideoTextureCommand: React.Dispatch<React.SetStateAction<Model3DVideoTextureCommand | null>>;
  setTransformCommand: React.Dispatch<React.SetStateAction<Model3DTransformCommand | null>>;
  setMaterialCommand: React.Dispatch<React.SetStateAction<Model3DMaterialCommand | null>>;
  setSceneCommand: React.Dispatch<React.SetStateAction<Model3DSceneCommand | null>>;
  setPostProcessingCommand: React.Dispatch<
    React.SetStateAction<Model3DPostProcessingCommand | null>
  >;
  onBeforeLoad?: (payload: unknown, payloadObj: Record<string, unknown> | null) => void;
  onClearGeometryCache?: () => void;
  sceneCameraPresets?: Record<string, Model3DCameraPreset>;
};

export function useModel3DTriggerControls(args: TriggerControlsArgs) {
  const nextNonceRef = useRef(0);
  const fadeHideTimeoutRef = useRef<number | null>(null);
  const cameraPresetCycleRef = useRef<{ presets: Model3DCameraPreset[]; index: number } | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (fadeHideTimeoutRef.current != null) {
        window.clearTimeout(fadeHideTimeoutRef.current);
        fadeHideTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const clearFadeHideTimeout = () => {
      if (fadeHideTimeoutRef.current == null) return;
      window.clearTimeout(fadeHideTimeoutRef.current);
      fadeHideTimeoutRef.current = null;
    };

    const scheduleHideAfterFade = (ms: number) => {
      clearFadeHideTimeout();
      fadeHideTimeoutRef.current = window.setTimeout(
        () => {
          args.setIsVisible(false);
          fadeHideTimeoutRef.current = null;
        },
        Math.max(0, ms)
      );
    };

    const nextNonce = () => {
      nextNonceRef.current += 1;
      return nextNonceRef.current;
    };

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<PeblorTriggerDetail>).detail;
      const action = detail?.action;
      if (!action || typeof action.type !== "string" || !action.type.startsWith("three.")) return;
      dispatchModel3DTriggerAction(
        {
          ...args,
          nextNonce,
          clearFadeHideTimeout,
          scheduleHideAfterFade,
          cameraPresetCycleRef,
          progress: detail.progress,
        },
        action as Model3DAction
      );
    };

    const busUnsub = args.id
      ? subscribeToElementActions(args.id, (rawAction) => {
          const syntheticEvent = new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
            detail: { action: rawAction as PeblorAction, source: "system" },
          });
          listener(syntheticEvent);
        })
      : null;
    window.addEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    return () => {
      busUnsub?.();
      window.removeEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    };
  }, [args]);
}
