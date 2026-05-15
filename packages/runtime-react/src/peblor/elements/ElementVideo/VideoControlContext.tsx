"use client";

import { createContext, useContext } from "react";
import type { ElementVideoQualityLevel } from "./use-element-video-source";

export type FeedbackType = "play" | "pause" | "seekBack" | "seekForward";

export type VideoControlContextValue = {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  /** Ephemeral touch feedback: type shown + timestamp. Cleared after feedbackDurationMs. */
  feedback: { type: FeedbackType; at: number } | null;
  qualityLevels: ElementVideoQualityLevel[];
  selectedQuality: string;
  setSelectedQuality: (value: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onTogglePlay: () => void;
  onSeek: (deltaSeconds: number) => void;
  onSeekTo: (seconds: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  /** Trigger a brief touch-zone feedback flash (play/pause/seekBack/seekForward). */
  showFeedback: (type: FeedbackType) => void;
  /** Resolve showWhen from JSON (playing, paused, muted, etc.) – keeps elements context-agnostic. */
  resolveShowWhen: (showWhen: string | undefined) => boolean;
  /** Get action handler from JSON action + payload – keeps elements context-agnostic. */
  getActionHandler: (action: string | undefined, payload?: number) => (() => void) | undefined;
};

export const VideoControlContext = createContext<VideoControlContextValue | null>(null);

export function useVideoControlContext(): VideoControlContextValue | null {
  return useContext(VideoControlContext);
}
