"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DashJsEngine } from "./dashjs-engine";
import { HlsJsEngine } from "./hls-js-engine";
import { NativeHlsEngine } from "./native-hls-engine";
import { ProgressiveEngine } from "./progressive-engine";
import { selectVideoEngineKind } from "./select-engine";
import type {
  ElementVideoQualityLevel,
  ElementVideoStreamingConfig,
  VideoEngine,
  VideoEngineKind,
  VideoErrorKind,
} from "./video-engine-types";

function getStreamingConfigKey(config: ElementVideoStreamingConfig | undefined): string {
  return JSON.stringify({
    autoStartLoad: config?.autoStartLoad ?? null,
    maxBufferLength: config?.maxBufferLength ?? null,
    maxBufferSize: config?.maxBufferSize ?? null,
    bufferTimeDefault: config?.bufferTimeDefault ?? null,
    bufferTimeAtTopQuality: config?.bufferTimeAtTopQuality ?? null,
  });
}

function createVideoEngine(kind: VideoEngineKind): VideoEngine {
  switch (kind) {
    case "native-hls":
      return new NativeHlsEngine();
    case "hls-js":
      return new HlsJsEngine();
    case "dash-js":
      return new DashJsEngine();
    case "progressive":
    default:
      return new ProgressiveEngine();
  }
}

export function useVideoEngine({
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
}) {
  const engineRef = useRef<VideoEngine | null>(null);
  const streamingConfigRef = useRef(streamingConfig);
  const [engineKind, setEngineKind] = useState<VideoEngineKind | null>(null);
  const [qualityLevels, setQualityLevels] = useState<ElementVideoQualityLevel[]>([]);
  const [selectedQuality, setSelectedQualityState] = useState("auto");
  const [errorKind, setErrorKind] = useState<VideoErrorKind | null>(null);
  const streamingConfigKey = useMemo(
    () => getStreamingConfigKey(streamingConfig),
    [streamingConfig]
  );

  const setSelectedQuality = useCallback((value: string) => {
    setSelectedQualityState(value);
    engineRef.current?.setSelectedQuality(value);
  }, []);

  const startLoad = useCallback((currentTime?: number) => {
    engineRef.current?.startLoad(currentTime);
  }, []);

  useLayoutEffect(() => {
    streamingConfigRef.current = streamingConfig;
  }, [streamingConfig]);

  const resetEngineState = useCallback(() => {
    // queueMicrotask defers React state updates past the current effect commit
    // phase. The ref (engineRef.current) is checked synchronously first; if a
    // new engine was already attached by a concurrent effect run, skip the reset.
    // This prevents race conditions between engine attach/detach in rapid
    // re-renders (e.g., source URL changing mid-load).
    queueMicrotask(() => {
      if (engineRef.current) return;
      setEngineKind(null);
      setQualityLevels([]);
      setSelectedQualityState("auto");
      setErrorKind(null);
    });
  }, []);

  useLayoutEffect(() => {
    const video = videoEl;
    if (!video || !shouldLoad || !src) {
      engineRef.current?.detach();
      engineRef.current = null;
      resetEngineState();
      return;
    }

    const kind = selectVideoEngineKind(video, src);
    const engine = createVideoEngine(kind);
    engineRef.current = engine;
    // queueMicrotask defers the React state update so that engineRef is fully
    // settled before setEngineKind triggers a re-render. The ref check after
    // the microtask ensures we don't set state for a stale engine instance.
    queueMicrotask(() => {
      if (engineRef.current !== engine) return;
      setEngineKind(kind);
      setQualityLevels([]);
      setSelectedQualityState("auto");
      setErrorKind(null);
    });

    void engine.attach({
      video,
      src,
      autoplay,
      streamingConfig: streamingConfigRef.current,
      callbacks: {
        onQualityLevelsChange: setQualityLevels,
        onSelectedQualityChange: setSelectedQualityState,
        onErrorChange: setErrorKind,
      },
    });

    return () => {
      engine.detach();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
      resetEngineState();
    };
  }, [autoplay, resetEngineState, shouldLoad, src, streamingConfigKey, videoEl]);

  return {
    engineKind,
    qualityLevels,
    selectedQuality,
    setSelectedQuality,
    errorKind,
    startLoad,
  };
}
