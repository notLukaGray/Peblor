import type { ActionHandler, ActionHandlerMap } from "./types";

const handlePlaySound: ActionHandler = (payload, { audioMap }) => {
  const {
    src,
    volume = 1,
    loop = false,
  } = (payload ?? {}) as {
    src?: string;
    volume?: number;
    loop?: boolean;
  };
  if (src == null) {
    console.warn("[peblor] playSound called without a src");
    return;
  }
  let audio = audioMap.get(src);
  if (!audio) {
    audio = new Audio(src);
    audioMap.set(src, audio);
  }
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.loop = loop;
  audio.currentTime = 0;
  audio.play().catch((err) => {
    console.warn("[pb-runtime-react] Audio play failed (autoplay policy)", err);
  });
};

const handleStopSound: ActionHandler = (payload, { audioMap }) => {
  const { src } = (payload ?? {}) as { src?: string };
  if (src) {
    const audio = audioMap.get(src);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } else {
    audioMap.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
  }
};

const handleSetVolume: ActionHandler = (payload, { audioMap }) => {
  const { volume, id: elementId } = (payload ?? {}) as {
    volume?: number;
    id?: string;
  };
  const clampedVolume = Math.max(0, Math.min(1, volume ?? 1));
  if (elementId) {
    const el = document.getElementById(elementId) as HTMLVideoElement | HTMLAudioElement | null;
    if (el && "volume" in el) el.volume = clampedVolume;
  } else {
    audioMap.forEach((a) => {
      a.volume = clampedVolume;
    });
  }
};

const handleElementPlay: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id?: string };
  if (id == null) return;
  const el = document.getElementById(id) as HTMLMediaElement | null;
  if (el && "play" in el)
    el.play().catch((err) => {
      console.warn("[pb-runtime-react] Element play failed", err);
    });
};

const handleElementPause: ActionHandler = (payload) => {
  const { id } = (payload ?? {}) as { id?: string };
  if (id == null) return;
  const el = document.getElementById(id) as HTMLMediaElement | null;
  if (el && "pause" in el) el.pause();
};

const handleElementSeek: ActionHandler = (payload) => {
  const { id, time } = (payload ?? {}) as { id?: string; time?: number };
  if (id == null) return;
  const el = document.getElementById(id) as HTMLMediaElement | null;
  if (el && "currentTime" in el) el.currentTime = time ?? 0;
};

/**
 * Section-context media actions that are handled by usePeblorTriggerListener.
 * No-ops here to prevent silent fall-through in the switch.
 */
const noOpSectionAction: ActionHandler = () => {
  // Handled by usePeblorTriggerListener (section-level)
};

export const MEDIA_HANDLERS: ActionHandlerMap = {
  playSound: handlePlaySound,
  stopSound: handleStopSound,
  setVolume: handleSetVolume,
  elementPlay: handleElementPlay,
  elementPause: handleElementPause,
  elementSeek: handleElementSeek,
  backgroundSwitch: noOpSectionAction,
  contentOverride: noOpSectionAction,
  startTransition: noOpSectionAction,
  stopTransition: noOpSectionAction,
  updateTransitionProgress: noOpSectionAction,
};
