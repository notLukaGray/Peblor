export type DurationScale = {
  instant: number;
  fast: number;
  normal: number;
  slow: number;
  slower: number;
};

export type EasingPresets = {
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  spring: string;
  bounce: string;
  linear: string;
};

export const DEFAULT_DURATION_SCALE: DurationScale = {
  instant: 80,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 800,
};

export const DEFAULT_EASING_PRESETS: EasingPresets = {
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  linear: "linear",
};

export type MotionFoundations = {
  durations: DurationScale;
  easings: EasingPresets;
  staggerStep: number;
  reduceMotionPolicy: "honor-system" | "disable-all" | "replace-with-fade";
};

export const DEFAULT_MOTION_FOUNDATIONS: MotionFoundations = {
  durations: DEFAULT_DURATION_SCALE,
  easings: DEFAULT_EASING_PRESETS,
  staggerStep: 50,
  reduceMotionPolicy: "honor-system",
};

export function motionFoundationsToCssVars(motion: MotionFoundations): Record<string, string> {
  return {
    "--pb-duration-instant": `${motion.durations.instant}ms`,
    "--pb-duration-fast": `${motion.durations.fast}ms`,
    "--pb-duration-normal": `${motion.durations.normal}ms`,
    "--pb-duration-slow": `${motion.durations.slow}ms`,
    "--pb-duration-slower": `${motion.durations.slower}ms`,
    "--pb-ease-in": motion.easings.easeIn,
    "--pb-ease-out": motion.easings.easeOut,
    "--pb-ease-in-out": motion.easings.easeInOut,
    "--pb-ease-spring": motion.easings.spring,
    "--pb-ease-bounce": motion.easings.bounce,
    "--pb-ease-linear": motion.easings.linear,
    "--pb-motion-stagger-step": `${Math.max(0, motion.staggerStep)}ms`,
    "--pb-reduce-motion-policy": motion.reduceMotionPolicy,
  };
}
