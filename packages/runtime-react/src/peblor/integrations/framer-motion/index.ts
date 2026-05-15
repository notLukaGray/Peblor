"use client";

/**
 * Framer Motion integration for the Peblor.
 * All framer-motion imports go through this folder; no direct "framer-motion" imports elsewhere in peblor.
 *
 * Data flow: JSON motion/motionTiming → schemas (motion-props-schema) → mergeMotionDefaults (peblor-motion-defaults)
 * → wrappers (ElementEntranceWrapper, SectionMotionWrapper, ModalAnimationWrapper, etc.) → MotionFromJson → motion.* components.
 * See docs/integrations/framer-motion.md for full architecture and where to add new motion features.
 */

export { useReducedMotion, useReducedMotionConfig } from "./accessibility";
export { useShouldReduceMotion } from "./reduced-motion";
export { useInView } from "./viewport";
export { motion, animate, AnimatePresence, delay, MotionConfig } from "./animations";
export { usePresence, useIsPresent } from "./presence";
export { useMotionValue, useMotionValueEvent, useTransform, useSpring } from "./motion-values";
export { useScroll } from "./triggers";
export { useInstantLayoutTransition, useInstantTransition, useResetProjection } from "./layout";
export { LayoutMotionDiv } from "./layout-motion-div";
export { useDragControls, ReorderGroup, ReorderItem } from "./gestures";
export { useVideoLazyLoad } from "./use-video-lazy-load";
export { MotionFromJson } from "./motion-from-json";
export { ElementExitWrapper } from "./element-exit-wrapper";
export { SectionScrollProgressBar } from "./section-scroll-progress-bar";
export { SectionMotionWrapper } from "./section-motion-wrapper";
export {
  useDragHandleControls,
  type DragHandleBindings,
  type UseDragHandleControlsResult,
} from "./drag-handle-controls";
export { useSectionScrollOpacityStyle, type ScrollOpacityRange } from "./scroll-style";
export { useBgLayerMotion, type BgLayerMotionStyle } from "./use-bg-layer-motion";
export type { Easing, DragControls, HTMLMotionProps, MotionValue } from "./types";
