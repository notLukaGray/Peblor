"use client";

/**
 * Video overlay: one Framer Motion wrapper controls opacity (fade in/out).
 * Visibility rules: see video-control-visibility-rules.ts.
 */

import { useMemo, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import type { ModuleBlock } from "@pb/contracts/types";
import type { ModuleSlotConfig } from "@/peblor/elements/ElementModule/types";
import { VideoSlotSection } from "./VideoSlotSection";
import { m, MotionFromJson } from "@/peblor/integrations/framer-motion";
import type { Transition } from "@/peblor/integrations/framer-motion/types";
import { mergeMotionDefaults } from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { globals } from "@pb/runtime-react/core/lib/globals";

export type ElementVideoSlotsOverlayProps = {
  slotsObj: Record<string, unknown>;
  contentSlotKey: string;
  moduleConfig: ModuleBlock;
  showControls: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerMove: () => void;
  onPointerDown: () => void;
};

function buildOverlayMotionFromBehavior(
  behavior: Record<string, unknown> | undefined
): Record<string, unknown> {
  const ms =
    (typeof behavior?.controlsTransitionMs === "number" ? behavior.controlsTransitionMs : null) ??
    (typeof behavior?.sleepFadeMs === "number" ? behavior.sleepFadeMs : null);
  const ease =
    typeof behavior?.controlsTransitionEasing === "string"
      ? behavior.controlsTransitionEasing
      : typeof behavior?.transitionEasing === "string"
        ? behavior.transitionEasing
        : undefined;
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition:
      ms != null || ease
        ? { duration: ms != null ? ms / 1000 : 0.3, ...(ease ? { ease } : {}) }
        : undefined,
  };
}

function slotHasSection(slot: unknown): slot is { section?: { definitions?: unknown } } {
  return (
    slot != null &&
    typeof slot === "object" &&
    typeof (slot as { section?: { definitions?: unknown } })?.section?.definitions !== "undefined"
  );
}

/** Slot has layout or style so we don't paint an unstyled bar (avoids FOUC when module loads late). */
function slotHasLayoutOrStyle(slot: ModuleSlotConfig): boolean {
  return (
    (typeof slot.position === "string" && slot.position.length > 0) ||
    (typeof slot.bottom === "string" && slot.bottom.length > 0) ||
    (typeof slot.left === "string" && slot.left.length > 0) ||
    (typeof slot.right === "string" && slot.right.length > 0) ||
    (slot.style != null && typeof slot.style === "object" && Object.keys(slot.style).length > 0)
  );
}

function isDisableSlot(slot: ModuleSlotConfig): boolean {
  return slot.transformInherit === "disable";
}

/** Persistent slots are visible independent of the controls awake/sleep cycle.
 *  Any slot with an explicit visibleWhen that contains no "awake" dependency
 *  should live outside the fading motion wrapper. */
function isAwakeDependent(slot: ModuleSlotConfig): boolean {
  const v = slot.visibleWhen;
  if (!v || v === "always" || !Array.isArray(v) || v.length === 0) return false;
  return v.some((s) =>
    s
      .split(",")
      .map((p) => p.trim())
      .includes("awake")
  );
}

/** Whether a persistent slot should currently be in the DOM.
 *  Persistent slots use mount/unmount (not opacity) so backdrop-filter effects
 *  don't bleed through at opacity:0 — same behaviour as the poster frame. */
function persistentSlotIsVisible(
  slot: ModuleSlotConfig,
  isPlaying: boolean,
  isMuted: boolean,
  isFullscreen: boolean
): boolean {
  const v = slot.visibleWhen;
  if (!v || v === "always" || !Array.isArray(v) || v.length === 0) return true;
  return v.some((s) =>
    s
      .split(",")
      .map((p) => p.trim())
      .every((p) => {
        switch (p) {
          case "assetPlaying":
            return isPlaying;
          case "assetPaused":
            return !isPlaying;
          case "assetMuted":
            return isMuted;
          case "assetUnmuted":
            return !isMuted;
          case "videoFullscreen":
            return isFullscreen;
          case "videoContained":
            return !isFullscreen;
          default:
            return false;
        }
      })
  );
}

