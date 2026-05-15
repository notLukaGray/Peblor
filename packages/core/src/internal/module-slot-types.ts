import type {
  CssInlineStyle,
  SectionEffect,
  SectionDefinitionBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";

export type GestureDef = {
  gesture: string;
  region?: string;
  action: string;
  payload?: number;
  /** Optional feedback type to show after executing (e.g. seekBack, seekForward). */
  feedbackType?: string;
};

/** Generic slot config for module overlays. Context-specific resolvers handle visibleWhen, actions, feedback. */
export type ModuleSlotConfig = {
  position?: string;
  inset?: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  zIndex?: number;
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  rowGap?: string | number;
  columnGap?: string | number;
  padding?: string;
  /** When set, the whole slot is clickable (empty area / fallback). */
  action?: string;
  /** Gesture handlers: singleTap, doubleTap with optional region (left/center/right). */
  gestures?: GestureDef[];
  /** When to show: "always" or array of state strings. Resolved by context (e.g. video: awake, playing, paused). */
  visibleWhen?: "always" | string[];
  layoutModeWhen?: string;
  layoutMode?: "hug" | "stretch";
  expandDurationMs?: number;
  elementRevealMs?: number;
  elementRevealStaggerMs?: number;
  feedbackSlot?: boolean;
  feedbackMap?: Record<string, string>;
  feedbackChromeStyle?: CssInlineStyle;
  feedbackDurationMs?: number;
  transition?: { durationMs?: number; easing?: string };
  /** Optional full motion config for slot visibility. From framer-motion-presets or inline. */
  motion?: import("@pb/contracts/types").MotionPropsFromJson;
  /** When false, slot wrapper does not get default hover/tap/focus gestures (avoids bar expanding and blocking buttons). */
  slotWrapperGestures?: boolean;
  /** Gesture keyframes for the slot wrapper (whileHover, whileTap, whileFocus). From JSON; overrides merged motion when set. No hardcoding. */
  wrapperMotion?: {
    whileHover?: Record<string, unknown>;
    whileTap?: Record<string, unknown>;
    whileFocus?: Record<string, unknown>;
  };
  /**
   * How this slot inherits the parent motion layer's transform.
   * - "inherit" (default): slot is inside the motion layer; it scales/moves with the parent (e.g. whileHover/whileTap).
   * - "disable": slot is rendered in a separate layer so it does not inherit parent transform; size and position stay locked.
   * - "follow": slot follows parent translate but not scale (reserved for future use; currently treated as inherit).
   */
  transformInherit?: "inherit" | "disable" | "follow";
  /** Optional preset name for slot visibility keyframes (entrancePresets). */
  visibilityPreset?: string;
  /** Optional preset name for stagger reveal item keyframes (entrancePresets). */
  revealPreset?: string;
  section?: {
    type?: string;
    elementOrder?: string[];
    definitions?: Record<string, SectionDefinitionBlock>;
  };
  defaultWrapperStyle?: CssInlineStyle;
  effects?: SectionEffect[];
  style?: CssInlineStyle;
};
