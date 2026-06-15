"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";

export type FeedbackType = "play" | "pause" | "seekForward" | "seekBack";

export type AudioPlayerState = {
  isPlaying: boolean;
  showControls: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  feedback: { type: FeedbackType; at: number } | null;
};

const FEEDBACK_DURATION_MS = MOTION_DEFAULTS.defaultFeedbackDurationMs;

export function useAudioPlayerState(initiallyVisible = true) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(initiallyVisible);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    at: number;
  } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const showFeedback = useCallback((type: FeedbackType) => {
    const now = Date.now();
    setFeedback({ type, at: now });
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  return {
    isPlaying,
    setIsPlaying,
    showControls,
    setShowControls,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    feedback,
    showFeedback,
  };
}