export function ElementVideoSlotsOverlay({
  slotsObj,
  contentSlotKey,
  moduleConfig,
  showControls,
  isPlaying,
  isMuted,
  isFullscreen,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerDown,
}: ElementVideoSlotsOverlayProps) {
  const slotBehavior = moduleConfig?.behavior as Record<string, unknown> | undefined;

  /** Framer Motion config for overlay (gestures etc.). Opacity fade is driven by CSS transition on wrapper (controlsTransitionMs from JSON). */
  const overlayMotion = useMemo(() => {
    const fromJson = (moduleConfig as ModuleBlock & { overlayMotion?: unknown }).overlayMotion;
    const base =
      fromJson && typeof fromJson === "object"
        ? (fromJson as Record<string, unknown>)
        : buildOverlayMotionFromBehavior(slotBehavior);
    return mergeMotionDefaults(base) as Record<string, unknown>;
  }, [moduleConfig, slotBehavior]);

  const { inheritSlots, disableSlots, persistentSlots, bottomSlot } = useMemo(() => {
    const inherit: [string, ModuleSlotConfig][] = [];
    const disable: [string, ModuleSlotConfig][] = [];
    const persistent: [string, ModuleSlotConfig][] = [];
    let bottomEntry: [string, ModuleSlotConfig] | null = null;
    for (const [key, slot] of Object.entries(slotsObj)) {
      if (key === contentSlotKey || !slotHasSection(slot)) continue;
      const cfg = slot as ModuleSlotConfig;
      if (!slotHasLayoutOrStyle(cfg)) continue;
      if (key === "bottomBar") {
        bottomEntry = [key, cfg];
        continue;
      }
      if (isDisableSlot(cfg)) {
        if (isAwakeDependent(cfg)) disable.push([key, cfg]);
        else persistent.push([key, cfg]);
      } else {
        inherit.push([key, cfg]);
      }
    }
    return {
      inheritSlots: inherit,
      disableSlots: disable,
      persistentSlots: persistent,
      bottomSlot: bottomEntry,
    };
  }, [slotsObj, contentSlotKey]);

  const [overlayReady, setOverlayReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOverlayReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const defaultTransitionMs =
    typeof slotBehavior?.controlsTransitionMs === "number"
      ? slotBehavior.controlsTransitionMs
      : typeof slotBehavior?.sleepFadeMs === "number"
        ? slotBehavior.sleepFadeMs
        : undefined;
  const defaultTransitionEasing =
    typeof slotBehavior?.controlsTransitionEasing === "string"
      ? slotBehavior.controlsTransitionEasing
      : typeof slotBehavior?.transitionEasing === "string"
        ? slotBehavior.transitionEasing
        : undefined;

  const slotProps = {
    showControls,
    isPlaying,
    isMuted,
    isFullscreen,
    defaultTransitionMs,
    defaultTransitionEasing,
  };

  const overlayWrapperStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {
      WebkitTapHighlightColor: "transparent",
      WebkitTouchCallout: "none",
    };
    if (isFullscreen) {
      Object.assign(style, {
        width: "100%",
        height: "100%",
        minWidth: "100%",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column" as CSSProperties["flexDirection"],
        justifyContent: "flex-end",
      });
    }
    return style;
  }, [isFullscreen]);

  // Glass effects only look correct at 0 or 100% opacity — use instant switching.
  const overlayTransition = useMemo<Transition>(() => ({ duration: 0 }), []);

  if (!overlayReady) {
    return (
      <div
        className="absolute inset-0 z-[var(--pb-z-raised)] select-none"
        style={overlayWrapperStyle}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 z-[var(--pb-z-raised)] select-none"
      style={overlayWrapperStyle}
      aria-hidden="false"
    >
      {/* Persistent slots: not subject to controls fade (e.g. center play button).
          Uses mount/unmount rather than opacity so backdrop-filter doesn't bleed
          through at opacity:0 — same behaviour as the poster frame. */}
      {persistentSlots.length > 0 && (
        <div
          className="absolute inset-0"
          style={{ zIndex: globals.zIndexBase, pointerEvents: "none" }}
        >
          {persistentSlots
            .filter(([, slot]) => persistentSlotIsVisible(slot, isPlaying, isMuted, isFullscreen))
            .map(([key, slot]) => (
              <VideoSlotSection
                key={key}
                slot={slot}
                slotKey={key}
                {...slotProps}
                defaultTransitionMs={0}
                pointerEventsWhenVisible="auto"
                debugSlotKey={key}
              />
            ))}
        </div>
      )}
      <m.div
        className="absolute inset-0"
        style={{
          zIndex: globals.zIndexRaised,
          pointerEvents: showControls ? "auto" : "none",
          WebkitTapHighlightColor: "transparent",
          WebkitTouchCallout: "none",
          ...(isFullscreen
            ? {
                display: "flex",
                flexDirection: "column" as CSSProperties["flexDirection"],
                justifyContent: "flex-end",
              }
            : {}),
        }}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={overlayTransition}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown();
        }}
      >
        {/* Motion layer: slots that inherit transform */}
        <MotionFromJson motion={overlayMotion} useMotionAsIs className="absolute inset-0">
          {inheritSlots.map(([key, slot]) => (
            <VideoSlotSection
              key={key}
              slot={slot}
              slotKey={key}
              {...slotProps}
              debugSlotKey={key}
            />
          ))}
        </MotionFromJson>
        {/* Bottom bar: wrapper positions at frame bottom, spacing driven from JSON slot config. */}
        {bottomSlot &&
          (() => {
            const [key, slot] = bottomSlot;
            const bottomPadding = (slot as Record<string, unknown>).paddingBottom as
              | string
              | undefined;
            return (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: globals.zIndexOverlay }}
              >
                <div
                  style={{
                    position: isFullscreen ? "fixed" : "absolute",
                    bottom: 0,
                    left: slot.left ?? "10px",
                    right: slot.right ?? "10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    paddingBottom: bottomPadding ?? "10px",
                    pointerEvents: "auto",
                  }}
                >
                  <VideoSlotSection
                    slot={slot}
                    slotKey={key}
                    {...slotProps}
                    slotStyleOverride={{
                      position: "relative",
                      width: "100%",
                    }}
                    debugSlotKey={key}
                  />
                </div>
              </div>
            );
          })()}
        {/* Disable layer: slots that don't scale with parent. */}
        {disableSlots.length > 0 && (
          <div
            className="absolute inset-0"
            style={{
              zIndex: globals.zIndexRaised,
              pointerEvents: "none",
              WebkitTapHighlightColor: "transparent",
              WebkitTouchCallout: "none",
            }}
          >
            {disableSlots.map(([key, slot]) => (
              <VideoSlotSection
                key={key}
                slot={slot}
                slotKey={key}
                {...slotProps}
                pointerEventsWhenVisible="auto"
                debugSlotKey={key}
              />
            ))}
          </div>
        )}
      </m.div>
    </div>
  );
}
