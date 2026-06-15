/**
 * Pipeline stage: pre-compile button `bgFill` loop animation CSS at build time.
 *
 * Element buttons with `bgFill.motion` containing loop entries receive a
 * `_buttonLoopCss` field with pre-generated @keyframes rules and animation
 * shorthand values. The client hook (`useButtonPointer`) then injects
 * this pre-compiled CSS directly instead of generating it at runtime via
 * `useInsertionEffect`.
 *
 * This eliminates runtime CSS generation for all buttons whose loop
 * configuration is statically known from the JSON definition.
 *
 * The `_buttonLoopCss` field is namespaced to buttons to avoid collision
 * with any future loop-CSS precompilation on other element types (e.g.
 * section backgrounds that also have `bgFill`).
 */
import type { ElementBlock } from "@pb/contracts/types";
import { generateKeyframes, buildAnimationValue } from "./css-keyframe-utils";

// ---------------------------------------------------------------------------
// Loop CSS result stored on the element
// ---------------------------------------------------------------------------

export type ButtonLoopCss = {
  keyframes: string;
  animation: string;
};

// ---------------------------------------------------------------------------
// Per-element transform
// ---------------------------------------------------------------------------

/**
 * Pre-compile @keyframes CSS for all `bgFill.motion.loop` entries on
 * elementButton elements. Stores the result in `_buttonLoopCss` so the client
 * hook can inject the CSS directly instead of generating it at runtime.
 *
 * Non-button elements pass through unchanged.
 */
export function precompileButtonLoopCssOnElement(el: ElementBlock): ElementBlock {
  if (el.type !== "elementButton") return el;

  const rec = el as Record<string, unknown>;
  const bgFill = rec.bgFill as { motion?: Array<Record<string, unknown>> } | undefined;
  if (!bgFill) return el;

  const motion = bgFill.motion;
  if (!motion || !Array.isArray(motion)) return el;

  const loopMotions = motion.filter((m) => m.type === "loop");
  if (loopMotions.length === 0) return el;

  const elementId = rec.id;
  const uid = typeof elementId === "string" && elementId.length > 0 ? elementId : "btn";

  const keyframesParts: string[] = [];
  const animationValues: string[] = [];

  for (let i = 0; i < loopMotions.length; i++) {
    const loop = loopMotions[i]!;
    const name = `pb-btn-loop-${uid}-${i}`;
    const animate = loop.to as Record<string, (string | number)[]> | undefined;
    const transition = loop.transition as
      | {
          duration: number;
          ease?: string | number[];
          delay?: number;
          repeatType?: string;
        }
      | undefined;

    if (!animate || !transition) continue;
    const frames = generateKeyframes(name, animate);
    if (frames) {
      keyframesParts.push(frames);
      animationValues.push(buildAnimationValue(name, transition));
    }
  }

  if (keyframesParts.length === 0) return el;

  const result = { ...rec };
  result.bgFill = {
    ...bgFill,
    _buttonLoopCss: {
      keyframes: keyframesParts.join("\n"),
      animation: animationValues.join(", "),
    },
  };

  return result as ElementBlock;
}
