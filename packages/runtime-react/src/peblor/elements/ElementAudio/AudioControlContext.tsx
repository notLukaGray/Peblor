"use client";

import { createContext, useContext } from "react";

export type FeedbackType = "play" | "pause" | "seekBack" | "seekForward";

export type AudioControlContextValue = {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  feedback: { type: FeedbackType; at: number } | null;
  onTogglePlay: () => void;
  onSeek: (deltaSeconds: number) => void;
  onSeekTo: (seconds: number) => void;
  onVolumeChange: (value: number) => void;
  onMuteToggle: () => void;
  showFeedback: (type: FeedbackType) => void;
  resolveShowWhen: (showWhen: string | undefined) => boolean;
  getActionHandler: (action: string | undefined, payload?: number) => (() => void) | undefined;
};

export const AudioControlContext = createContext<AudioControlContextValue | null>(null);

export function useAudioControlContext(): AudioControlContextValue | null {
  return useContext(AudioControlContext);
}
