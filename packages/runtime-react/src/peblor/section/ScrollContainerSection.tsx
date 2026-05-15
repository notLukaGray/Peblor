"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { SectionBlock } from "@pb/contracts/types";
import { handleSectionWheel, getDefaultScrollSpeed } from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import { useSectionBaseStyles } from "@/peblor/section/position/use-section-base-styles";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { applySectionFillStyle } from "@pb/core/layout";
import { LayerStack } from "./stack/LayerStack";
import { SectionGlassEffect } from "./stack/SectionGlassEffect";
import { ElementRenderer } from "../elements/Shared/ElementRenderer";
import { generateElementKey } from "@pb/core/keys";
import { SectionMotionWrapper } from "@/peblor/integrations/framer-motion";
import { SectionScrollTargetProvider } from "@/peblor/section/position/SectionScrollTargetContext";
import { useSectionViewportTrigger } from "@/peblor/triggers/core/use-section-viewport-trigger";
import { useSectionCustomTriggers } from "@/peblor/triggers/core/use-section-custom-triggers";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeString } from "@/peblor/theme/theme-string";

type Props = Extract<SectionBlock, { type: "scrollContainer" }> & {};

export function ScrollContainerSection({
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
  scrollSpeed = getDefaultScrollSpeed(),
  initialX,
  initialY,
  zIndex,
  scrollDirection = "vertical",
  scrollProgressTrigger,
  scrollProgressTriggerId,
  elements = [],
  motion: motionFromJson,
  motionTiming,
  reduceMotion,
  onVisible,
  onInvisible,
  onProgress,
  onViewportProgress,
  threshold,
  triggerOnce,
  rootMargin,
  delay,
  keyboardTriggers,
  timerTriggers,
  cursorTriggers,
  scrollDirectionTriggers,
  idleTriggers,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useSectionViewportTrigger(sectionRef, {
    onVisible,
    onInvisible,
    onProgress,
    onViewportProgress,
    threshold,
    triggerOnce,
    rootMargin,
    delay,
  });

  useSectionCustomTriggers({
    keyboardTriggers,
    timerTriggers,
    cursorTriggers,
    scrollDirectionTriggers,
    idleTriggers,
  });

  const resolvedTriggerId = scrollProgressTrigger?.id ?? scrollProgressTriggerId;
  const triggerInvert = scrollProgressTrigger?.invert ?? false;
  const inputRange = scrollProgressTrigger?.input;

  const targetProgressRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!resolvedTriggerId) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const ease = 0.06; // slow transition: lerp toward target each frame
    const tick = () => {
      const target = targetProgressRef.current;
      if (target == null) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (scrollDirection === "horizontal") {
        const maxScroll = el.scrollWidth - el.clientWidth;
        const targetScroll = target * maxScroll;
        const current = el.scrollLeft;
        const next = current + (targetScroll - current) * ease;
        if (Math.abs(next - targetScroll) < 0.5) {
          el.scrollLeft = targetScroll;
          targetProgressRef.current = null;
        } else {
          el.scrollLeft = next;
        }
      } else {
        const maxScroll = el.scrollHeight - el.clientHeight;
        const targetScroll = target * maxScroll;
        const current = el.scrollTop;
        const next = current + (targetScroll - current) * ease;
        if (Math.abs(next - targetScroll) < 0.5) {
          el.scrollTop = targetScroll;
          targetProgressRef.current = null;
        } else {
          el.scrollTop = next;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const handler = (e: CustomEvent<{ id: string; progress: number }>) => {
      if (e.detail?.id !== resolvedTriggerId || typeof e.detail?.progress !== "number") return;
      let p = Math.max(0, Math.min(1, e.detail.progress));
      if (inputRange && inputRange[1] !== inputRange[0]) {
        const [a, b] = inputRange;
        p = (p - a) / (b - a);
        p = Math.max(0, Math.min(1, p));
      }
      if (triggerInvert) p = 1 - p;
      targetProgressRef.current = p;
    };
    window.addEventListener("update-transition-progress", handler as EventListener);
    return () => {
      window.removeEventListener("update-transition-progress", handler as EventListener);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [resolvedTriggerId, triggerInvert, inputRange, scrollDirection]);
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const resolvedAriaLabel =
    resolveResponsiveValue(ariaLabel, isMobile) ?? id ?? "Scroll container section";
  const resolvedFill = resolveThemeString(resolveResponsiveValue(fill, isMobile), themeMode);
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
    usePadding: true, // Scroll containers use padding
    reduceMotion,
  });

  const scrollContainerStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {
      width: "100%",
      height: "100%",
      overflowX: scrollDirection === "horizontal" ? "auto" : "hidden",
      overflowY: scrollDirection === "vertical" ? "auto" : "hidden",
      scrollBehavior: "smooth",
      // Reinforce scrollbar hiding so Chrome doesn’t show overlay scrollbar on scroll
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    };

    if (scrollDirection === "horizontal") {
      style.display = "flex";
      style.flexDirection = "row";
      style.flexWrap = "nowrap";
    }

    return style;
  }, [scrollDirection]);

  const wheelHandler = useMemo(
    () => (e: React.WheelEvent<HTMLElement>) => {
      e.stopPropagation();
      handleSectionWheel(e, scrollSpeed);
    },
    [scrollSpeed]
  );

  const scrollContainerWheelHandler = useMemo(() => {
    if (scrollDirection !== "horizontal") return undefined;
    return (e: React.WheelEvent<HTMLDivElement>) => {
      const el = scrollContainerRef.current;
      if (!el) return;
      e.stopPropagation();
      el.scrollLeft += e.deltaY;
    };
  }, [scrollDirection]);

  return (
    <SectionMotionWrapper
      sectionRef={sectionRef}
      motion={motionFromJson}
      motionTiming={motionTiming}
      reduceMotion={reduceMotion}
      className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
      style={applySectionFillStyle(resolvedFill, layers, baseStyle)}
      aria-label={resolvedAriaLabel}
      onWheel={wheelHandler}
    >
      <SectionScrollTargetProvider sectionRef={sectionRef}>
        {layers?.length ? <LayerStack layers={layers} /> : null}
        <SectionGlassEffect effects={effects} sectionRef={sectionRef} />
        <div
          ref={scrollContainerRef}
          className={`scroll-container-hide-scrollbar relative z-[var(--pb-z-raised)] flex min-h-0 flex-col ${
            scrollDirection === "horizontal" ? "shrink-0" : "min-h-0 flex-1"
          }`}
          style={scrollContainerStyle}
          onWheel={scrollContainerWheelHandler}
        >
          {elements.map((block, i) => (
            <ElementRenderer key={generateElementKey(block, i)} block={block} />
          ))}
        </div>
      </SectionScrollTargetProvider>
    </SectionMotionWrapper>
  );
}
