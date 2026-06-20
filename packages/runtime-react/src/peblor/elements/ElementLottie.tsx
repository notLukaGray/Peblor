"use client";

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from "react";
import Image from "next/image";
import type { ElementBlock } from "@pb/contracts/types";
import type { PeblorAction } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import {
  firePeblorAction,
  PEBLOR_TRIGGER_EVENT,
  type PeblorTriggerDetail,
} from "@/peblor/triggers";
import { subscribeToElementActions } from "@/peblor/triggers/action-bus";
import { shouldApplyMediaTarget } from "@/peblor/triggers/target-matching";
import {
  isApprovedAssetUrl,
  THIRD_PARTY_ASSET_MESSAGE,
} from "@pb/runtime-react/core/lib/asset-host";

type Props = Extract<ElementBlock, { type: "elementLottie" }>;

export function ElementLottie({
  id,
  src,
  poster,
  autoplay,
  loop,
  speed = 1,
  direction = 1,
  playMode,
  segment,
  renderer = "svg",
  backgroundColor,
  preserveAspectRatio,
  objectFit,
  aspectRatio,
  hover,
  interactivity,
  onPlay,
  onPause,
  onStop,
  onComplete,
  onLoop,
  onEnterFrame,
  onEvent,
  ariaLabel,
  width,
  height,
  selfAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  hidden,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const lottieActionCallbacksRef = useRef<{
    onPlay?: Props["onPlay"];
    onPause?: Props["onPause"];
    onStop?: Props["onStop"];
    onComplete?: Props["onComplete"];
    onLoop?: Props["onLoop"];
    onEnterFrame?: Props["onEnterFrame"];
  }>({});

  useLayoutEffect(() => {
    lottieActionCallbacksRef.current = {
      onPlay,
      onPause,
      onStop,
      onComplete,
      onLoop,
      onEnterFrame,
    };
  }, [onPlay, onPause, onStop, onComplete, onLoop, onEnterFrame]);

  const handleFire = useCallback((action: unknown, event?: Record<string, unknown>) => {
    if (action) firePeblorAction(action as PeblorAction, "system", event);
  }, []);

  // Capture load-time options in a ref so the load effect doesn't need them as
  // deps — re-running on loop/autoplay/interactivity/onEvent changes would destroy
  // the Lottie instance causing flicker, lost playback state, and redundant work.
  const loadOptionsRef = useRef({
    loop,
    autoplay,
    preserveAspectRatio,
    interactivity,
    onEvent,
    handleFire,
  });
  useEffect(() => {
    loadOptionsRef.current = {
      loop,
      autoplay,
      preserveAspectRatio,
      interactivity,
      onEvent,
      handleFire,
    };
  });

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    setLoadError(false);
    const opts = loadOptionsRef.current;
    const lottieListeners: Array<{ event: string; handler: (evt?: unknown) => void }> = [];

    import("lottie-web").then((lottie) => {
      if (cancelled || !container) return;
      const anim = lottie.default.loadAnimation({
        container,
        renderer: renderer as "svg" | "canvas" | "html" | undefined,
        loop: typeof opts.loop === "number" ? opts.loop : (opts.loop ?? false),
        autoplay: opts.autoplay ?? false,
        path: src,
        rendererSettings: {
          preserveAspectRatio: opts.preserveAspectRatio ?? "xMidYMid meet",
        },
      });
      instanceRef.current = anim;

      const onDataFailed = () => {
        if (!cancelled) setLoadError(true);
      };
      anim.addEventListener("data_failed", onDataFailed);
      lottieListeners.push({ event: "data_failed", handler: onDataFailed });

      const onComplete = () => {
        opts.handleFire(lottieActionCallbacksRef.current.onComplete, { event: "complete" });
      };
      anim.addEventListener("complete", onComplete);
      lottieListeners.push({ event: "complete", handler: onComplete });

      const onLoopComplete = () => {
        opts.handleFire(lottieActionCallbacksRef.current.onLoop, { event: "loopComplete" });
      };
      anim.addEventListener("loopComplete", onLoopComplete);
      lottieListeners.push({ event: "loopComplete", handler: onLoopComplete });

      const onEnterFrame = () => {
        opts.handleFire(lottieActionCallbacksRef.current.onEnterFrame, { event: "enterFrame" });
      };
      anim.addEventListener("enterFrame", onEnterFrame);
      lottieListeners.push({ event: "enterFrame", handler: onEnterFrame });

      if (opts.interactivity && opts.interactivity.length > 0) {
        const animObj = anim as {
          addEventListener?: (e: string, cb: () => void) => void;
          removeEventListener?: (e: string, cb: () => void) => void;
        };
        for (const binding of opts.interactivity) {
          const handler = (evt?: unknown) => {
            opts.handleFire(binding.action, {
              event: binding.event,
              data: evt as Record<string, unknown>,
            });
          };
          animObj.addEventListener?.(binding.event, handler);
          lottieListeners.push({ event: binding.event, handler });
        }
      }

      if (opts.onEvent && opts.onEvent.length > 0) {
        const animObj = anim as {
          addEventListener?: (e: string, cb: (evt?: unknown) => void) => void;
        };
        for (const binding of opts.onEvent) {
          const handler = (evt?: unknown) => {
            for (const action of binding.actions) {
              opts.handleFire(action, {
                event: binding.event,
                data: evt as Record<string, unknown>,
              });
            }
          };
          animObj.addEventListener?.(binding.event, handler);
          lottieListeners.push({ event: binding.event, handler });
        }
      }

      if (!cancelled) {
        if (opts.autoplay)
          opts.handleFire(lottieActionCallbacksRef.current.onPlay, { event: "play" });
        setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        const anim = instanceRef.current as {
          destroy?: () => void;
          removeEventListener?: (e: string, cb: () => void) => void;
        };
        for (const { event, handler } of lottieListeners) {
          anim.removeEventListener?.(event, handler);
        }
        anim.destroy?.();
        instanceRef.current = null;
      }
    };
  }, [src, renderer]);

  // Imperative property updates without full destroy / load.
  useEffect(() => {
    const anim = instanceRef.current as {
      setSpeed?: (v: number) => void;
      setDirection?: (v: 1 | -1) => void;
    } | null;
    if (!anim) return;
    if (speed !== 1) anim.setSpeed?.(speed);
    if (direction === -1) anim.setDirection?.(-1);
  }, [speed, direction]);

  useEffect(() => {
    const anim = instanceRef.current as {
      playSegments?: (segments: [number, number], forceFlag: boolean) => void;
    } | null;
    if (!anim || !segment) return;
    anim.playSegments?.([segment[0], segment[1]], true);
  }, [segment]);

  useEffect(() => {
    const anim = instanceRef.current as {
      setDirection?: (v: 1 | -1) => void;
      playDirection?: number;
    } | null;
    if (!anim || !playMode) return;
    if (playMode === "bounce") {
      const pd = anim.playDirection ?? 1;
      anim.setDirection?.((pd * -1) as 1 | -1);
    } else if (playMode === "reverse") {
      anim.setDirection?.(-1);
    }
  }, [playMode]);

  useEffect(() => {
    const anim = instanceRef.current as {
      loop?: boolean | number;
    } | null;
    if (!anim) return;
    if (typeof loop === "boolean" || typeof loop === "number") {
      anim.loop = loop;
    }
  }, [loop]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<PeblorTriggerDetail>).detail;
      const action = detail?.action;
      if (!action || typeof action.type !== "string") return;
      const actionType = String(action.type);

      const payload = action.payload as Record<string, unknown> | undefined;
      const targetId =
        typeof payload?.id === "string"
          ? payload.id
          : typeof payload?.target === "string"
            ? payload.target
            : undefined;
      if (!shouldApplyMediaTarget(id, targetId ?? null)) return;

      const anim = instanceRef.current as {
        play?: () => void;
        pause?: () => void;
        stop?: () => void;
        goToAndStop?: (value: number, isFrame?: boolean) => void;
        isPaused?: boolean;
      } | null;
      if (!anim) return;

      switch (actionType) {
        case "assetPlay":
          anim.play?.();
          handleFire(lottieActionCallbacksRef.current.onPlay, { event: "play" });
          return;
        case "assetPause":
          anim.pause?.();
          handleFire(lottieActionCallbacksRef.current.onPause, { event: "pause" });
          return;
        case "assetTogglePlay":
          if (anim.isPaused === false) {
            anim.pause?.();
            handleFire(lottieActionCallbacksRef.current.onPause, { event: "pause" });
          } else {
            anim.play?.();
            handleFire(lottieActionCallbacksRef.current.onPlay, { event: "play" });
          }
          return;
        case "assetSeek": {
          const frame = typeof payload?.time === "number" ? payload.time : 0;
          anim.goToAndStop?.(frame, true);
          return;
        }
        default:
          return;
      }
    };

    const busUnsub = subscribeToElementActions(id ?? "lottie", (rawAction) => {
      const syntheticEvent = new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
        detail: { action: rawAction as PeblorAction, source: "system" },
      });
      listener(syntheticEvent);
    });
    window.addEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    return () => {
      busUnsub();
      window.removeEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    };
  }, [handleFire, id]);

  const handleMouseEnter = useCallback(() => {
    if (hover && instanceRef.current) {
      (instanceRef.current as { play?: () => void }).play?.();
      handleFire(lottieActionCallbacksRef.current.onPlay, { event: "play" });
    }
  }, [hover, handleFire]);

  const handleMouseLeave = useCallback(() => {
    if (hover && instanceRef.current) {
      (instanceRef.current as { pause?: () => void }).pause?.();
      handleFire(lottieActionCallbacksRef.current.onPause, { event: "pause" });
    }
  }, [hover, handleFire]);

  const objectFitClass =
    objectFit === "contain"
      ? "object-contain"
      : objectFit === "fillWidth"
        ? "object-fill-w"
        : objectFit === "fillHeight"
          ? "object-fill-h"
          : "object-cover";

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: selfAlign as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex: layer,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    bgBlur,
    hidden,
  };

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div
        ref={containerRef}
        className={`relative w-full h-full ${objectFitClass}`}
        role="img"
        aria-label={ariaLabel}
        data-element-id={id}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: backgroundColor as string | undefined,
          aspectRatio: aspectRatio as string | undefined,
        }}
      >
        {poster && !loaded && !loadError && (
          <Image src={poster} alt="" fill sizes="100vw" className="object-cover" />
        )}
        {loadError && (
          <span
            className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
            role="status"
          >
            {isApprovedAssetUrl(src) ? "Animation failed to load." : THIRD_PARTY_ASSET_MESSAGE}
          </span>
        )}
      </div>
    </ElementLayoutWrapper>
  );
}
