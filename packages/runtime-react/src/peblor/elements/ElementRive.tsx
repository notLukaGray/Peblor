"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import type { ElementBlock } from "@pb/contracts/types";
import type { PeblorAction } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { RivePlayer, type Rive } from "@/peblor/integrations/rive";
import { firePeblorAction } from "@/peblor/triggers";
import { useRiveTriggerControls } from "./ElementRive/use-rive-trigger-controls";
import {
  isApprovedAssetUrl,
  THIRD_PARTY_ASSET_MESSAGE,
} from "@pb/runtime-react/core/lib/asset-host";

type Props = Extract<ElementBlock, { type: "elementRive" }>;

export function ElementRive(props: Props) {
  const {
    id,
    src,
    poster,
    artboard,
    stateMachine,
    autoplay,
    loop,
    speed,
    preserveAspectRatio,
    objectFit,
    aspectRatio,
    interactivity,
    onStateChange,
    onPlay,
    onPause,
    onComplete,
    onLoop,
    onStop,
    backgroundColor,
    hover,
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
  } = props;

  const riveRef = useRef<Rive | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoadError(false);
  }

  const handleLoadError = useCallback(() => {
    setLoadError(true);
  }, []);

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

  useRiveTriggerControls({ id, riveRef, stateMachine });

  // Wire interactivity: map events to state machine inputs
  useEffect(() => {
    if (!interactivity || interactivity.length === 0 || !riveRef.current || !stateMachine) return;
    const rive = riveRef.current as unknown as {
      stateMachineInputs?: (name: string) => Array<{ name: string; value: boolean | number }>;
    };
    const inputs = rive.stateMachineInputs?.(stateMachine) ?? [];
    for (const binding of interactivity) {
      const input = inputs.find((i) => i.name === binding.input);
      if (input && binding.value !== undefined) {
        input.value = binding.value as boolean | number;
      }
    }
  }, [interactivity, stateMachine]);

  const handleStateChange = useCallback(
    (stateName: string) => {
      if (!onStateChange) return;
      const enriched = {
        ...onStateChange,
        payload:
          onStateChange.payload && typeof onStateChange.payload === "object"
            ? { ...onStateChange.payload, stateName }
            : { stateName },
      } as PeblorAction;
      firePeblorAction(enriched, "system", { stateName });
    },
    [onStateChange]
  );

  const handleComplete = useCallback(() => {
    setLoaded(true);
    if (onComplete) firePeblorAction(onComplete as PeblorAction, "system", { event: "complete" });
  }, [onComplete]);

  const handlePlay = useCallback(() => {
    if (onPlay) firePeblorAction(onPlay as PeblorAction, "system", { event: "play" });
  }, [onPlay]);

  const handlePause = useCallback(() => {
    if (onPause) firePeblorAction(onPause as PeblorAction, "system", { event: "pause" });
  }, [onPause]);

  const handleStop = useCallback(() => {
    if (onStop) firePeblorAction(onStop as PeblorAction, "system", { event: "stop" });
  }, [onStop]);

  // Track loop count for numeric loop limits
  const loopCountRef = useRef(0);
  const handleLoopWithCount = useCallback(() => {
    loopCountRef.current += 1;
    if (typeof loop === "number" && loopCountRef.current >= loop) {
      riveRef.current?.stop();
      if (onComplete)
        firePeblorAction(onComplete as PeblorAction, "system", {
          event: "complete",
          loopCount: loopCountRef.current,
        });
    }
    if (onLoop)
      firePeblorAction(onLoop as PeblorAction, "system", {
        event: "loop",
        loopCount: loopCountRef.current,
      });
  }, [loop, onLoop, onComplete]);

  const handleMouseEnter = useCallback(() => {
    if (hover && riveRef.current) riveRef.current.play();
  }, [hover]);

  const handleMouseLeave = useCallback(() => {
    if (hover && riveRef.current) riveRef.current.pause();
  }, [hover]);

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <div
        className={`relative w-full h-full min-h-0 min-w-0 flex-1 ${objectFitClass}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={hover ? handleMouseEnter : undefined}
        onBlur={hover ? handleMouseLeave : undefined}
        tabIndex={hover ? 0 : undefined}
        aria-label={
          hover
            ? typeof ariaLabel === "string" && ariaLabel.trim() !== ""
              ? ariaLabel
              : "Rive animation — plays while focused or hovered"
            : undefined
        }
        style={{
          backgroundColor: backgroundColor as string | undefined,
          aspectRatio: aspectRatio as string | undefined,
        }}
      >
        {poster && !loaded && !loadError && (
          <Image src={poster} alt="" fill sizes="100vw" className="object-cover" />
        )}
        {loadError ? (
          <span
            className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm"
            role="status"
          >
            {isApprovedAssetUrl(src) ? "Animation failed to load." : THIRD_PARTY_ASSET_MESSAGE}
          </span>
        ) : (
          <RivePlayer
            src={src}
            artboard={artboard}
            stateMachine={stateMachine}
            autoplay={autoplay ?? true}
            onStateChange={onStateChange ? handleStateChange : undefined}
            riveRef={riveRef}
            ariaLabel={ariaLabel}
            className="absolute inset-0"
            onPlay={onPlay ? handlePlay : undefined}
            onPause={onPause ? handlePause : undefined}
            onComplete={onComplete ? handleComplete : undefined}
            onLoop={onLoop || typeof loop === "number" ? handleLoopWithCount : undefined}
            onStop={onStop ? handleStop : undefined}
            speed={speed}
            preserveAspectRatio={preserveAspectRatio}
            onLoadError={handleLoadError}
          />
        )}
      </div>
    </ElementLayoutWrapper>
  );
}
