"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import type { ElementBlock, ModuleBlock } from "@pb/contracts/types";
import type { PeblorAction } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { ElementAudioCore } from "./ElementAudio/ElementAudioCore";
import { ElementAudioSlotsOverlay } from "./ElementAudio/ElementAudioSlotsOverlay";
import { AudioControlContext } from "./ElementAudio/AudioControlContext";
import {
  registerBroadcastAudioControl,
  unregisterBroadcastAudioControl,
} from "./ElementAudio/audio-control-registry";
import { resolveElementAudioSlots } from "./ElementAudio/element-audio-slots";
import { useAudioPlayerState } from "./ElementAudio/use-audio-player-state";
import { useAudioControls } from "./ElementAudio/use-audio-controls";
import { formatMediaClock } from "./ElementAudio/format-media-clock";
import { AudioWaveformRuntime, type WaveformMode } from "./ElementAudio/AudioWaveformRuntime";
import { PEBLOR_TRIGGER_EVENT, type PeblorTriggerDetail } from "@/peblor/triggers";
import { shouldApplyMediaTarget } from "@/peblor/triggers/target-matching";
import { subscribeToElementActions } from "@/peblor/triggers/action-bus";
import { globals } from "@pb/runtime-react/core/lib/globals";
import {
  isApprovedAssetUrl,
  THIRD_PARTY_ASSET_MESSAGE,
} from "@pb/runtime-react/core/lib/asset-host";

type Props = Extract<ElementBlock, { type: "elementAudio" }> & {
  moduleConfig?: ModuleBlock;
};

