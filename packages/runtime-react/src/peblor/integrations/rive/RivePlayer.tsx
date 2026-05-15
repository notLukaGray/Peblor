"use client";

/**
 * RivePlayer — wraps @rive-app/react-canvas behind the integration boundary.
 * Nothing outside src/peblor/integrations/rive/ imports from @rive-app/react-canvas.
 */

import { useRive, Layout, Fit, Alignment, EventType } from "@rive-app/react-canvas";
import type { Rive } from "@rive-app/react-canvas";
import { useEffect } from "react";

export type RivePlayerProps = {
  /** URL to the .riv file. */
  src: string;
  /** Artboard name; defaults to the first artboard in the file. */
  artboard?: string;
  /** State machine name to load. */
  stateMachine?: string;
  /** Whether to start playback automatically (default true). */
  autoplay?: boolean;
  /** State machine boolean/number inputs to apply after the Rive instance is ready. */
  riveInputs?: Record<string, boolean | number>;
  /** Callback fired when the active state machine changes states. */
  onStateChange?: (stateName: string) => void;
  /** Ref forwarded to the raw Rive instance for imperative control. */
  riveRef?: React.MutableRefObject<Rive | null>;
  className?: string;
  style?: React.CSSProperties;
  /** aria-label for the canvas wrapper. */
  ariaLabel?: string;
  /** Fire when animation starts playing. */
  onPlay?: () => void;
  /** Fire when animation pauses. */
  onPause?: () => void;
  /** Fire when animation completes (non-looping). */
  onComplete?: () => void;
  /** Fire on each loop iteration. */
  onLoop?: () => void;
  /** Fire when animation stops. */
  onStop?: () => void;
  /** Playback speed multiplier. */
  speed?: number;
  /** Preserve aspect ratio for the canvas (default "xMidYMid meet"). */
  preserveAspectRatio?: string;
};

export function RivePlayer({
  src,
  artboard,
  stateMachine,
  autoplay = true,
  riveInputs,
  onStateChange,
  riveRef,
  className,
  style,
  ariaLabel,
  onPlay,
  onPause,
  onComplete,
  onLoop,
  onStop,
  preserveAspectRatio,
}: RivePlayerProps) {
  const { rive, RiveComponent } = useRive(
    {
      src,
      artboard,
      stateMachines: stateMachine ? [stateMachine] : undefined,
      autoplay,
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onStateChange: onStateChange
        ? (event) => {
            const states = (event as { data?: string[] }).data;
            if (Array.isArray(states)) {
              for (const s of states) onStateChange(s);
            }
          }
        : undefined,
    },
    { shouldResizeCanvasToContainer: true }
  );

  useEffect(() => {
    if (riveRef !== undefined) {
      riveRef.current = rive ?? null;
    }
  }, [rive, riveRef]);

  useEffect(() => {
    if (!rive || !riveInputs) return;
    for (const [name, value] of Object.entries(riveInputs)) {
      try {
        const input = stateMachine
          ? rive.stateMachineInputs(stateMachine)?.find((i) => i.name === name)
          : undefined;
        if (!input) continue;
        input.value = value;
      } catch {
        // Input may not exist in this artboard; silently skip.
      }
    }
  }, [rive, riveInputs, stateMachine]);

  useEffect(() => {
    if (!rive || !onPlay) return;
    const handler = () => onPlay();
    rive.on(EventType.Play, handler);
    return () => {
      rive.off(EventType.Play, handler);
    };
  }, [rive, onPlay]);

  useEffect(() => {
    if (!rive || !onPause) return;
    const handler = () => onPause();
    rive.on(EventType.Pause, handler);
    return () => {
      rive.off(EventType.Pause, handler);
    };
  }, [rive, onPause]);

  useEffect(() => {
    if (!rive || !onComplete) return;
    const handler = () => onComplete();
    rive.on(EventType.Stop, handler);
    return () => {
      rive.off(EventType.Stop, handler);
    };
  }, [rive, onComplete]);

  useEffect(() => {
    if (!rive || !onLoop) return;
    const handler = () => onLoop();
    rive.on(EventType.Loop, handler);
    return () => {
      rive.off(EventType.Loop, handler);
    };
  }, [rive, onLoop]);

  useEffect(() => {
    if (!rive || !onStop) return;
    const handler = () => onStop();
    rive.on(EventType.Stop, handler);
    return () => {
      rive.off(EventType.Stop, handler);
    };
  }, [rive, onStop]);

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
      role="img"
      aria-label={ariaLabel ?? "Rive animation"}
      data-preserve-aspect-ratio={preserveAspectRatio}
    >
      <RiveComponent style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
