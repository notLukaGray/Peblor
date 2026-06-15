"use client";

import { useRef, useCallback, useEffect } from "react";
import type { VideoPlayerState } from "./use-video-player-state";

/**
 * Video control visibility rules (see video-control-visibility-rules.ts):
 * - SHOW: on pointer enter, pointer move, pause, or exit fullscreen.
 * - HIDE: after no pointer movement for sleepAfterMs (only while playing).
 * - TRANSITION: fade over controlsTransitionMs (Framer Motion), never instant.
 * - EXIT FULLSCREEN: show controls and cancel hide timeout.
 */

export type UseVideoControlsParams = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: VideoPlayerState;
  setPlaying: (v: boolean) => void;
  setShowControls: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  /** Inactivity hide delay in ms (from module behavior.sleepAfterMs). */
  sleepAfterMs: number;
  loop: boolean;
  startLoad?: (currentTime?: number) => void;
};

export type UseVideoControlsResult = {
  scheduleHideControls: () => void;
  cancelHideControls: () => void;
  showControlsTemporarily: () => void;
  play: () => Promise<boolean>;
  pause: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleEnded: () => void;
  handleVolumeChange: () => void;
  handleVolumeSet: (v: number) => void;
  toggleMute: () => void;
  handleSeek: (deltaSeconds: number) => void;
  handleSeekTo: (seconds: number) => void;
  handleTogglePlay: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onDurationChange: () => void;
};

export function useVideoControls({
  videoRef,
  state,
  setPlaying,
  setShowControls,
  setVolume,
  setMuted,
  setCurrentTime,
  setDuration,
  sleepAfterMs,
  loop,
  startLoad,
}: UseVideoControlsParams): UseVideoControlsResult {
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFullscreenRef = useRef(state.isFullscreen);
  const setShowControlsRef = useRef(setShowControls);
  const fullscreenExitAtRef = useRef<number>(0);

  useEffect(() => {
    setShowControlsRef.current = setShowControls;
  }, [setShowControls]);

  /** After exiting fullscreen, ignore hide scheduling for a short time so spurious leave doesn't hide the UI. */
  const FULLSCREEN_EXIT_GRACE_MS = 400;

  const cancelHideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    const now = Date.now();
    if (
      fullscreenExitAtRef.current &&
      now - fullscreenExitAtRef.current < FULLSCREEN_EXIT_GRACE_MS
    ) {
      return;
    }
    cancelHideControls();
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControlsRef.current(false);
      hideControlsTimeoutRef.current = null;
    }, sleepAfterMs);
  }, [cancelHideControls, sleepAfterMs]);

  /** Show UI and reset inactivity timer. Called on enter/move. When playing, schedule hide; when paused, cancel so bar stays visible. */
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (state.isPlaying) scheduleHideControls();
    else cancelHideControls();
  }, [setShowControls, state.isPlaying, scheduleHideControls, cancelHideControls]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    setShowControls(true);
    scheduleHideControls();
  }, [setPlaying, setShowControls, scheduleHideControls]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    setShowControls(true);
    cancelHideControls();
  }, [setPlaying, setShowControls, cancelHideControls]);

  const handleEnded = useCallback(() => {
    if (!loop) {
      setPlaying(false);
      setShowControls(true);
      cancelHideControls();
    }
  }, [loop, setPlaying, setShowControls, cancelHideControls]);

  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setMuted(video.muted);
  }, [setVolume, setMuted, videoRef]);

  const handleVolumeSet = useCallback(
    (v: number) => {
      setVolume(v);
      const video = videoRef.current;
      if (video) {
        video.volume = v;
        video.muted = v === 0;
        setMuted(v === 0);
      }
    },
    [setVolume, setMuted, videoRef]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted) setVolume(video.volume);
  }, [setMuted, setVolume, videoRef]);

  const handleSeek = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = Math.max(0, Math.min(video.duration, video.currentTime + deltaSeconds));
      video.currentTime = next;
    },
    [videoRef]
  );

  const handleSeekTo = useCallback(
    (seconds: number) => {
      const video = videoRef.current;
      if (!video) return;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const next = Math.max(0, Math.min(duration, seconds));
      video.currentTime = next;
      setCurrentTime(next);
    },
    [setCurrentTime, videoRef]
  );

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;
    startLoad?.(video.currentTime);
    try {
      await video.play();
      return true;
    } catch (err) {
      console.warn("[pb-runtime-react] Failed to play video", err);
      return false;
    }
  }, [startLoad, videoRef]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, [videoRef]);

  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void play();
    } else {
      pause();
    }
  }, [pause, play, videoRef]);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (v) setCurrentTime(v.currentTime);
  }, [setCurrentTime, videoRef]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) setDuration(v.duration);
  }, [setDuration, videoRef]);

  const onDurationChange = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) setDuration(v.duration);
  }, [setDuration, videoRef]);

  useEffect(() => {
    if (state.isPlaying) scheduleHideControls();
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [state.isPlaying, scheduleHideControls]);

  // Rule: on exit fullscreen, show controls and cancel hide so UI is visible in normal view.
  // Defer show to next frame so we run after any synchronous pointerleave from fullscreen teardown;
  // then ignore scheduleHideControls for a short grace period so spurious leave doesn't hide again.
  useEffect(() => {
    const wasFullscreen = prevFullscreenRef.current;
    prevFullscreenRef.current = state.isFullscreen;
    let frameId: number | null = null;
    let mounted = true;
    if (wasFullscreen && !state.isFullscreen) {
      fullscreenExitAtRef.current = Date.now();
      cancelHideControls();
      frameId = requestAnimationFrame(() => {
        if (mounted) setShowControlsRef.current(true);
      });
    }
    return () => {
      mounted = false;
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [state.isFullscreen, cancelHideControls]);

  return {
    scheduleHideControls,
    cancelHideControls,
    showControlsTemporarily,
    play,
    pause,
    handlePlay,
    handlePause,
    handleEnded,
    handleVolumeChange,
    handleVolumeSet,
    toggleMute,
    handleSeek,
    handleSeekTo,
    handleTogglePlay,
    onTimeUpdate,
    onLoadedMetadata,
    onDurationChange,
  };
}
