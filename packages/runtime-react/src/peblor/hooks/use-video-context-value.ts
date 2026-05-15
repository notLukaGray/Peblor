"use client";

import type { ModuleBlock } from "@pb/contracts/types";
import { resolveVideoShowWhen, getVideoActionHandler } from "@pb/core/media";
import type { UseVideoPlayerStateResult } from "./use-video-player-state";
import type { VideoControlContextValue } from "@/peblor/elements/ElementVideo/VideoControlContext";
import type { UseVideoControlsResult } from "./use-video-controls";
import type { UseVideoFullscreenResult } from "./use-video-fullscreen";
import type { ElementVideoSourceState } from "@/peblor/elements/ElementVideo/use-element-video-source";

export type UseVideoContextValueParams = {
  moduleConfig: ModuleBlock | undefined;
  state: UseVideoPlayerStateResult;
  controls: UseVideoControlsResult;
  fullscreen: UseVideoFullscreenResult;
  sourceState: ElementVideoSourceState;
};

export function useVideoContextValue({
  moduleConfig,
  state,
  controls,
  fullscreen,
  sourceState,
}: UseVideoContextValueParams): VideoControlContextValue | null {
  if (!moduleConfig) return null;
  const showWhenState = {
    isPlaying: state.isPlaying,
    isMuted: state.isMuted,
    isFullscreen: state.isFullscreen,
  };
  const handlers = {
    onPlay: () => {
      void controls.play();
    },
    onPause: controls.pause,
    onTogglePlay: controls.handleTogglePlay,
    onSeek: controls.handleSeek,
    onSeekTo: controls.handleSeekTo,
    onMuteToggle: controls.toggleMute,
    onFullscreenToggle: fullscreen.toggleFullscreen,
  };
  return {
    isPlaying: state.isPlaying,
    isMuted: state.isMuted,
    isFullscreen: state.isFullscreen,
    volume: state.volume,
    currentTime: state.currentTime,
    duration: state.duration,
    feedback: state.feedback,
    qualityLevels: sourceState.qualityLevels,
    selectedQuality: sourceState.selectedQuality,
    setSelectedQuality: sourceState.setSelectedQuality,
    onPlay: () => {
      void controls.play();
    },
    onPause: controls.pause,
    onTogglePlay: controls.handleTogglePlay,
    onSeek: controls.handleSeek,
    onSeekTo: controls.handleSeekTo,
    onVolumeChange: controls.handleVolumeSet,
    onMuteToggle: controls.toggleMute,
    onFullscreenToggle: fullscreen.toggleFullscreen,
    showFeedback: state.showFeedback,
    resolveShowWhen: (showWhen: string | undefined) =>
      resolveVideoShowWhen(showWhen, showWhenState),
    getActionHandler: (action: string | undefined, payload?: number) =>
      getVideoActionHandler(action, payload, handlers),
  };
}
