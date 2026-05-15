"use client";

export type ElementVideoQualityLevel = {
  value: string;
  label: string;
  height?: number;
  bitrate?: number;
};

export type VideoErrorKind = "unsupported" | "fatal";

export type ElementVideoStreamingConfig = {
  autoStartLoad?: boolean;
  maxBufferLength?: number;
  maxBufferSize?: number;
  bufferTimeDefault?: number;
  bufferTimeAtTopQuality?: number;
};

export type VideoEngineKind = "progressive" | "native-hls" | "hls-js" | "dash-js";

export type VideoEngineCallbacks = {
  onQualityLevelsChange: (levels: ElementVideoQualityLevel[]) => void;
  onSelectedQualityChange: (value: string) => void;
  onErrorChange: (errorKind: VideoErrorKind | null) => void;
};

export type VideoEngineAttachParams = {
  video: HTMLVideoElement;
  src: string;
  autoplay?: boolean;
  streamingConfig?: ElementVideoStreamingConfig;
  callbacks: VideoEngineCallbacks;
};

export interface VideoEngine {
  readonly kind: VideoEngineKind;
  attach(params: VideoEngineAttachParams): void | Promise<void>;
  detach(): void;
  startLoad(currentTime?: number): void;
  setSelectedQuality(value: string): void;
}
