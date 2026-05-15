"use client";

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from "react";
import Image from "next/image";
import type { ElementBlock } from "@pb/contracts/types";
import type { PeblorAction } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { firePeblorAction } from "@/peblor/triggers";

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
  ariaLabel,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<unknown>(null);
  const [loaded, setLoaded] = useState(false);

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

  const handleFire = useCallback((action: unknown) => {
    if (action) firePeblorAction(action as PeblorAction, "system");
  }, []);

  /*
   * Load / destroy is intentionally keyed only on `src` and `renderer`.
   *
   * Adding typical React hook deps here (loop, autoplay, preserveAspectRatio,
   * interactivity, or inline `on*` handler identities) would re-run this effect,
   * destroying the lottie instance and calling `loadAnimation` again: visible
   * flicker, lost playback state, and redundant network/decoding work. Those
   * concerns are split: imperative updates use the follow-up effects; initial
   * load-time options intentionally stay tied to the last full reload.
   *
   * Event handlers registered on the animation must not close over stale `on*`
   * props from the first mount when the parent re-renders with new action
   * objects but the same asset — `lottieActionCallbacksRef` holds the latest
   * callbacks without widening deps or changing reload semantics.
   *
   * Interactivity bindings are still registered at load time; changing the
   * interactivity list without changing `src`/`renderer` may require a future
   * dedicated pass (listener diff or explicit reload contract).
   */
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const lottieListeners: Array<{ event: string; handler: () => void }> = [];

    import("lottie-web").then((lottie) => {
      if (cancelled || !container) return;
      const anim = lottie.default.loadAnimation({
        container,
        renderer: renderer as "svg" | "canvas" | "html" | undefined,
        loop: typeof loop === "number" ? loop : (loop ?? false),
        autoplay: autoplay ?? false,
        path: src,
        rendererSettings: {
          preserveAspectRatio: preserveAspectRatio ?? "xMidYMid meet",
        },
      });
      instanceRef.current = anim;

      const onComplete = () => {
        const { onComplete: oc, onStop: os } = lottieActionCallbacksRef.current;
        handleFire(oc);
        handleFire(os);
      };
      anim.addEventListener("complete", onComplete);
      lottieListeners.push({ event: "complete", handler: onComplete });

      const onLoopComplete = () => {
        handleFire(lottieActionCallbacksRef.current.onLoop);
      };
      anim.addEventListener("loopComplete", onLoopComplete);
      lottieListeners.push({ event: "loopComplete", handler: onLoopComplete });

      const onEnterFrame = () => {
        handleFire(lottieActionCallbacksRef.current.onEnterFrame);
      };
      anim.addEventListener("enterFrame", onEnterFrame);
      lottieListeners.push({ event: "enterFrame", handler: onEnterFrame });

      if (interactivity && interactivity.length > 0) {
        const animObj = anim as {
          addEventListener?: (e: string, cb: () => void) => void;
          removeEventListener?: (e: string, cb: () => void) => void;
        };
        for (const binding of interactivity) {
          const handler = () => {
            handleFire(binding.action);
          };
          animObj.addEventListener?.(binding.event, handler);
          lottieListeners.push({ event: binding.event, handler });
        }
      }

      if (!cancelled) {
        if (autoplay) handleFire(lottieActionCallbacksRef.current.onPlay);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleMouseEnter = useCallback(() => {
    if (hover && instanceRef.current) {
      (instanceRef.current as { play?: () => void }).play?.();
      handleFire(lottieActionCallbacksRef.current.onPlay);
    }
  }, [hover, handleFire]);

  const handleMouseLeave = useCallback(() => {
    if (hover && instanceRef.current) {
      (instanceRef.current as { pause?: () => void }).pause?.();
      handleFire(lottieActionCallbacksRef.current.onPause);
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
    align: align as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
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
        {poster && !loaded && (
          <Image src={poster} alt="" fill sizes="100vw" className="object-cover" />
        )}
      </div>
    </ElementLayoutWrapper>
  );
}
