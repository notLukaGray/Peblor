"use client";

import { useRef, useMemo } from "react";
import Image from "next/image";
import type { ElementBlock, ModuleBlock } from "@pb/contracts/types";
import { ElementLayoutWrapper } from "./Shared/ElementLayoutWrapper";
import { ElementAudioCore } from "./ElementAudio/ElementAudioCore";
import { ElementAudioSlotsOverlay } from "./ElementAudio/ElementAudioSlotsOverlay";
import { AudioControlContext } from "./ElementAudio/AudioControlContext";
import { resolveElementAudioSlots } from "./ElementAudio/element-audio-slots";
import { useAudioPlayerState } from "./ElementAudio/use-audio-player-state";
import { useAudioControls } from "./ElementAudio/use-audio-controls";
import { formatMediaClock } from "./ElementAudio/format-media-clock";
import { AudioWaveformDecor } from "./ElementAudio/AudioWaveformDecor";

type Props = Extract<ElementBlock, { type: "elementAudio" }> & {
  moduleConfig?: ModuleBlock;
};

export function ElementAudio({
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
  showTimeDisplay,
  module: _module,
  moduleConfig,
  ariaLabel,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
  effects,
  interactions,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  backdropFilter,
  hidden,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const state = useAudioPlayerState(!autoplay);

  const slotsInfo = resolveElementAudioSlots(moduleConfig as ModuleBlock | undefined);
  const withModule = moduleConfig && slotsInfo.useSectionSlots;

  const sleepAfterMs = (moduleConfig?.behavior as { sleepAfterMs?: number })?.sleepAfterMs ?? 3000;

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

  const layout = {
    width: width as string | undefined,
    height: height as string | undefined,
    align: align as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex,
    constraints,
    effects,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter,
    hidden,
  };

  /** True only for explicit `<audio controls>` — never with a module (module supplies custom chrome). */
  const useHtmlNativeControls = showNativeControls === true && !withModule;

  const showCustomOrModuleChrome = !useHtmlNativeControls;

  const moduleChrome = Boolean(showCustomOrModuleChrome && withModule && moduleConfig);

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
              className="relative w-full overflow-hidden bg-black/20"
              style={{ aspectRatio: "16 / 9" }}
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
              />
              {poster ? (
                <div
                  className="absolute inset-0 z-[calc(var(--pb-z-base)+1)] overflow-hidden rounded-lg"
                  aria-hidden
                >
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              {showWaveform ? (
                <div className="pointer-events-none absolute bottom-14 left-3 right-3 z-[calc(var(--pb-z-base)+5)]">
                  <AudioWaveformDecor currentTime={state.currentTime} duration={state.duration} />
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
              />

              {poster && (
                <div
                  className="relative w-full rounded-lg overflow-hidden"
                  style={{ aspectRatio: "16 / 9" }}
                >
                  <Image
                    src={poster}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                  />
                </div>
              )}

              {showCustomOrModuleChrome && !withModule && (
                <div className="flex flex-col gap-2 px-3 py-2">
                  {showWaveform ? (
                    <AudioWaveformDecor currentTime={state.currentTime} duration={state.duration} />
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
                      className="flex-1 h-1 bg-white/20 cursor-pointer relative group"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        controls.handleSeekTo(pct * state.duration);
                      }}
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
                      className="w-16 h-1 bg-white/20 cursor-pointer"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const v = (e.clientX - rect.left) / rect.width;
                        controls.handleVolumeSet(Math.max(0, Math.min(1, v)));
                      }}
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
