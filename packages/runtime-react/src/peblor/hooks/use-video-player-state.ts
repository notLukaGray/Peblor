"use client";

import { useState, useEffect, useCallback } from "react";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";

export type FeedbackType = "play" | "pause" | "seekBack" | "seekForward";

export type VideoPlayerState = {
  isPlaying: boolean;
  showControls: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  feedback: { type: FeedbackType; at: number } | null;
};

export type UseVideoPlayerStateParams = {
  autoplay?: boolean;
  muted?: boolean;
  feedbackDurationMs?: number;
};

export type UseVideoPlayerStateResult = VideoPlayerState & {
  setPlaying: (v: boolean) => void;
  setShowControls: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setFullscreen: (v: boolean) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  setFeedback: (v: { type: FeedbackType; at: number } | null) => void;
  showFeedback: (type: FeedbackType) => void;
};

export function useVideoPlayerState({
  autoplay = false,
  muted = false,
  feedbackDurationMs = MOTION_DEFAULTS.defaultFeedbackDurationMs,
}: UseVideoPlayerStateParams = {}): UseVideoPlayerStateResult {
  const [isPlaying, setPlaying] = useState(autoplay);
  const [showControls, setShowControls] = useState(autoplay);
  const [volume, setVolume] = useState(1);
  const [isMuted, setMuted] = useState(muted);
  const [isFullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; at: number } | null>(null);

  const showFeedback = useCallback((type: FeedbackType) => {
    setFeedback({ type, at: Date.now() });
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), feedbackDurationMs);
    return () => clearTimeout(t);
  }, [feedback, feedbackDurationMs]);

  return {
    isPlaying,
    showControls,
    volume,
    isMuted,
    isFullscreen,
    currentTime,
    duration,
    feedback,
    setPlaying,
    setShowControls,
    setVolume,
    setMuted,
    setFullscreen,
    setCurrentTime,
    setDuration,
    setFeedback,
    showFeedback,
  };
}
