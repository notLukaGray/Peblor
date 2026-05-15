import { describe, it, expect } from "vitest";
import * as FM from "./index";
import * as Accessibility from "./accessibility";
import * as ReducedMotion from "./reduced-motion";
import * as Viewport from "./viewport";
import * as Animations from "./animations";
import * as Presence from "./presence";
import * as MotionValues from "./motion-values";
import * as Triggers from "./triggers";
import * as Layout from "./layout";
import * as Gestures from "./gestures";
import * as VideoLazyLoad from "./use-video-lazy-load";
import * as SectionMotionWrapperModule from "./section-motion-wrapper";
import * as SectionScrollProgressBarModule from "./section-scroll-progress-bar";
import * as MotionFromJsonModule from "./motion-from-json";
import * as DragHandleControlsModule from "./drag-handle-controls";
import * as ScrollStyleModule from "./scroll-style";

describe("framer-motion integration index", () => {
  it("re-exports accessibility and reduced-motion hooks", () => {
    expect(FM.useReducedMotion).toBe(Accessibility.useReducedMotion);
    expect(FM.useReducedMotionConfig).toBe(Accessibility.useReducedMotionConfig);
    expect(FM.useShouldReduceMotion).toBe(ReducedMotion.useShouldReduceMotion);
  });

  it("re-exports viewport hook", () => {
    expect(FM.useInView).toBe(Viewport.useInView);
  });

  it("re-exports animation primitives", () => {
    expect(FM.motion).toBe(Animations.motion);
    expect(FM.animate).toBe(Animations.animate);
    expect(FM.AnimatePresence).toBe(Animations.AnimatePresence);
    expect(FM.delay).toBe(Animations.delay);
    expect(FM.MotionConfig).toBe(Animations.MotionConfig);
  });

  it("re-exports presence hooks", () => {
    expect(FM.usePresence).toBe(Presence.usePresence);
    expect(FM.useIsPresent).toBe(Presence.useIsPresent);
  });

  it("re-exports motion value hooks", () => {
    expect(FM.useMotionValue).toBe(MotionValues.useMotionValue);
    expect(FM.useMotionValueEvent).toBe(MotionValues.useMotionValueEvent);
    expect(FM.useTransform).toBe(MotionValues.useTransform);
    expect(FM.useSpring).toBe(MotionValues.useSpring);
  });

  it("re-exports scroll trigger", () => {
    expect(FM.useScroll).toBe(Triggers.useScroll);
  });

  it("re-exports layout hooks", () => {
    expect(FM.useInstantLayoutTransition).toBe(Layout.useInstantLayoutTransition);
    expect(FM.useInstantTransition).toBe(Layout.useInstantTransition);
    expect(FM.useResetProjection).toBe(Layout.useResetProjection);
  });

  it("re-exports gestures (ReorderGroup/ReorderItem, not raw Reorder)", () => {
    expect(FM.useDragControls).toBe(Gestures.useDragControls);
    expect(FM.ReorderGroup).toBe(Gestures.ReorderGroup);
    expect(FM.ReorderItem).toBe(Gestures.ReorderItem);
  });

  it("re-exports video lazy load hook", () => {
    expect(FM.useVideoLazyLoad).toBe(VideoLazyLoad.useVideoLazyLoad);
  });

  it("re-exports section helpers", () => {
    expect(FM.SectionMotionWrapper).toBe(SectionMotionWrapperModule.SectionMotionWrapper);
    expect(FM.SectionScrollProgressBar).toBe(
      SectionScrollProgressBarModule.SectionScrollProgressBar
    );
  });

  it("re-exports drag/scroll helpers and MotionFromJson", () => {
    expect(FM.useDragHandleControls).toBe(DragHandleControlsModule.useDragHandleControls);
    expect(FM.useSectionScrollOpacityStyle).toBe(ScrollStyleModule.useSectionScrollOpacityStyle);
    expect(FM.MotionFromJson).toBe(MotionFromJsonModule.MotionFromJson);
  });
});
