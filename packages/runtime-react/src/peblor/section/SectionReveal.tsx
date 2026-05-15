"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ElementBlock, SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import type { MotionPropsFromJson } from "@pb/contracts/types";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { motion } from "@/peblor/integrations/framer-motion";
import type { Easing } from "@/peblor/integrations/framer-motion";
import {
  MOTION_DEFAULTS,
  mergeMotionDefaults,
} from "@pb/contracts/peblor/core/peblor-motion-defaults";
import { applySectionFillStyle } from "@pb/core/layout";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { LayerStack } from "@/peblor/section/stack/LayerStack";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { generateElementKey } from "@pb/core/keys";
import { useRevealExternalTrigger } from "@/peblor/triggers/core/use-reveal-external-trigger";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeString } from "@/peblor/theme/theme-string";

const MOTION_DISPLAY_CONTENTS: CSSProperties = { display: "contents" };

type Props = Extract<SectionBlock, { type: "revealSection" }> & {
  _isFirstSection?: boolean;
};

export function SectionReveal({
  id,
  ariaLabel,
  fill,
  layers,
  effects,
  width,
  height,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  align,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  borderRadius,
  border,
  boxShadow,
  filter,
  backdropFilter,
  clipPath,
  cursor,
  aspectRatio,
  scrollSpeed,
  initialX,
  initialY,
  zIndex,
  motion: motionFromJson,
  motionTiming,
  reduceMotion,
  triggerMode,
  initialRevealed = false,
  revealOnHover,
  revealOnClick,
  toggleOnClick = true,
  externalTriggerKey,
  externalTriggerMode,
  expandAxis = "vertical",
  collapsedSize,
  expandedSize,
  expandDurationMs,
  collapseDurationMs,
  transitionEasing,
  collapsedElements = [],
  revealedElements = [],
  revealStaggerMs,
  revealDurationMs,
  revealPreset,
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const [isRevealed, setRevealed] = useState(initialRevealed);

  const resolvedFill = resolveThemeString(resolveResponsiveValue(fill, isMobile), themeMode);

  useRevealExternalTrigger(externalTriggerKey, externalTriggerMode, setRevealed);

  useSectionCustomTriggers({
    keyboardTriggers,
    timerTriggers,
    cursorTriggers,
    scrollDirectionTriggers,
    idleTriggers,
  });

  const { baseStyle } = useSectionBaseStyles({
    fill,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    align,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    borderRadius,
    border,
    boxShadow,
    filter,
    backdropFilter,
    clipPath,
    cursor,
    aspectRatio,
    scrollSpeed,
    initialX,
    initialY,
    zIndex,
    effects,
    sectionRef,
    usePadding: true,
    reduceMotion,
  });

  const durationSec = useMemo(() => {
    const expand = expandDurationMs != null ? expandDurationMs / 1000 : 0.3;
    const collapse = collapseDurationMs != null ? collapseDurationMs / 1000 : expand;
    return { expand, collapse };
  }, [expandDurationMs, collapseDurationMs]);

  const safeCollapsedElements = useMemo(
    () => (Array.isArray(collapsedElements) ? collapsedElements : []),
    [collapsedElements]
  );
  const safeRevealedElements = useMemo(
    () => (Array.isArray(revealedElements) ? revealedElements : []),
    [revealedElements]
  );

  const sectionMotion = useMemo((): MotionPropsFromJson | undefined => {
    const base =
      motionFromJson && typeof motionFromJson === "object"
        ? mergeMotionDefaults(motionFromJson)
        : mergeMotionDefaults({});
    if (!base || typeof base !== "object") return undefined;
    return {
      ...base,
      layout: true,
      transition: {
        ...(typeof base.transition === "object" && base.transition ? base.transition : {}),
        duration: durationSec.expand,
        ease: transitionEasing ?? "easeInOut",
      },
    };
  }, [motionFromJson, durationSec.expand, transitionEasing]);

  const handleMouseEnter = useCallback(() => {
    if (revealOnHover && (triggerMode === "hover" || triggerMode === "combined")) {
      setRevealed(true);
    }
  }, [revealOnHover, triggerMode]);

  const handleMouseLeave = useCallback(() => {
    if (revealOnHover && (triggerMode === "hover" || triggerMode === "combined")) {
      setRevealed(false);
    }
  }, [revealOnHover, triggerMode]);

  const handleClick = useCallback(() => {
    if (!revealOnClick && triggerMode !== "click" && triggerMode !== "combined") return;
    if (toggleOnClick) {
      setRevealed((prev) => !prev);
    } else {
      setRevealed(true);
    }
  }, [revealOnClick, triggerMode, toggleOnClick]);

  const hasHover = revealOnHover && (triggerMode === "hover" || triggerMode === "combined");
  const hasClick =
    revealOnClick !== undefined
      ? revealOnClick
      : triggerMode === "click" || triggerMode === "combined";

  /** A11Y-10: when the section acts as a button, name the control action (placeholder copy). */
  const resolvedAriaLabel = useMemo(() => {
    const author = resolveResponsiveValue(ariaLabel, isMobile)?.trim();
    const region = (author && author.length > 0 ? author : null) ?? id?.trim() ?? "Reveal section";
    if (hasClick) {
      return author && author.length > 0
        ? `Toggle reveal: ${author}`
        : "Toggle to show or hide section content";
    }
    return region;
  }, [ariaLabel, isMobile, id, hasClick]);

  const innerContainerStyle = useMemo<CSSProperties>(() => {
    const flexDir =
      expandAxis === "horizontal" ? "row" : expandAxis === "both" ? "column" : "column";
    const style: CSSProperties = {
      overflow: "hidden",
      display: "flex",
      flexDirection: flexDir,
      width: "100%",
      minHeight: 0,
    };
    if (collapsedSize?.height && !isRevealed) style.height = collapsedSize.height;
    if (collapsedSize?.width && !isRevealed) style.width = collapsedSize.width;
    if (expandedSize?.height && isRevealed) style.height = expandedSize.height;
    if (expandedSize?.width && isRevealed) style.width = expandedSize.width;
    return style;
  }, [expandAxis, isRevealed, collapsedSize, expandedSize]);

  const hasStaggerReveal =
    isRevealed &&
    safeRevealedElements.length > 0 &&
    (revealStaggerMs != null || revealDurationMs != null || revealPreset != null);
  const staggerMs = revealStaggerMs ?? 50;
  const itemDurationMs = revealDurationMs ?? 300;
  const easing = transitionEasing ?? "easeOut";

  const staggerVariants = useMemo(() => {
    const presets = MOTION_DEFAULTS.entrancePresets;
    const preset = revealPreset
      ? (presets[revealPreset] ??
        (MOTION_DEFAULTS.defaultEntrancePreset
          ? presets[MOTION_DEFAULTS.defaultEntrancePreset]
          : undefined))
      : undefined;
    const mc = MOTION_DEFAULTS.motionComponent;
    const initial = (preset?.initial ?? mc.initial) as Record<string, string | number | number[]>;
    const animateBase = (preset?.animate ?? mc.animate) as Record<
      string,
      string | number | number[]
    >;
    return {
      container: {
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerMs / 1000,
            delayChildren: 0,
          },
        },
      },
      item: {
        initial,
        animate: {
          ...animateBase,
          transition: {
            duration: itemDurationMs / 1000,
            ease: easing as Easing,
          },
        },
      },
    };
  }, [revealPreset, staggerMs, itemDurationMs, easing]);

  const renderRevealedElements = () => {
    if (hasStaggerReveal) {
      return (
        <motion.div
          variants={staggerVariants.container}
          initial="initial"
          animate="animate"
          style={MOTION_DISPLAY_CONTENTS}
        >
          {safeRevealedElements.map((block: ElementBlock, i: number) => (
            <motion.div
              key={generateElementKey(block, safeCollapsedElements.length + i)}
              variants={staggerVariants.item}
              style={MOTION_DISPLAY_CONTENTS}
            >
              <ElementRenderer block={block} />
            </motion.div>
          ))}
        </motion.div>
      );
    }
    return safeRevealedElements.map((block, i) => (
      <ElementRenderer
        key={generateElementKey(block, safeCollapsedElements.length + i)}
        block={block}
      />
    ));
  };

  return (
    <SectionMotionWrapper
      sectionRef={sectionRef}
      motion={sectionMotion}
      motionTiming={motionTiming}
      reduceMotion={reduceMotion}
      className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
      style={applySectionFillStyle(resolvedFill, layers, baseStyle)}
      aria-label={resolvedAriaLabel}
      onMouseEnter={hasHover ? handleMouseEnter : undefined}
      onMouseLeave={hasHover ? handleMouseLeave : undefined}
      onClick={hasClick ? handleClick : undefined}
      role={hasClick ? "button" : undefined}
      tabIndex={hasClick ? 0 : undefined}
      onKeyDown={
        hasClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {layers?.length ? <LayerStack layers={layers} /> : null}
      <SectionGlassEffect effects={effects} sectionRef={sectionRef} />
      <motion.div
        layout
        transition={{
          duration: isRevealed ? durationSec.expand : durationSec.collapse,
          ease: (transitionEasing ?? "easeInOut") as Easing,
        }}
        style={innerContainerStyle}
        className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
      >
        {safeCollapsedElements.map((block, i) => (
          <ElementRenderer key={generateElementKey(block, i)} block={block} />
        ))}
        {isRevealed && renderRevealedElements()}
      </motion.div>
    </SectionMotionWrapper>
  );
}
