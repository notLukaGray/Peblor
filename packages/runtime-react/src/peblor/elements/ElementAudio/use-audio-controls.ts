"use client";

import { useCallback, useRef, useEffect } from "react";

type UseAudioControlsParams = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  setPlaying: (v: boolean) => void;
  setShowControls: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  sleepAfterMs: number;
};

export function useAudioControls({
  audioRef,
  isPlaying,
  setPlaying,
  setShowControls,
  setVolume,
  setMuted,
  setCurrentTime,
  setDuration,
  sleepAfterMs,
}: UseAudioControlsParams) {
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), sleepAfterMs);
    }
  }, [cancelHide, isPlaying, sleepAfterMs, setShowControls]);

  useEffect(() => {
    return () => cancelHide();
  }, [cancelHide]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [setShowControls, scheduleHide]);

  const handleTogglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      const promise = a.play();
      if (promise) {
        promise.catch(() => {});
      }
    } else {
      a.pause();
    }
  }, [audioRef]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    showControlsTemporarily();
  }, [setPlaying, showControlsTemporarily]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    cancelHide();
    setShowControls(true);
  }, [setPlaying, cancelHide, setShowControls]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    cancelHide();
    setShowControls(true);
  }, [setPlaying, cancelHide, setShowControls]);

  const handleSeek = useCallback(
    (deltaSeconds: number) => {
      const a = audioRef.current;
      if (!a) return;
      const next = Math.max(0, Math.min(a.duration || 0, a.currentTime + deltaSeconds));
      a.currentTime = next;
      setCurrentTime(next);
    },
    [audioRef, setCurrentTime]
  );

  const handleSeekTo = useCallback(
    (seconds: number) => {
      const a = audioRef.current;
      if (!a) return;
      const dur = Number.isFinite(a.duration) ? a.duration : 0;
      const next = Math.max(0, Math.min(dur, seconds));
      a.currentTime = next;
      setCurrentTime(next);
    },
    [audioRef, setCurrentTime]
  );

  const handleVolumeChange = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      setVolume(a.volume);
      setMuted(a.muted);
    }
  }, [audioRef, setVolume, setMuted]);

  const handleVolumeSet = useCallback(
    (v: number) => {
      const a = audioRef.current;
      if (a) {
        a.volume = v;
        a.muted = v === 0;
        setVolume(v);
        setMuted(v === 0);
      }
    },
    [audioRef, setVolume, setMuted]
  );

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.muted = !a.muted;
      setMuted(a.muted);
    }
  }, [audioRef, setMuted]);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (a) setCurrentTime(a.currentTime);
  }, [audioRef, setCurrentTime]);

  const onLoadedMetadata = useCallback(() => {
    const a = audioRef.current;
    if (a) setDuration(a.duration);
  }, [audioRef, setDuration]);

  return {
    handleTogglePlay,
    handlePlay,
    handlePause,
    handleEnded,
    handleSeek,
    handleSeekTo,
    handleVolumeChange,
    handleVolumeSet,
    toggleMute,
    onTimeUpdate,
    onLoadedMetadata,
    showControlsTemporarily,
    scheduleHide,
    cancelHide,
  };
}
