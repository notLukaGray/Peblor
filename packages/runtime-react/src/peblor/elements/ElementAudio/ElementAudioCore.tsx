"use client";

import { useCallback, useEffect, useRef } from "react";

type AudioCoreProps = {
  src: string;
  sources?: Array<{ src: string; type?: string }>;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** When true, browser default playback UI (HTML `controls` attribute). */
  controls?: boolean;
  preload?: string;
  ariaLabel?: string;
  playbackRate?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onVolumeChange?: () => void;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
  setRef?: (el: HTMLAudioElement | null) => void;
  className?: string;
};

export function ElementAudioCore({
  src,
  sources,
  autoplay,
  loop,
  muted,
  controls: nativeControls,
  preload,
  ariaLabel,
  playbackRate,
  onPlay,
  onPause,
  onEnded,
  onVolumeChange,
  onTimeUpdate,
  onLoadedMetadata,
  setRef,
  className,
}: AudioCoreProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleRef = useCallback(
    (el: HTMLAudioElement | null) => {
      audioRef.current = el;
      setRef?.(el);
    },
    [setRef]
  );

  useEffect(() => {
    if (!audioRef.current || playbackRate == null) return;
    audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  return (
    <audio
      ref={handleRef}
      src={src}
      controls={nativeControls ?? false}
      autoPlay={autoplay ?? false}
      loop={loop ?? false}
      muted={muted ?? false}
      preload={preload ?? "metadata"}
      aria-label={ariaLabel !== undefined ? ariaLabel : !nativeControls ? "Audio" : undefined}
      onPlay={onPlay}
      onPause={onPause}
      onEnded={onEnded}
      onVolumeChange={onVolumeChange}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      className={className}
    >
      {sources?.map((s, i) => (
        <source key={i} src={s.src} type={s.type} />
      ))}
    </audio>
  );
}
