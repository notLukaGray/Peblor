"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { CSSProperties } from "react";
import type {
  ElementBlock,
  MotionPropsFromJson,
  SectionEffect,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { globals } from "@pb/runtime-react/core/lib/globals";
import {
  MOTION_DEFAULTS,
  mergeMotionDefaults,
  getEntranceMotionFromPreset,
} from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { resolveSlotElements, getModuleSlotBaseStyle } from "@pb/core/modules";
import { MotionFromJson } from "@/peblor/integrations/framer-motion";
import { useSlotGestures } from "@/peblor/hooks/use-slot-gestures";
import { ModuleSlotFeedback } from "./ModuleSlotFeedback";
import { ModuleSlotContent } from "./ModuleSlotContent";
import type { ModuleSlotConfig } from "./types";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { lowerThemeStyleObject, lowerThemeValueDeep } from "@/peblor/theme/theme-string";

export { useSlotDefaultWrapperStyle } from "./ModuleSlotContext";

export { resolveSlotElements } from "@pb/core/modules";

export type ModuleSlotSectionProps = {
  slot: ModuleSlotConfig;
  isSlotVisible: boolean;
  useHugLayout: boolean;
  resolveShowWhen: (showWhen: string | undefined) => boolean;
  getActionHandler: (action: string | undefined, payload?: number) => (() => void) | undefined;
  feedback: { type: string; at: number } | null;
  showFeedback?: (type: string) => void;
  defaultTransitionMs?: number;
  defaultTransitionEasing?: string;
  /** When set to "auto", slot uses pointer-events: auto when visible (e.g. when in a non-scaling layer so it receives clicks). */
  pointerEventsWhenVisible?: "auto";
  /** Optional style override merged over the slot base style (e.g. fullscreen bottom bar full width). */
  slotStyleOverride?: CSSProperties;
  /** For console logs only (e.g. "bottomBar"). */
  debugSlotKey?: string;
};

export function ModuleSlotSection({
  slot,
  isSlotVisible,
  useHugLayout,
  resolveShowWhen,
  getActionHandler,
  feedback,
  showFeedback,
  defaultTransitionMs,
  defaultTransitionEasing,
  pointerEventsWhenVisible,
  slotStyleOverride,
}: ModuleSlotSectionProps) {
  const slotRef = useRef<HTMLElement | null>(null);
  const slotSection = slot.section;
  const rawElements = useMemo(() => resolveSlotElements({ section: slotSection }), [slotSection]);
  const elements = useMemo(
    () =>
      rawElements.filter((el) =>
        resolveShowWhen((el as ElementBlock & { showWhen?: string }).showWhen)
      ),
    [rawElements, resolveShowWhen]
  );

  const expandDurationMs = slot.expandDurationMs ?? MOTION_DEFAULTS.transition.duration * 1000;
  const elementRevealMs = slot.elementRevealMs ?? MOTION_DEFAULTS.transition.duration * 1000;
  const elementRevealStaggerMs =
    slot.elementRevealStaggerMs ?? MOTION_DEFAULTS.transition.staggerDelay * 1000;
  const durationMs =
    slot.transition?.durationMs ??
    defaultTransitionMs ??
    MOTION_DEFAULTS.transition.duration * 1000;
  const easing =
    slot.transition?.easing ?? defaultTransitionEasing ?? MOTION_DEFAULTS.transition.ease;
  const slotActionHandler = slot.action ? getActionHandler(slot.action, undefined) : undefined;

  const { handlePointerDown, handlePointerUp, hasTapHandler } = useSlotGestures({
    gestures: slot.gestures,
    getActionHandler,
    showFeedback,
    slotActionHandler,
  });

  const handleSlotActionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!slotActionHandler) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      if ((e.target as HTMLElement).closest("button, input, a, [role='link']")) return;
      e.preventDefault();
      slotActionHandler();
    },
    [slotActionHandler]
  );

  const hasReveal = elementRevealMs > 0 && elementRevealStaggerMs >= 0 && !useHugLayout;

  const feedbackSlot = slot.feedbackSlot;
  const feedbackMap = slot.feedbackMap;
  const feedbackDurationMs =
    slot.feedbackDurationMs ??
    globals.uiVideoFeedbackDurationMs ??
    MOTION_DEFAULTS.defaultFeedbackDurationMs;

  const slotStyle = useMemo(() => {
    const base = getModuleSlotBaseStyle({
      slot,
      useHugLayout,
      durationMs,
      easing,
      expandDurationMs,
      hasLayoutTransition: useHugLayout || !!slot.layoutMode,
    });
    const themedBase = lowerThemeStyleObject(base as Record<string, unknown>) as CSSProperties;
    const themedOverride = lowerThemeStyleObject(
      slotStyleOverride as Record<string, unknown> | undefined
    ) as CSSProperties | undefined;
    return themedOverride ? { ...themedBase, ...themedOverride } : themedBase;
  }, [slot, useHugLayout, durationMs, easing, expandDurationMs, slotStyleOverride]);

  const wm = slot.wrapperMotion;
  const hoverExitDelayMs =
    wm && typeof wm === "object"
      ? ((wm as Record<string, unknown>).hoverExitDelayMs as number | undefined)
      : undefined;

  const resolvedWhileHover = useMemo(() => {
    if (hoverExitDelayMs === undefined || !wm || typeof wm !== "object") return undefined;
    return wm.whileHover !== undefined ? lowerThemeValueDeep(wm.whileHover) : undefined;
  }, [hoverExitDelayMs, wm]);

  const [isHovering, setIsHovering] = useState(false);
  const hoverExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerEnter = useCallback(() => {
    if (hoverExitTimerRef.current) {
      clearTimeout(hoverExitTimerRef.current);
      hoverExitTimerRef.current = null;
    }
    setIsHovering(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (hoverExitDelayMs && hoverExitDelayMs > 0) {
      hoverExitTimerRef.current = setTimeout(() => {
        setIsHovering(false);
      }, hoverExitDelayMs);
    } else {
      setIsHovering(false);
    }
  }, [hoverExitDelayMs]);

  useEffect(() => {
    return () => {
      if (hoverExitTimerRef.current) clearTimeout(hoverExitTimerRef.current);
    };
  }, []);

  const slotMotionProp = slot.motion;
  const slotVisibilityPreset = slot.visibilityPreset;
  const slotMotion = useMemo((): MotionPropsFromJson => {
    const motionFromJson = lowerThemeValueDeep(slotMotionProp) as typeof slotMotionProp;
    let out: MotionPropsFromJson;
    if (
      motionFromJson &&
      typeof motionFromJson === "object" &&
      (motionFromJson.from != null || motionFromJson.to != null)
    ) {
      const merged = mergeMotionDefaults(motionFromJson) ?? {};
      out = {
        ...merged,
        transition: {
          ...(typeof merged.transition === "object" && merged.transition ? merged.transition : {}),
          duration: durationMs / 1000,
          ease: easing,
        },
      };
    } else if (slotVisibilityPreset && typeof slotVisibilityPreset === "string") {
      const fromPreset = getEntranceMotionFromPreset(slotVisibilityPreset, {
        distancePx: 0,
        duration: durationMs / 1000,
        delay: 0,
        ease: easing,
      });
      out = mergeMotionDefaults(fromPreset) ?? {};
    } else {
      const mc = MOTION_DEFAULTS.motionComponent;
      const fallback =
        mergeMotionDefaults({
          from: mc.from as Record<string, string | number | number[]>,
          to: mc.to as Record<string, string | number | number[]>,
          transition: { duration: durationMs / 1000, ease: easing },
        }) ?? {};
      out = fallback as MotionPropsFromJson;
    }

    if (wm != null && typeof wm === "object") {
      out = { ...out };
      const o = out as Record<string, unknown>;
      if (wm.whileHover !== undefined && hoverExitDelayMs === undefined) {
        o.whileHover = lowerThemeValueDeep(wm.whileHover);
      }
      if (wm.whileTap !== undefined) o.whileTap = lowerThemeValueDeep(wm.whileTap);
      if (wm.whileFocus !== undefined) o.whileFocus = lowerThemeValueDeep(wm.whileFocus);
    }

    return out;
  }, [slotMotionProp, slotVisibilityPreset, wm, durationMs, easing, hoverExitDelayMs]);

  if (feedbackSlot) {
    if (!feedback || !feedbackMap) return null;
    return (
      <ModuleSlotFeedback
        slot={slot}
        feedback={feedback}
        feedbackMap={feedbackMap}
        feedbackDurationMs={feedbackDurationMs}
      />
    );
  }

  const styleWithCursor: CSSProperties = slotActionHandler
    ? { ...slotStyle, cursor: "pointer" }
    : slotStyle;
  const tapHandlerStyle: CSSProperties = hasTapHandler
    ? {
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }
    : {};
  const isHidden = !isSlotVisible;
  const slotEffects = lowerThemeValueDeep(slot.effects) as SectionEffect[] | undefined;
  const hasGlassEffect = (slotEffects ?? []).some((effect) => effect.type === "glass");

  const defaultWrapperStyle = lowerThemeStyleObject(slot.defaultWrapperStyle ?? {});
  const slotDefinitions = slot.section?.definitions ?? null;

  return (
    <MotionFromJson
      motion={slotMotion}
      animateOverride={{ opacity: isSlotVisible ? 1 : 0 }}
      style={{
        ...styleWithCursor,
        ...tapHandlerStyle,
        ...(hasGlassEffect && styleWithCursor.overflow == null ? { overflow: "hidden" } : {}),
        pointerEvents: isSlotVisible ? (pointerEventsWhenVisible ?? undefined) : "none",
      }}
      ref={slotRef}
      onPointerDown={hasTapHandler ? handlePointerDown : undefined}
      onPointerUp={hasTapHandler ? handlePointerUp : undefined}
      onPointerCancel={hasTapHandler ? handlePointerUp : undefined}
      onPointerEnter={hoverExitDelayMs !== undefined ? handlePointerEnter : undefined}
      onPointerLeave={hoverExitDelayMs !== undefined ? handlePointerLeave : undefined}
      {...(isHovering && resolvedWhileHover ? { whileHover: resolvedWhileHover } : {})}
      role={slotActionHandler ? "button" : undefined}
      tabIndex={slotActionHandler ? 0 : undefined}
      aria-label={slotActionHandler ? slot.action : undefined}
      onKeyDown={slotActionHandler ? handleSlotActionKeyDown : undefined}
      inert={isHidden}
    >
      {hasGlassEffect && (
        <SectionGlassEffect effects={slotEffects} sectionRef={slotRef} variant="auto" />
      )}
      <ModuleSlotContent
        elements={elements}
        getActionHandler={getActionHandler}
        slotDefinitions={slotDefinitions}
        defaultWrapperStyle={defaultWrapperStyle}
        hasReveal={hasReveal}
        elementRevealMs={elementRevealMs}
        elementRevealStaggerMs={elementRevealStaggerMs}
        easing={easing}
        revealPreset={slot.revealPreset}
      />
    </MotionFromJson>
  );
}
