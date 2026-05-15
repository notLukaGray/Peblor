"use client";

import { useVideoEngine } from "./engine/use-video-engine";
import type {
  ElementVideoStreamingConfig,
  ElementVideoQualityLevel,
  VideoErrorKind,
} from "./engine/video-engine-types";

export type {
  ElementVideoQualityLevel,
  ElementVideoStreamingConfig,
  VideoErrorKind,
} from "./engine/video-engine-types";

export type ElementVideoSourceState = {
  isHls: boolean;
  isDash: boolean;
  qualityLevels: ElementVideoQualityLevel[];
  selectedQuality: string;
  setSelectedQuality: (value: string) => void;
  errorKind: VideoErrorKind | null;
  startLoad: (currentTime?: number) => void;
};

export function useElementVideoSource({
  videoEl,
  src,
  shouldLoad,
  autoplay,
  streamingConfig,
}: {
  videoEl: HTMLVideoElement | null;
  src: string;
  shouldLoad: boolean;
  autoplay?: boolean;
  streamingConfig?: ElementVideoStreamingConfig;
}): ElementVideoSourceState {
  const engineState = useVideoEngine({
    videoEl,
    src,
    shouldLoad,
    autoplay,
    streamingConfig,
  });

  return {
    isHls: engineState.engineKind === "native-hls" || engineState.engineKind === "hls-js",
    isDash: engineState.engineKind === "dash-js",
    qualityLevels: engineState.qualityLevels,
    selectedQuality: engineState.selectedQuality,
    setSelectedQuality: engineState.setSelectedQuality,
    errorKind: engineState.errorKind,
    startLoad: engineState.startLoad,
  };
}
