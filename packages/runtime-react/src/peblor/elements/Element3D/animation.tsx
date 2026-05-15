"use client";

import { useEffect, useRef, useCallback, useState, startTransition } from "react";
import { useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  AnimationActionLoopStyles,
  LoopOnce,
  LoopPingPong,
  LoopRepeat,
  type AnimationAction,
  type AnimationClip,
  type Object3D,
} from "three";

type AnimationPlayMode = "loop" | "once" | "pingPong";

interface UseAnimationOptions {
  initialAnimation?: string;
  loop?: boolean;
  playMode?: AnimationPlayMode;
  onCycleComplete?: (animationName: string) => void;
  onComplete?: () => void;
}

function resolveLoopMode(
  playMode: AnimationPlayMode | undefined,
  loop: boolean | undefined
): { loopMode: AnimationActionLoopStyles; clampWhenFinished: boolean } {
  if (playMode === "once" || (!playMode && loop === false)) {
    return { loopMode: LoopOnce, clampWhenFinished: true };
  }
  if (playMode === "pingPong") {
    return { loopMode: LoopPingPong, clampWhenFinished: false };
  }
  return { loopMode: LoopRepeat, clampWhenFinished: false };
}

function configureActionPlayback(
  action: AnimationAction,
  loopMode: AnimationActionLoopStyles,
  clampWhenFinished: boolean
): void {
  action.reset();
  action.clampWhenFinished = clampWhenFinished;
  action.setLoop(loopMode, Infinity);
  action.play();
}

function scrubActionToProgress(action: AnimationAction, progress: number): void {
  action.paused = true;
  const duration = action.getClip().duration;
  action.time = Math.max(0, Math.min(1, progress)) * duration;
}

