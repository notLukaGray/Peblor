import type { BgLayerMotion, BgLoopMotion } from "@pb/contracts/types";

// Properties we can safely compile to CSS @keyframes
// (identity "from" value is always known: opacity=1, scale=1, rotate=0)
const CSS_COMPILABLE_ANIMATE_PROPS = new Set(["opacity", "scale", "rotate"]);

export function isLoopCssCompilable(motion: BgLoopMotion): boolean {
  const keys = Object.keys(motion.to);
  if (keys.length === 0) return false;
  return keys.every((k) => CSS_COMPILABLE_ANIMATE_PROPS.has(k));
}

export type MotionPartition = {
  cssLoops: BgLoopMotion[];
  jsMotions: BgLayerMotion[];
};

export function partitionLayerMotions(motions: BgLayerMotion[]): MotionPartition {
  const cssLoops: BgLoopMotion[] = [];
  const jsMotions: BgLayerMotion[] = [];
  for (const m of motions) {
    if (m.type === "loop" && isLoopCssCompilable(m)) cssLoops.push(m);
    else jsMotions.push(m);
  }
  return { cssLoops, jsMotions };
}

// Identity "from" values for compilable properties
const IDENTITY: Record<string, string> = {
  opacity: "1",
  scale: "1",
  rotate: "0deg",
};

function toValue(prop: string, value: unknown): string {
  if (typeof value === "number") {
    if (prop === "rotate") return `${value}deg`;
    return String(value);
  }
  return String(value);
}

/**
 * Converts a BgLoopMotion to a CSS animation shorthand and @keyframes rule.
 * animationId should be a stable unique string (e.g., hash of layer index + page route).
 */
export function loopMotionToCss(
  motion: BgLoopMotion,
  animationId: string
): { keyframes: string; animationValue: string } {
  const fromParts: string[] = [];
  const toParts: string[] = [];

  for (const [prop, value] of Object.entries(motion.to)) {
    fromParts.push(`${prop}: ${IDENTITY[prop] ?? "0"}`);
    toParts.push(`${prop}: ${toValue(prop, value)}`);
  }

  const direction =
    motion.transition.repeatType === "mirror" || motion.transition.repeatType === "reverse"
      ? "alternate"
      : "normal";

  const ease = Array.isArray(motion.transition.ease)
    ? `cubic-bezier(${motion.transition.ease.join(",")})`
    : (motion.transition.ease ?? "ease-in-out");

  const delay = motion.transition.delay ? `${motion.transition.delay}s` : "0s";

  const keyframes = `@keyframes pb-loop-${animationId} {
  from { ${fromParts.join("; ")} }
  to { ${toParts.join("; ")} }
}`;

  const animationValue = `pb-loop-${animationId} ${motion.transition.duration}s ${ease} ${delay} infinite ${direction}`;

  return { keyframes, animationValue };
}
