/**
 * Motion shorthand annotation → motionTiming object builder.
 *
 * Reads the following keys from a parsed [pb: ...] annotation map:
 *   entrance=slideUp         → entrancePreset
 *   exit=fade                → exitPreset
 *   trigger=onFirstVisible   → trigger (default "onFirstVisible" when omitted)
 *   duration=0.5             → entranceMotion.transition.duration (tween only)
 *   delay=0.2                → entranceMotion.transition.delay
 *   ease=easeOut             → entranceMotion.transition.ease (tween only)
 *   ease=spring              → entranceMotion.transition.type = "spring"
 *   stiffness=200            → entranceMotion.transition.stiffness (spring only)
 *   damping=20               → entranceMotion.transition.damping (spring only)
 *   viewportAmount=0.1       → viewport.amount
 *
 * When ease=spring, duration and ease keys are omitted; spring physics drives the
 * animation. stiffness and damping are included only when explicitly annotated.
 *
 * Returns undefined when neither entrance nor exit is set (no-op).
 */

import { annotationNumber } from "./annotations";

// ---------------------------------------------------------------------------
// Valid preset / trigger literals
// ---------------------------------------------------------------------------

const ENTRANCE_EXIT_PRESETS = new Set(["fade", "slideUp", "slideDown", "slideLeft", "slideRight"]);

const TRIGGER_VALUES = new Set(["onMount", "onFirstVisible", "onEveryVisible", "onTrigger"]);

// ---------------------------------------------------------------------------
// Output shape (mirrors the runtime motionTimingSchema)
// ---------------------------------------------------------------------------

/** Tween transition — duration and ease drive the animation. */
interface MotionTransitionTween {
  duration?: number;
  delay?: number;
  ease?: string;
}

/** Spring transition — physics drive the animation; no duration/ease keys. */
interface MotionTransitionSpring {
  type: "spring";
  delay?: number;
  stiffness?: number;
  damping?: number;
}

type MotionTransition = MotionTransitionTween | MotionTransitionSpring;

interface MotionTimingViewport {
  amount: number;
}

export interface MotionTiming {
  trigger: string;
  entrancePreset?: string;
  exitPreset?: string;
  viewport?: MotionTimingViewport;
  entranceMotion?: {
    transition: MotionTransition;
  };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Maps parsed annotation key/value pairs to a `motionTiming` object.
 *
 * Returns `undefined` when neither `entrance` nor `exit` annotations are present,
 * so callers can skip attaching the field entirely.
 *
 * @example
 * buildMotionTiming({ entrance: "slideUp", exit: "fade", duration: "0.5", delay: "0.2", trigger: "onFirstVisible", viewportamount: "0.1" })
 * // → { trigger: "onFirstVisible", entrancePreset: "slideUp", exitPreset: "fade", viewport: { amount: 0.1 }, entranceMotion: { transition: { duration: 0.5, delay: 0.2 } } }
 */
export function buildMotionTiming(annotations: Record<string, string>): MotionTiming | undefined {
  // Annotation keys are lower-cased by parseAnnotations.
  const entranceRaw = annotations["entrance"];
  const exitRaw = annotations["exit"];

  // Guard: nothing to emit when neither entrance nor exit is set.
  if (!entranceRaw && !exitRaw) return undefined;

  const entrancePreset =
    entranceRaw && ENTRANCE_EXIT_PRESETS.has(entranceRaw) ? entranceRaw : undefined;

  const exitPreset = exitRaw && ENTRANCE_EXIT_PRESETS.has(exitRaw) ? exitRaw : undefined;

  // Resolve trigger — validate against the allowed set, default to "onFirstVisible".
  const triggerRaw = annotations["trigger"];
  const trigger = triggerRaw && TRIGGER_VALUES.has(triggerRaw) ? triggerRaw : "onFirstVisible";

  // Numeric fields
  const duration = annotationNumber(annotations, "duration");
  const delay = annotationNumber(annotations, "delay");
  const viewportAmount = annotationNumber(annotations, "viewportamount");
  const stiffness = annotationNumber(annotations, "stiffness");
  const damping = annotationNumber(annotations, "damping");
  const easeRaw = annotations["ease"];
  const isSpring = easeRaw === "spring";

  // Build transition override — only attach if at least one value is present.
  let transition: MotionTransition;
  if (isSpring) {
    // Spring physics: omit duration/ease, include optional spring params.
    const t: MotionTransitionSpring = { type: "spring" };
    if (delay !== undefined) t.delay = delay;
    if (stiffness !== undefined) t.stiffness = stiffness;
    if (damping !== undefined) t.damping = damping;
    transition = t;
  } else {
    const t: MotionTransitionTween = {};
    if (duration !== undefined) t.duration = duration;
    if (delay !== undefined) t.delay = delay;
    if (easeRaw) t.ease = easeRaw;
    transition = t;
  }
  const hasTransition = Object.keys(transition).length > 0;

  const motionTiming: MotionTiming = {
    trigger,
    ...(entrancePreset ? { entrancePreset } : {}),
    ...(exitPreset ? { exitPreset } : {}),
    ...(viewportAmount !== undefined ? { viewport: { amount: viewportAmount } } : {}),
    ...(hasTransition ? { entranceMotion: { transition } } : {}),
  };

  return motionTiming;
}