export function useModelAnimation(
  animations: AnimationClip[],
  scene: Object3D,
  options: UseAnimationOptions = {}
) {
  const { actions, mixer } = useAnimations(animations, scene);
  const currentActionRef = useRef<AnimationAction | null>(null);
  const initializedRef = useRef(false);
  const previousCycleTimeRef = useRef<number>(0);
  const pendingSwitchRef = useRef<{
    name: string;
    waitForCycle: boolean;
    callback?: () => void;
  } | null>(null);

  const getInitialAction = useCallback(() => {
    if (!actions || Object.keys(actions).length === 0) return null;
    if (options.initialAnimation && actions[options.initialAnimation]) {
      return actions[options.initialAnimation];
    }
    return Object.values(actions)[0] || null;
  }, [actions, options.initialAnimation]);

  const [currentAction, setCurrentAction] = useState<AnimationAction | null>(() => {
    const initial = getInitialAction();
    return initial ?? null;
  });

  const switchToAnimation = useCallback(
    (animationName: string, loop: boolean = true, playMode?: AnimationPlayMode) => {
      if (!actions) return;

      const action = actions[animationName];
      if (!action) return;

      if (currentActionRef.current) {
        currentActionRef.current.stop();
      }

      const { loopMode, clampWhenFinished } = resolveLoopMode(playMode, loop);
      configureActionPlayback(action, loopMode, clampWhenFinished);
      currentActionRef.current = action;
      setCurrentAction(action);
      previousCycleTimeRef.current = 0;
    },
    [actions]
  );

  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0 || initializedRef.current) return;

    const initialAction = getInitialAction();
    if (initialAction) {
      const { loopMode, clampWhenFinished } = resolveLoopMode(options.playMode, options.loop);
      configureActionPlayback(initialAction, loopMode, clampWhenFinished);
      currentActionRef.current = initialAction;
      startTransition(() => {
        setCurrentAction(initialAction);
      });
      initializedRef.current = true;
    }

    return () => {
      Object.values(actions).forEach((action) => {
        if (action) action.stop();
      });
      initializedRef.current = false;
    };
  }, [actions, options.initialAnimation, options.loop, options.playMode, getInitialAction]);

  useEffect(() => {
    if (!mixer || !options.onComplete) return;
    const onComplete = options.onComplete;
    const handler = () => onComplete();
    mixer.addEventListener("finished", handler);
    return () => {
      mixer.removeEventListener("finished", handler);
    };
  }, [mixer, options.onComplete]);

  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }

    if (pendingSwitchRef.current && currentActionRef.current) {
      const currentAction = currentActionRef.current;
      const currentTime = currentAction.time;
      const duration = currentAction.getClip().duration;
      const previousTime = previousCycleTimeRef.current;

      if (pendingSwitchRef.current.waitForCycle) {
        const wasNearEnd = previousTime >= duration * 0.95;
        const isNearStart = currentTime < duration * 0.05;
        const hasCompletedCycle = wasNearEnd && isNearStart;

        if (hasCompletedCycle) {
          switchToAnimation(pendingSwitchRef.current.name);
          if (pendingSwitchRef.current.callback) {
            pendingSwitchRef.current.callback();
          }
          pendingSwitchRef.current = null;
        } else {
          previousCycleTimeRef.current = currentTime;
        }
      } else {
        switchToAnimation(pendingSwitchRef.current.name);
        pendingSwitchRef.current = null;
      }
    } else if (currentActionRef.current) {
      previousCycleTimeRef.current = currentActionRef.current.time;
    }
  });

  const playAnimation = useCallback(
    (animationName: string, options?: { loop?: boolean }) => {
      switchToAnimation(animationName, options?.loop !== false);
    },
    [switchToAnimation]
  );

  const switchAnimation = useCallback(
    (animationName: string, waitForCycle: boolean = false, onComplete?: () => void) => {
      if (!actions || !actions[animationName]) {
        if (onComplete) onComplete();
        return;
      }

      if (waitForCycle) {
        pendingSwitchRef.current = {
          name: animationName,
          waitForCycle: true,
          callback: onComplete,
        };
      } else {
        switchToAnimation(animationName);
        if (onComplete) onComplete();
      }
    },
    [actions, switchToAnimation]
  );

  const stopAnimation = useCallback(() => {
    if (currentActionRef.current) {
      currentActionRef.current.stop();
      currentActionRef.current = null;
      setCurrentAction(null);
    }
    pendingSwitchRef.current = null;
  }, []);

  const pauseCurrentAnimation = useCallback(() => {
    const action = currentActionRef.current;
    if (!action) return;
    action.paused = true;
  }, []);

  const resumeCurrentAnimation = useCallback(() => {
    const action = currentActionRef.current;
    if (!action) return;
    action.paused = false;
    action.play();
  }, []);

  const toggleCurrentAnimation = useCallback(() => {
    const action = currentActionRef.current;
    if (!action) return;
    action.paused = !action.paused;
    if (!action.paused) action.play();
  }, []);

  const scrubTo = useCallback(
    (progress: number, clipName?: string) => {
      if (!mixer) return;
      const target = clipName ? actions?.[clipName] : currentActionRef.current;
      if (!target) return;

      if (!target.isRunning()) {
        target.play();
      }
      scrubActionToProgress(target, progress);
      mixer.update(0);
    },
    [actions, mixer]
  );

  const crossFade = useCallback(
    (toClipName: string, durationMs: number = 300, warp: boolean = true) => {
      if (!actions) return;
      const toAction = actions[toClipName];
      if (!toAction || !currentActionRef.current) return;

      toAction.reset();
      toAction.setEffectiveTimeScale(1);
      toAction.setEffectiveWeight(1);
      toAction.play();

      const fromAction = currentActionRef.current;
      fromAction.crossFadeTo(toAction, durationMs / 1000, warp);

      const fadeDuration = durationMs;
      setTimeout(() => {
        fromAction.stop();
      }, fadeDuration);

      currentActionRef.current = toAction;
      setCurrentAction(toAction);
      previousCycleTimeRef.current = 0;
    },
    [actions]
  );

  return {
    playAnimation,
    switchAnimation,
    stopAnimation,
    pauseCurrentAnimation,
    resumeCurrentAnimation,
    toggleCurrentAnimation,
    crossFade,
    scrubTo,
    actions,
    mixer,
    currentAction,
  };
}