export function ElementAudio({
  id,
  src,
  sources,
  poster,
  autoplay,
  loop,
  muted,
  controls: showNativeControls,
  playbackRate,
  preload,
  showWaveform,
  waveformMode,
  showTimeDisplay,
  containerAspectRatio: instanceAspectRatio,
  module: _module,
  moduleConfig,
  ariaLabel,
  width,
  height,
  selfAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  hidden,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const state = useAudioPlayerState(!autoplay);
  const [loadError, setLoadError] = useState(false);
  const handleAudioError = useCallback(() => setLoadError(true), []);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoadError(false);
  }

  const audioErrorMessage = isApprovedAssetUrl(src)
    ? "Audio failed to load."
    : THIRD_PARTY_ASSET_MESSAGE;

  const slotsInfo = resolveElementAudioSlots(moduleConfig as ModuleBlock | undefined);
  const withModule = moduleConfig && slotsInfo.useSectionSlots;

  const sleepAfterMs =
    (moduleConfig?.behavior as { sleepAfterMs?: number })?.sleepAfterMs ??
    globals.uiAudioSleepAfterMs;

  const controls = useAudioControls({
    audioRef,
    isPlaying: state.isPlaying,
    setPlaying: state.setIsPlaying,
    setShowControls: state.setShowControls,
    setVolume: state.setVolume,
    setMuted: state.setIsMuted,
    setCurrentTime: state.setCurrentTime,
    setDuration: state.setDuration,
    sleepAfterMs,
  });

  const contextValue = useMemo(
    () => ({
      isPlaying: state.isPlaying,
      isMuted: state.isMuted,
      volume: state.volume,
      currentTime: state.currentTime,
      duration: state.duration,
      feedback: state.feedback,
      onTogglePlay: controls.handleTogglePlay,
      onSeek: controls.handleSeek,
      onSeekTo: controls.handleSeekTo,
      onVolumeChange: controls.handleVolumeSet,
      onMuteToggle: controls.toggleMute,
      showFeedback: state.showFeedback,
      resolveShowWhen: (showWhen: string | undefined) => {
        if (!showWhen) return true;
        switch (showWhen) {
          case "awake":
            return state.showControls;
          case "sleeping":
            return !state.showControls;
          case "assetPlaying":
            return state.isPlaying;
          case "assetPaused":
            return !state.isPlaying;
          case "assetMuted":
            return state.isMuted;
          case "assetUnmuted":
            return !state.isMuted;
          default:
            return true;
        }
      },
      getActionHandler: (action: string | undefined, payload?: number) => {
        if (!action) return undefined;
        switch (action) {
          case "assetTogglePlay":
            return () => controls.handleTogglePlay();
          case "assetSeek":
            return () => controls.handleSeek(payload ?? 0);
          case "assetMute":
            return () => controls.toggleMute();
          default:
            return undefined;
        }
      },
    }),
    [state, controls]
  );

  useEffect(() => {
    const elementId = id ?? "audio";
    registerBroadcastAudioControl(elementId, contextValue);
    return () => unregisterBroadcastAudioControl(elementId);
  }, [id, contextValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<PeblorTriggerDetail>).detail;
      const action = detail?.action;
      if (!action || typeof action.type !== "string") return;
      const actionType = String(action.type);

      const payload = action.payload as Record<string, unknown> | undefined;
      const targetId =
        typeof payload?.id === "string"
          ? payload.id
          : typeof payload?.target === "string"
            ? payload.target
            : undefined;
      if (!shouldApplyMediaTarget(id, targetId ?? null)) return;

      switch (actionType) {
        case "assetPlay": {
          const audio = audioRef.current;
          if (audio)
            void audio.play().catch((err) => {
              console.warn("[pb-runtime-react] Audio element play failed", err);
            });
          return;
        }
        case "assetPause":
          audioRef.current?.pause();
          return;
        case "assetTogglePlay":
          controls.handleTogglePlay();
          return;
        case "assetSeek": {
          const time = typeof payload?.time === "number" ? payload.time : 0;
          controls.handleSeek(time);
          return;
        }
        case "assetMute":
          controls.toggleMute();
          return;
        default:
          return;
      }
    };

    const resolvedId = id ?? "audio";
    const busUnsub = subscribeToElementActions(resolvedId, (rawAction) => {
      const syntheticEvent = new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
        detail: { action: rawAction as PeblorAction, source: "system" },
      });
      listener(syntheticEvent);
    });
    window.addEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    return () => {
      busUnsub();
      window.removeEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    };
  }, [controls, id]);

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: selfAlign as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex: layer,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    bgBlur,
    hidden,
  };

  /** True only for explicit `<audio controls>` — never with a module (module supplies custom chrome). */
  const useHtmlNativeControls = showNativeControls === true && !withModule;

  const showCustomOrModuleChrome = !useHtmlNativeControls;

  const moduleChrome = Boolean(showCustomOrModuleChrome && withModule && moduleConfig);

  // Module container sizing.
  // Priority: elementAudio.containerAspectRatio → module.container.aspectRatio → "16 / 9"
  // Pass null (either place) to skip the forced ratio and rely on minHeight only.
  const containerCfg = moduleConfig?.container as
    | {
        aspectRatio?: string | null;
        minHeight?: string;
        background?: string;
        posterGradient?: string;
      }
    | undefined;
  const resolvedAspectRatio =
    instanceAspectRatio !== undefined
      ? instanceAspectRatio // element-level override wins
      : containerCfg != null && containerCfg.aspectRatio !== undefined
        ? containerCfg.aspectRatio // explicit null = "no ratio"; string = use it
        : globals.uiVideoDefaultAspectRatio;
  const containerAspectRatio = resolvedAspectRatio ?? undefined; // null → undefined (no style)
  const containerMinHeight = containerCfg?.minHeight;
  const containerBg = containerCfg?.background;

  return (
    <ElementLayoutWrapper layout={layout} interactions={interactions}>
      <AudioControlContext.Provider value={contextValue}>
        <div
          className={showCustomOrModuleChrome ? "relative w-full select-none" : "relative w-full"}
          onPointerEnter={
            showCustomOrModuleChrome
              ? () => {
                  state.setShowControls(true);
                  controls.scheduleHide();
                }
              : undefined
          }
          onPointerLeave={showCustomOrModuleChrome ? controls.scheduleHide : undefined}
          onPointerMove={showCustomOrModuleChrome ? controls.showControlsTemporarily : undefined}
        >
          {moduleChrome ? (
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: containerAspectRatio ?? undefined,
                minHeight: containerMinHeight,
                background: containerBg,
              }}
            >
              <ElementAudioCore
                src={src}
                sources={sources}
                autoplay={autoplay}
                loop={loop}
                muted={muted}
                controls={false}
                preload={preload}
                ariaLabel={ariaLabel}
                playbackRate={playbackRate}
                className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
                setRef={(el) => {
                  audioRef.current = el;
                }}
                onPlay={controls.handlePlay}
                onPause={controls.handlePause}
                onEnded={controls.handleEnded}
                onVolumeChange={controls.handleVolumeChange}
                onTimeUpdate={controls.onTimeUpdate}
                onLoadedMetadata={controls.onLoadedMetadata}
                onDurationChange={controls.onDurationChange}
                onError={handleAudioError}
              />
              {loadError && (
                <span
                  className="absolute inset-0 z-[2] flex items-center justify-center text-muted-foreground text-sm"
                  role="status"
                >
                  {audioErrorMessage}
                </span>
              )}
              {poster ? (
                <div className="absolute inset-0 z-[1] overflow-hidden" aria-hidden>
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes={`(max-width: ${globals.uiBreakpointDesktopPx}px) 100vw, 920px`}
                    className="object-cover"
                  />
                  {containerCfg?.posterGradient ? (
                    <div
                      className="absolute inset-0"
                      style={{ background: containerCfg.posterGradient }}
                    />
                  ) : null}
                </div>
              ) : null}
              {showWaveform ? (
                <div
                  className="pointer-events-none absolute z-[5] flex items-end justify-center"
                  style={{
                    bottom: 56,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "88%",
                    maxWidth: "100%",
                  }}
                >
                  <AudioWaveformRuntime
                    audioRef={audioRef}
                    isPlaying={state.isPlaying}
                    barCount={40}
                    mode={(waveformMode as WaveformMode) ?? "bars"}
                    canvasHeight={56}
                  />
                </div>
              ) : null}
              <ElementAudioSlotsOverlay
                slotsObj={slotsInfo.slotsObj}
                contentSlotKey={slotsInfo.contentSlotKey}
                moduleConfig={moduleConfig!}
                showControls={state.showControls}
                isPlaying={state.isPlaying}
                isMuted={state.isMuted}
              />
            </div>
          ) : (
            <>
              <ElementAudioCore
                src={src}
                sources={sources}
                autoplay={autoplay}
                loop={loop}
                muted={muted}
                controls={useHtmlNativeControls}
                preload={preload}
                ariaLabel={ariaLabel}
                playbackRate={playbackRate}
                className={useHtmlNativeControls ? "w-full" : undefined}
                setRef={(el) => {
                  audioRef.current = el;
                }}
                onPlay={controls.handlePlay}
                onPause={controls.handlePause}
                onEnded={controls.handleEnded}
                onVolumeChange={controls.handleVolumeChange}
                onTimeUpdate={controls.onTimeUpdate}
                onLoadedMetadata={controls.onLoadedMetadata}
                onDurationChange={controls.onDurationChange}
                onError={handleAudioError}
              />

              {loadError && (
                <span className="text-muted-foreground text-sm block" role="status">
                  {audioErrorMessage}
                </span>
              )}

              {poster && (
                <div
                  className="relative w-full rounded-lg overflow-hidden"
                  style={{ aspectRatio: globals.uiVideoDefaultAspectRatio }}
                >
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes={`(max-width: ${globals.uiBreakpointDesktopPx}px) 100vw, 400px`}
                    className="object-cover"
                  />
                </div>
              )}

              {showCustomOrModuleChrome && !withModule && (
                <div className="flex flex-col gap-2 px-3 py-2">
                  {showWaveform ? (
                    <AudioWaveformRuntime
                      audioRef={audioRef}
                      isPlaying={state.isPlaying}
                      mode={(waveformMode as WaveformMode) ?? "bars"}
                    />
                  ) : null}

                  {showTimeDisplay && (
                    <span className="text-xs tabular-nums text-white/80 text-center">
                      {formatMediaClock(state.currentTime)} / {formatMediaClock(state.duration)}
                    </span>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={controls.handleTogglePlay}
                      className="flex items-center justify-center w-8 h-8 hover:bg-white/10 transition-colors text-sm shrink-0 text-white"
                      aria-label={state.isPlaying ? "Pause" : "Play"}
                    >
                      <span className="flex items-center justify-center">
                        {state.isPlaying ? "❚❚" : "▶"}
                      </span>
                    </button>

                    <div
                      className="flex-1 h-1 bg-white/20 cursor-pointer relative group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        controls.handleSeekTo(pct * state.duration);
                      }}
                      onKeyDown={(e) => {
                        switch (e.key) {
                          case "ArrowLeft":
                            e.preventDefault();
                            controls.handleSeek(-5);
                            break;
                          case "ArrowRight":
                            e.preventDefault();
                            controls.handleSeek(5);
                            break;
                          case "Home":
                            e.preventDefault();
                            controls.handleSeekTo(0);
                            break;
                          case "End":
                            e.preventDefault();
                            controls.handleSeekTo(state.duration);
                            break;
                          case " ":
                          case "Enter":
                            e.preventDefault();
                            controls.handleTogglePlay();
                            break;
                        }
                      }}
                      tabIndex={0}
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={state.duration}
                      aria-valuenow={state.currentTime}
                      aria-label="Audio seek"
                    >
                      <div
                        className="h-full bg-white"
                        style={{
                          width: `${
                            state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>

                    <button
                      onClick={controls.toggleMute}
                      className="flex items-center justify-center w-6 h-6 hover:bg-white/10 transition-colors text-xs shrink-0 text-white"
                      aria-label={state.isMuted ? "Unmute" : "Mute"}
                    >
                      <span className="flex items-center justify-center">
                        {state.isMuted || state.volume === 0
                          ? "🔇"
                          : state.volume < 0.5
                            ? "🔉"
                            : "🔊"}
                      </span>
                    </button>
                    <div
                      className="w-16 h-1 bg-white/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const v = (e.clientX - rect.left) / rect.width;
                        controls.handleVolumeSet(Math.max(0, Math.min(1, v)));
                      }}
                      onKeyDown={(e) => {
                        switch (e.key) {
                          case "ArrowLeft":
                          case "ArrowDown":
                            e.preventDefault();
                            controls.handleVolumeSet(Math.max(0, state.volume - 0.1));
                            break;
                          case "ArrowRight":
                          case "ArrowUp":
                            e.preventDefault();
                            controls.handleVolumeSet(Math.min(1, state.volume + 0.1));
                            break;
                          case "Home":
                            e.preventDefault();
                            controls.handleVolumeSet(0);
                            break;
                          case "End":
                            e.preventDefault();
                            controls.handleVolumeSet(1);
                            break;
                        }
                      }}
                      tabIndex={0}
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(state.volume * 100)}
                      aria-label="Volume"
                    >
                      <div
                        className="h-full bg-white/60"
                        style={{
                          width: `${state.isMuted ? 0 : state.volume * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AudioControlContext.Provider>
    </ElementLayoutWrapper>
  );
}
