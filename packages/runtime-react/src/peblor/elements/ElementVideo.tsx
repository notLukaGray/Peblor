"use client";

import {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { ElementBlock, ModuleBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import type { PeblorAction } from "@pb/contracts/types";
import {
  firePeblorAction,
  PEBLOR_TRIGGER_EVENT,
  type PeblorTriggerDetail,
} from "@/peblor/triggers";
import { shouldApplyMediaTarget } from "@/peblor/triggers/target-matching";
import { subscribeToElementActions } from "@/peblor/triggers/action-bus";
import {
  choosePreferredVideoSource,
  resolveVideoLink,
  type VideoSourceCandidate,
  type VideoSourceSupportProbe,
} from "@pb/core/media";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { useVideoPlayerState } from "@/peblor/hooks/use-video-player-state";
import { useVideoControls } from "@/peblor/hooks/use-video-controls";
import { useVideoKeyboard } from "@/peblor/hooks/use-video-keyboard";
import { useVideoFullscreen } from "@/peblor/hooks/use-video-fullscreen";
import { useElementVideoStyles } from "@/peblor/hooks/use-element-video-styles";
import { useVideoContextValue } from "@/peblor/hooks/use-video-context-value";
import { VideoControlContext } from "./ElementVideo/VideoControlContext";
import { ElementVideoCore } from "./ElementVideo/ElementVideoCore";
import { ElementVideoInteractiveContainer } from "./ElementVideo/ElementVideoInteractiveContainer";
import { ElementVideoSlotsOverlay } from "./ElementVideo/ElementVideoSlotsOverlay";
import { ElementVideoLinkWrap } from "./ElementVideo/ElementVideoLinkWrap";
import { useElementVideoSource } from "./ElementVideo/use-element-video-source";
import { ElementVideoErrorOverlay } from "./ElementVideo/ElementVideoErrorOverlay";
import { useVideoLazyLoad } from "./ElementVideo/use-video-lazy-load";
import { useVideoAudioSession } from "./ElementVideo/engine/audio-session";
import { useMediaSession } from "./ElementVideo/engine/use-media-session";
import { resolveElementVideoSlots } from "./ElementVideo/element-video-slots";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { useElementEffects } from "@/peblor/elements/Shared/use-element-effects";

type Props = Extract<ElementBlock, { type: "elementVideo" }> & {
  moduleConfig?: ModuleBlock;
};

function resolveAspectRatioValue(aspectRatio: Props["aspectRatio"]): string {
  if (typeof aspectRatio === "number") return String(aspectRatio);
  if (typeof aspectRatio === "string" && aspectRatio.trim().length > 0) return aspectRatio;
  // Responsive tuple — use the desktop (second) value as a fallback scalar
  if (Array.isArray(aspectRatio) && typeof aspectRatio[1] === "string") return aspectRatio[1];
  return globals.uiVideoDefaultAspectRatio;
}

function NoVideoSource({ poster, aspectRatio }: { poster?: string; aspectRatio?: string }) {
  const fallbackStyle: CSSProperties = {
    display: "block",
    width: "100%",
    minHeight: "10rem",
    aspectRatio: aspectRatio ?? globals.uiVideoDefaultAspectRatio,
    borderRadius: "inherit",
    overflow: "hidden",
    backgroundColor: globals.colorVideoPlaceholderBg,
  };

  if (poster && poster.trim().length > 0) {
    return (
      <span
        className="relative"
        style={{
          ...fallbackStyle,
          backgroundImage: `url("${poster}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.75,
        }}
      >
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] uppercase tracking-[0.2em] text-white/70">
          {globals.stringsErrorVideoSourceMissing}
        </span>
      </span>
    );
  }

  return (
    <span
      className="grid place-items-center text-[11px] uppercase tracking-[0.2em] text-white/65"
      role="status"
      style={fallbackStyle}
    >
      {globals.stringsErrorVideoSourceMissing}
      <span className="mt-1 block text-[9px] normal-case tracking-normal text-white/50">
        Add a URL or Bunny key to see live playback.
      </span>
    </span>
  );
}

function PrePlayPosterOverlay({
  poster,
  ariaLabel,
  objectFit,
  objectPosition,
  visible,
}: {
  poster?: string;
  ariaLabel: string;
  objectFit: Props["objectFit"];
  objectPosition?: string;
  visible: boolean;
}) {
  if (!poster || poster.trim().length === 0 || !visible) return null;

  const resolvedObjectFit = Array.isArray(objectFit) ? objectFit[0] : objectFit;
  const backgroundSize =
    resolvedObjectFit === "contain"
      ? "contain"
      : resolvedObjectFit === "fillWidth"
        ? "100% auto"
        : resolvedObjectFit === "fillHeight"
          ? "auto 100%"
          : "cover";

  return (
    <span
      className="pointer-events-none absolute inset-0 block"
      style={{
        zIndex: globals.zIndexRaised,
        backgroundImage: `url("${poster}")`,
        backgroundPosition: objectPosition ?? "center",
        backgroundRepeat: "no-repeat",
        backgroundSize,
        borderRadius: "inherit",
      }}
      role="img"
      aria-label={`${ariaLabel} poster`}
    />
  );
}

function createVideoSourceSupportProbe(): VideoSourceSupportProbe | undefined {
  if (typeof document === "undefined") return undefined;

  const video = document.createElement("video");
  const mediaSource =
    typeof window === "undefined"
      ? undefined
      : (window.MediaSource as typeof MediaSource | undefined);
  return {
    canPlayType: (type) => video.canPlayType(type),
    hasMediaSource: !!mediaSource,
    isMediaSourceTypeSupported: (type) => mediaSource?.isTypeSupported(type) === true,
  };
}

function usePreferredVideoSource(
  src: string | undefined,
  sources: VideoSourceCandidate[] | undefined
): string {
  const sourceSupportProbe = useMemo(() => createVideoSourceSupportProbe(), []);
  return useMemo(
    () => choosePreferredVideoSource(src, sources, sourceSupportProbe),
    [sourceSupportProbe, src, sources]
  );
}

export function ElementVideo({
  id,
  src,
  sources,
  poster,
  ariaLabel,
  autoplay = false,
  loop = false,
  muted = false,
  playbackRate,
  width,
  height,
  selfAlign,
  alignY,
  borderRadius,
  constraints,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  fixed,
  effects,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  scroll,
  hidden,
  objectFit = "cover",
  objectPosition,
  rotate,
  flipHorizontal = false,
  flipVertical = false,
  showPlayButton = true,
  link,
  aspectRatio,
  priority = false,
  moduleConfig,
  onVideoPlay,
  onVideoPause,
  onVideoEnd,
  streamingConfig,
  preload,
  crossOrigin,
  controlsList,
  tracks,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const figureRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
    setVideoEl(el);
  }, []);
  const preferredSrc = usePreferredVideoSource(src, sources);
  const hasSource = preferredSrc.trim() !== "";
  const [playbackStartState, setPlaybackStartState] = useState({
    src: preferredSrc,
    autoplay,
    hasStarted: autoplay,
  });
  const hasStartedPlayback =
    playbackStartState.src === preferredSrc && playbackStartState.autoplay === autoplay
      ? playbackStartState.hasStarted
      : autoplay;
  const sleepAfterMs =
    (moduleConfig?.behavior as { sleepAfterMs?: number } | undefined)?.sleepAfterMs ??
    globals.uiVideoPauseButtonHideDelayMs;
  const feedbackDurationMs =
    (moduleConfig?.behavior as { feedbackDurationMs?: number } | undefined)?.feedbackDurationMs ??
    globals.uiVideoFeedbackDurationMs;
  const state = useVideoPlayerState({
    autoplay,
    muted,
    feedbackDurationMs,
  });

  const styles = useElementVideoStyles({
    width,
    height,
    align: selfAlign,
    alignY,
    borderRadius,
    constraints,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    zIndex: layer,
    fixed,
    wrapperStyle,
    opacity,
    blendMode,
    boxShadow,
    filter,
    backdropFilter: bgBlur,
    overflow: scroll,
    hidden: typeof hidden === "boolean" ? hidden : undefined,
    rotate,
    flipHorizontal,
    flipVertical,
    objectFit,
    objectPosition,
    aspectRatio,
    moduleConfig,
  });
  const { resolvedEffects: videoEffects, hasGlassEffect } = useElementEffects(effects);

  const { isLinkable, resolvedHref, isInternal, target, rel } = useMemo(
    () => resolveVideoLink(link, showPlayButton),
    [link, showPlayButton]
  );

  const { shouldLoadVideo, armVideoLoad, armVideoLoadImmediately } = useVideoLazyLoad({
    autoplay,
    hasSource,
    priority,
    containerRef,
  });
  const videoSourceState = useElementVideoSource({
    videoEl,
    src: preferredSrc,
    shouldLoad: shouldLoadVideo,
    autoplay,
    streamingConfig,
  });
  const baseControls = useVideoControls({
    videoRef,
    state,
    setPlaying: state.setPlaying,
    setShowControls: state.setShowControls,
    setVolume: state.setVolume,
    setMuted: state.setMuted,
    setCurrentTime: state.setCurrentTime,
    setDuration: state.setDuration,
    sleepAfterMs,
    loop,
    startLoad: videoSourceState.startLoad,
  });

  const controls = useMemo(() => {
    return {
      ...baseControls,
      handlePlay: () => {
        setPlaybackStartState({ src: preferredSrc, autoplay, hasStarted: true });
        baseControls.handlePlay();
        if (onVideoPlay) firePeblorAction(onVideoPlay, "trigger");
      },
      handlePause: () => {
        baseControls.handlePause();
        if (onVideoPause) firePeblorAction(onVideoPause, "trigger");
      },
      handleEnded: () => {
        baseControls.handleEnded();
        if (onVideoEnd) firePeblorAction(onVideoEnd, "trigger");
      },
    };
  }, [autoplay, baseControls, onVideoPlay, onVideoPause, onVideoEnd, preferredSrc]);

  const fullscreen = useVideoFullscreen({
    videoRef,
    containerRef,
    videoEl,
    setFullscreen: state.setFullscreen,
    shouldLoadVideo,
    armVideoLoadImmediately,
    startLoad: videoSourceState.startLoad,
  });

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
        case "assetPlay":
          armVideoLoadImmediately();
          void baseControls.play();
          return;
        case "assetPause":
          baseControls.pause();
          return;
        case "assetTogglePlay":
          armVideoLoadImmediately();
          baseControls.handleTogglePlay();
          state.showFeedback(state.isPlaying ? "pause" : "play");
          return;
        case "assetSeek": {
          const time = typeof payload?.time === "number" ? payload.time : 0;
          baseControls.handleSeek(time);
          state.showFeedback(time < 0 ? "seekBack" : "seekForward");
          return;
        }
        case "assetMute":
          baseControls.toggleMute();
          return;
        case "videoFullscreen":
          fullscreen.toggleFullscreen();
          return;
        default:
          return;
      }
    };

    // When this element has an id, register with the action bus for direct delivery.
    // The bus only fires for actions with payload.id === this element's id.
    // Broadcast actions (no payload.id) still come through the window event below.
    const busUnsub = id
      ? subscribeToElementActions(id, (rawAction) => {
          const syntheticEvent = new CustomEvent<PeblorTriggerDetail>(PEBLOR_TRIGGER_EVENT, {
            detail: { action: rawAction as PeblorAction, source: "system" },
          });
          listener(syntheticEvent);
        })
      : null;

    window.addEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    return () => {
      busUnsub?.();
      window.removeEventListener(PEBLOR_TRIGGER_EVENT, listener as EventListener);
    };
  }, [armVideoLoadImmediately, baseControls, fullscreen, id, state]);

  const keyboardHandlers = useMemo(
    () => ({
      onPlay: () => void baseControls.play(),
      onPause: baseControls.pause,
      onTogglePlay: () => {
        baseControls.handleTogglePlay();
        state.showFeedback(state.isPlaying ? "pause" : "play");
      },
      onSeek: (delta: number) => {
        baseControls.handleSeek(delta);
        state.showFeedback(delta < 0 ? "seekBack" : "seekForward");
      },
      onMuteToggle: baseControls.toggleMute,
      onFullscreenToggle: fullscreen.toggleFullscreen,
    }),
    [baseControls, fullscreen.toggleFullscreen, state]
  );

  const videoKeyboardRef = useVideoKeyboard({
    containerRef,
    keyBindings: moduleConfig?.keyBindings,
    handlers: keyboardHandlers,
  });

  const activateTogglePlayFromContainer = useCallback(() => {
    baseControls.handleTogglePlay();
    state.showFeedback(state.isPlaying ? "pause" : "play");
    baseControls.showControlsTemporarily();
  }, [baseControls, state]);

  const handleContainerClick: (e: React.MouseEvent) => void = useCallback(
    (e) => {
      const target = e.target as Element;
      if (target.closest('button, input, select, a, [role="button"], [data-no-click-toggle]'))
        return;
      activateTogglePlayFromContainer();
    },
    [activateTogglePlayFromContainer]
  );

  const moduleKeyboardInteractive = showPlayButton || Boolean(moduleConfig?.keyBindings?.length);

  const handleInteractiveContainerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLSpanElement>) => {
      if (!showPlayButton) return;
      if (e.key !== "Enter" && e.key !== " ") return;

      const bindings = moduleConfig?.keyBindings;
      if (
        bindings?.some(
          (b) =>
            b.key === e.code ||
            b.key === e.key ||
            (e.code === "Space" && (b.key === "Space" || b.key === " "))
        )
      ) {
        return;
      }

      e.preventDefault();
      activateTogglePlayFromContainer();
    },
    [activateTogglePlayFromContainer, moduleConfig?.keyBindings, showPlayButton]
  );

  const { resolvedEffects: moduleEffects, hasGlassEffect: hasModuleGlassEffect } =
    useElementEffects(
      (moduleConfig as { effects?: unknown } | undefined)?.effects as
        | import("@pb/contracts/peblor/core/peblor-schemas").SectionEffect[]
        | undefined
    );

  const videoContextValue = useVideoContextValue({
    moduleConfig,
    state,
    controls,
    fullscreen,
    sourceState: videoSourceState,
  });
  const showVideo = hasSource;
  const resolvedPoster = poster;
  const resolvedAspectRatio = resolveAspectRatioValue(aspectRatio);
  const resolvedAriaLabel = (ariaLabel?.trim() || "Video").trim();
  const showPrePlayPoster = showVideo && !hasStartedPlayback;
  const audioSession = useVideoAudioSession({
    videoEl,
    play: baseControls.play,
    startLoad: videoSourceState.startLoad,
  });

  useMediaSession({
    enabled: audioSession.isAudioOwner,
    title: resolvedAriaLabel,
    poster: resolvedPoster ?? undefined,
    play: baseControls.play,
    pause: baseControls.pause,
    seek: baseControls.handleSeek,
  });

  const { contentSlotKey, slotsObj, useSectionSlots } = useMemo(
    () => resolveElementVideoSlots(moduleConfig),
    [moduleConfig]
  );

  const videoCore = (
    <ElementVideoCore
      setVideoRef={setVideoRef}
      shouldLoad={shouldLoadVideo}
      poster={resolvedPoster ?? undefined}
      ariaLabel={resolvedAriaLabel}
      videoStyle={styles.videoStyle}
      withModule={!!moduleConfig}
      controls={controls}
      autoplay={autoplay}
      loop={loop}
      muted={state.isMuted}
      playbackRate={playbackRate}
      priority={priority}
      preload={preload}
      crossOrigin={crossOrigin}
      controlsList={controlsList}
      tracks={tracks}
    />
  );

  const videoContent = moduleConfig ? (
    <VideoControlContext.Provider value={videoContextValue}>
      <ElementVideoInteractiveContainer
        containerRef={containerRef}
        style={styles.containerStyle}
        isFullscreen={state.isFullscreen}
        role={showPlayButton ? "button" : undefined}
        aria-label={showPlayButton ? resolvedAriaLabel : undefined}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={() => {
          armVideoLoad();
          controls.showControlsTemporarily();
        }}
        onTouchEnd={undefined}
        onMouseEnter={() => {
          armVideoLoad();
          controls.showControlsTemporarily();
        }}
        onMouseLeave={controls.scheduleHideControls}
        onMouseMove={controls.showControlsTemporarily}
        onClick={showPlayButton ? handleContainerClick : undefined}
        onKeyDown={showPlayButton ? handleInteractiveContainerKeyDown : undefined}
        tabIndex={moduleKeyboardInteractive ? 0 : undefined}
      >
        <div style={{ position: "absolute", inset: 0, zIndex: globals.zIndexBase }}>
          {showVideo && preferredSrc ? (
            <>
              {videoCore}
              <PrePlayPosterOverlay
                poster={resolvedPoster ?? undefined}
                ariaLabel={resolvedAriaLabel}
                objectFit={objectFit}
                objectPosition={objectPosition}
                visible={showPrePlayPoster}
              />
              {videoSourceState.errorKind && (
                <ElementVideoErrorOverlay errorKind={videoSourceState.errorKind} />
              )}
            </>
          ) : (
            <NoVideoSource poster={resolvedPoster} aspectRatio={resolvedAspectRatio} />
          )}
        </div>
        {hasModuleGlassEffect && (
          <SectionGlassEffect effects={moduleEffects} sectionRef={containerRef} variant="auto" />
        )}
        {useSectionSlots && showPlayButton && (
          <ElementVideoSlotsOverlay
            slotsObj={slotsObj as Record<string, unknown>}
            contentSlotKey={contentSlotKey}
            moduleConfig={moduleConfig}
            showControls={state.showControls}
            isPlaying={state.isPlaying}
            isMuted={state.isMuted}
            isFullscreen={state.isFullscreen}
            onPointerEnter={controls.showControlsTemporarily}
            onPointerLeave={controls.scheduleHideControls}
            onPointerMove={controls.showControlsTemporarily}
            onPointerDown={controls.showControlsTemporarily}
          />
        )}
      </ElementVideoInteractiveContainer>
    </VideoControlContext.Provider>
  ) : (
    <>
      {!hasSource && <NoVideoSource poster={resolvedPoster} aspectRatio={resolvedAspectRatio} />}
      {showVideo && preferredSrc && (
        <span
          ref={videoKeyboardRef}
          className="relative block w-full h-full"
          style={styles.containerStyle}
          onContextMenu={(e) => e.preventDefault()}
          onPointerEnter={armVideoLoad}
          onTouchStart={armVideoLoad}
          onFocusCapture={armVideoLoad}
        >
          {videoCore}
          <PrePlayPosterOverlay
            poster={resolvedPoster ?? undefined}
            ariaLabel={resolvedAriaLabel}
            objectFit={objectFit}
            objectPosition={objectPosition}
            visible={showPrePlayPoster}
          />
          {videoSourceState.errorKind && (
            <ElementVideoErrorOverlay errorKind={videoSourceState.errorKind} />
          )}
        </span>
      )}
    </>
  );

  return (
    <figure
      ref={figureRef}
      className="shrink-0 m-0 block overflow-hidden"
      style={{
        ...styles.figureStyle,
        ...(hasGlassEffect && styles.figureStyle.position == null ? { position: "relative" } : {}),
      }}
    >
      <SectionGlassEffect effects={videoEffects} sectionRef={figureRef} variant="auto" />
      <div style={styles.wrapperStyle}>
        <ElementVideoLinkWrap
          isLinkable={isLinkable}
          resolvedHref={resolvedHref}
          isInternal={isInternal}
          target={target}
          rel={rel}
        >
          {videoContent}
        </ElementVideoLinkWrap>
      </div>
    </figure>
  );
}
