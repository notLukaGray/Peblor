"use client";

import { useMemo } from "react";
import type { ModuleBlock } from "@pb/contracts/types";
import type { ModuleSlotConfig } from "@/peblor/elements/ElementModule/types";
import { AudioSlotSection } from "./AudioSlotSection";

type SlotEntry = { key: string; config: ModuleSlotConfig };

type Props = {
  slotsObj: Record<string, unknown>;
  contentSlotKey: string;
  moduleConfig: ModuleBlock;
  showControls: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerMove?: () => void;
};

function stateMatchesAudio(
  showWhen: string | undefined,
  showControls: boolean,
  isPlaying: boolean,
  isMuted: boolean
): boolean {
  if (!showWhen) return true;
  switch (showWhen) {
    case "awake":
      return showControls;
    case "sleeping":
      return !showControls;
    case "assetPlaying":
      return isPlaying;
    case "assetPaused":
      return !isPlaying;
    case "assetMuted":
      return isMuted;
    case "assetUnmuted":
      return !isMuted;
    default:
      return true;
  }
}

function resolveVisibleWhen(
  visibleWhen: string[] | undefined,
  showControls: boolean,
  isPlaying: boolean,
  isMuted: boolean
): boolean {
  if (!visibleWhen || visibleWhen.length === 0) return true;
  const groups = visibleWhen.map((group) => group.split(",").map((s) => s.trim()));
  return groups.some((group) =>
    group.every((condition) => stateMatchesAudio(condition, showControls, isPlaying, isMuted))
  );
}

export function ElementAudioSlotsOverlay({
  slotsObj,
  contentSlotKey,
  moduleConfig: _moduleConfig,
  showControls,
  isPlaying,
  isMuted,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
}: Props) {
  const { inherit, disable, persistent } = useMemo(() => {
    const inheritSlots: SlotEntry[] = [];
    const disableSlots: SlotEntry[] = [];
    const persistentSlots: SlotEntry[] = [];

    for (const [key, slot] of Object.entries(slotsObj)) {
      if (key === contentSlotKey) continue;
      const cfg = slot as ModuleSlotConfig;
      if (!cfg.section || !(cfg.section as Record<string, unknown>)?.definitions) continue;

      const transformInherit = cfg.transformInherit;
      const visibleWhen = cfg.visibleWhen;
      const dependsOnAwake = Array.isArray(visibleWhen)
        ? visibleWhen.some((v) => v.split(",").some((s) => s.trim() === "awake"))
        : false;

      if (transformInherit === "disable" && dependsOnAwake) {
        disableSlots.push({ key, config: cfg });
      } else if (transformInherit === "disable") {
        persistentSlots.push({ key, config: cfg });
      } else {
        inheritSlots.push({ key, config: cfg });
      }
    }

    return {
      inherit: inheritSlots,
      disable: disableSlots,
      persistent: persistentSlots,
    };
  }, [slotsObj, contentSlotKey]);

  const persistentVisible = persistent.map((s) =>
    resolveVisibleWhen(
      Array.isArray(s.config.visibleWhen) ? s.config.visibleWhen : undefined,
      showControls,
      isPlaying,
      isMuted
    )
  );

  return (
    <div
      className="absolute inset-0 z-[var(--pb-z-raised)] select-none"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
    >
      {persistent.map((s, i) => (
        <AudioSlotSection
          key={s.key}
          slot={s.config}
          isSlotVisible={persistentVisible[i]!}
          useHugLayout={false}
          pointerEventsWhenVisible="auto"
          debugSlotKey={s.key}
        />
      ))}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        {inherit.map((s) => (
          <AudioSlotSection
            key={s.key}
            slot={s.config}
            isSlotVisible={showControls}
            useHugLayout={false}
            debugSlotKey={s.key}
          />
        ))}
        {disable.map((s) => (
          <AudioSlotSection
            key={s.key}
            slot={s.config}
            isSlotVisible={
              showControls ||
              resolveVisibleWhen(
                Array.isArray(s.config.visibleWhen) ? s.config.visibleWhen : undefined,
                showControls,
                isPlaying,
                isMuted
              )
            }
            useHugLayout={false}
            pointerEventsWhenVisible="auto"
            debugSlotKey={s.key}
          />
        ))}
      </div>
    </div>
  );
}
