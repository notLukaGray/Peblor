import type {
  PbImageAnimationCurve,
  PbImageAnimationDefaults,
  PbImageAnimationDirection,
  PbImageAnimationFineTune,
  PbImageAnimationPreset,
  PbImageAnimationTrigger,
  PbImageExitTrigger,
  PbImageHybridStackPreset,
  PbImageMotionViewport,
} from "./pb-builder-defaults.types";

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function normalizeBezierTuple(
  value: [number, number, number, number]
): [number, number, number, number] {
  return [
    Number.isFinite(value[0]) ? value[0] : 0.25,
    Number.isFinite(value[1]) ? value[1] : 0.46,
    Number.isFinite(value[2]) ? value[2] : 0.45,
    Number.isFinite(value[3]) ? value[3] : 0.94,
  ];
}

function toMotionEase(curve: PbImageAnimationCurve): string | [number, number, number, number] {
  if (curve.preset === "customBezier") return normalizeBezierTuple(curve.customBezier);
  return curve.preset;
}

function toMotionTransition(
  duration: number,
  delay: number,
  curve: PbImageAnimationCurve
): {
  type: "tween";
  duration: number;
  delay: number;
  ease: string | [number, number, number, number];
} {
  return {
    type: "tween",
    duration: Math.max(0, duration),
    delay: Math.max(0, delay),
    ease: toMotionEase(curve),
  };
}

function toEntranceOffset(
  direction: PbImageAnimationDirection,
  distancePx: number
): {
  x?: number;
  y?: number;
} {
  const distance = Math.max(0, distancePx);
  if (direction === "up") return { y: distance };
  if (direction === "down") return { y: -distance };
  if (direction === "left") return { x: distance };
  if (direction === "right") return { x: -distance };
  return {};
}

function toExitOffset(
  direction: PbImageAnimationDirection,
  distancePx: number
): {
  x?: number;
  y?: number;
} {
  const distance = Math.max(0, distancePx);
  if (direction === "up") return { y: -distance };
  if (direction === "down") return { y: distance };
  if (direction === "left") return { x: -distance };
  if (direction === "right") return { x: distance };
  return {};
}

function getEntrancePresetKeyframes(preset: PbImageAnimationPreset): {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
} {
  switch (preset) {
    case "fade":
      return { initial: { opacity: 0 }, animate: { opacity: 1 } };
    case "slideUp":
      return { initial: { y: 24 }, animate: { y: 0 } };
    case "slideDown":
      return { initial: { y: -24 }, animate: { y: 0 } };
    case "slideLeft":
      return { initial: { x: 24 }, animate: { x: 0 } };
    case "slideRight":
      return { initial: { x: -24 }, animate: { x: 0 } };
    case "zoomIn":
      return { initial: { scale: 0.92 }, animate: { scale: 1 } };
    case "zoomOut":
      return { initial: { scale: 1.08 }, animate: { scale: 1 } };
    case "tiltIn":
      return { initial: { rotate: -4 }, animate: { rotate: 0 } };
    default:
      return { initial: {}, animate: {} };
  }
}

function getExitPresetKeyframes(preset: PbImageAnimationPreset): { exit: Record<string, unknown> } {
  switch (preset) {
    case "fade":
      return { exit: { opacity: 0 } };
    case "slideUp":
      return { exit: { y: -24 } };
    case "slideDown":
      return { exit: { y: 24 } };
    case "slideLeft":
      return { exit: { x: -24 } };
    case "slideRight":
      return { exit: { x: 24 } };
    case "zoomIn":
      return { exit: { scale: 1.08 } };
    case "zoomOut":
      return { exit: { scale: 0.92 } };
    case "tiltIn":
      return { exit: { rotate: 4 } };
    default:
      return { exit: {} };
  }
}

function getHybridEntranceStackKeyframes(stack: PbImageHybridStackPreset): {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
} {
  if (stack === "none") return { initial: {}, animate: {} };
  return getEntrancePresetKeyframes(stack);
}

function getHybridExitStackKeyframes(stack: PbImageHybridStackPreset): {
  exit: Record<string, unknown>;
} {
  if (stack === "none") return { exit: {} };
  return getExitPresetKeyframes(stack);
}

export function mergeHybridExitStackKeyframes(stacks: PbImageHybridStackPreset[]): {
  exit: Record<string, unknown>;
} {
  let exit: Record<string, unknown> = {};
  const layers: PbImageHybridStackPreset[] = stacks.length > 0 ? stacks : ["none"];
  for (const stack of layers) {
    const kf = getHybridExitStackKeyframes(stack);
    exit = { ...exit, ...kf.exit };
  }
  return { exit };
}

/** Shallow merge of motion snapshot objects; later arguments override earlier for the same key. */
function mergeAnimationRecords(...parts: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of parts) {
    for (const [k, v] of Object.entries(p)) {
      if (v !== undefined) out[k] = v;
    }
  }
  return out;
}

/** Ensure every keyframe has the same keys (forward-fill, then backward-fill gaps). */
function densifyHybridKeyframes(frames: Record<string, unknown>[]): Record<string, unknown>[] {
  if (frames.length === 0) return [];
  const keys = new Set<string>();
  for (const f of frames) {
    Object.keys(f).forEach((k) => keys.add(k));
  }
  const filled = frames.map((f) => ({ ...f }));
  for (const key of keys) {
    let last: unknown = undefined;
    for (let i = 0; i < filled.length; i++) {
      const row = filled[i];
      if (!row) continue;
      if (row[key] !== undefined) last = row[key];
      else if (last !== undefined) (row as Record<string, unknown>)[key] = last;
    }
    let next: unknown = undefined;
    for (let i = filled.length - 1; i >= 0; i--) {
      const row = filled[i];
      if (!row) continue;
      if (row[key] !== undefined) next = row[key];
      else if (next !== undefined) (row as Record<string, unknown>)[key] = next;
    }
  }
  return filled;
}

/**
 * Per-property keyframe arrays + `times` for Framer Motion (`whileInView` / `animate` compatible).
 */
function hybridKeyframesToAnimateAndTimes(frames: Record<string, unknown>[]): {
  animate: Record<string, unknown>;
  times: number[];
} {
  const K = frames.length;
  if (K === 0) {
    return { animate: {}, times: [0, 1] };
  }
  const keys = new Set<string>();
  for (const f of frames) Object.keys(f).forEach((k) => keys.add(k));
  const animate: Record<string, unknown> = {};
  for (const key of keys) {
    animate[key] = frames.map((f) => (f as Record<string, unknown>)[key]);
  }
  const times =
    K === 1 ? [0] : Array.from({ length: K }, (_, i) => (i === K - 1 ? 1 : i / (K - 1)));
  return { animate, times };
}

/** Converts per-segment durations (seconds, relative weights) to Framer `transition.times` knots. */
function segmentDurationsToTimes(segmentDurations: number[]): number[] {
  if (segmentDurations.length === 0) return [0, 1];
  const w = segmentDurations.map((x) => (Number.isFinite(x) && x > 0 ? x : 0.0001));
  const sum = w.reduce((a, b) => a + b, 0);
  const times: number[] = [0];
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    const wi = w[i] ?? 0.0001;
    acc += wi / sum;
    times.push(i === w.length - 1 ? 1 : acc);
  }
  return times;
}

/**
 * Hybrid entrance: base preset completes first, then each stack layer finishes in order.
 * Encoded as one tween with per-property keyframe arrays (sequential in time, not parallel merge).
 */
export function buildSequentialHybridEntranceMotion(
  entrancePreset: PbImageAnimationPreset,
  hybridStackIn: PbImageHybridStackPreset[],
  hybridDuration: number,
  segmentDurations?: number[]
): {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  transition: Record<string, unknown>;
} {
  const base = getEntrancePresetKeyframes(entrancePreset);
  const layers = hybridStackIn
    .filter((s) => s !== "none")
    .map((s) => getHybridEntranceStackKeyframes(s));

  const frames: Record<string, unknown>[] = [];

  const startParts: Record<string, unknown>[] = [base.initial];
  for (const l of layers) startParts.push(l.initial);
  frames.push(mergeAnimationRecords(...startParts));

  const midParts: Record<string, unknown>[] = [base.animate];
  for (const l of layers) midParts.push(l.initial);
  frames.push(mergeAnimationRecords(...midParts));

  for (let i = 0; i < layers.length; i++) {
    const chunk: Record<string, unknown>[] = [base.animate];
    for (let j = 0; j < layers.length; j++) {
      const layer = layers[j];
      if (!layer) continue;
      chunk.push(j <= i ? layer.animate : layer.initial);
    }
    frames.push(mergeAnimationRecords(...chunk));
  }

  const dense = densifyHybridKeyframes(frames);
  const initial = dense[0] ?? {};
  const { animate, times: uniformTimes } = hybridKeyframesToAnimateAndTimes(dense);
  const F = dense.length;
  const segmentCount = Math.max(0, F - 1);
  const times =
    segmentDurations && segmentDurations.length === segmentCount && segmentCount > 0
      ? segmentDurationsToTimes(segmentDurations)
      : uniformTimes;
  const duration = Math.max(0, Number(hybridDuration) || 0.45);

  return {
    initial,
    animate,
    transition: {
      type: "tween" as const,
      duration,
      delay: 0,
      ease: "easeOut" as const,
      times,
    },
  };
}

function propertyStaggerIndex(
  key: string,
  base: { initial: Record<string, unknown>; animate: Record<string, unknown> },
  layers: { initial: Record<string, unknown>; animate: Record<string, unknown> }[]
): number {
  if (base.initial[key] !== base.animate[key]) return 0;
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i];
    if (L && L.initial[key] !== L.animate[key]) return i + 1;
  }
  return 0;
}

/**
 * Hybrid entrance — layered: all stack presets reach their resting state in parallel (shallow merge).
 * Optional stagger uses per-property Framer transition delays (`transition.<prop>.delay`).
 */
export function buildLayeredHybridEntranceMotion(
  entrancePreset: PbImageAnimationPreset,
  hybridStackIn: PbImageHybridStackPreset[],
  hybridDuration: number,
  options?: { staggerEnabled?: boolean; staggerSec?: number }
): {
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  transition: Record<string, unknown>;
} {
  const base = getEntrancePresetKeyframes(entrancePreset);
  const layers = hybridStackIn
    .filter((s) => s !== "none")
    .map((s) => getHybridEntranceStackKeyframes(s));
  const initialMerged = mergeAnimationRecords(base.initial, ...layers.map((l) => l.initial));
  const animateMerged = mergeAnimationRecords(base.animate, ...layers.map((l) => l.animate));
  const duration = Math.max(0.05, Number(hybridDuration) || 0.45);
  const staggerEnabled = options?.staggerEnabled === true;
  const staggerSec = Math.max(0, Number(options?.staggerSec ?? 0));

  if (staggerEnabled && staggerSec > 0 && layers.length > 0) {
    const keys = new Set([...Object.keys(initialMerged), ...Object.keys(animateMerged)]);
    const transition: Record<string, unknown> = {};
    for (const key of keys) {
      const idx = propertyStaggerIndex(key, base, layers);
      transition[key] = {
        type: "tween" as const,
        duration,
        delay: idx * staggerSec,
        ease: "easeOut" as const,
      };
    }
    return {
      initial: initialMerged,
      animate: animateMerged,
      transition,
    };
  }

  return {
    initial: initialMerged,
    animate: animateMerged,
    transition: {
      type: "tween" as const,
      duration,
      delay: 0,
      ease: "easeOut" as const,
    },
  };
}

export function createImageAnimationFineTune(
  entranceDirection: PbImageAnimationDirection,
  exitDirection: PbImageAnimationDirection
): PbImageAnimationFineTune {
  return {
    entranceBehavior: "preset",
    exitBehavior: "preset",
    hybridCompositionIn: "ordered",
    hybridLayerStaggerEnabled: false,
    hybridLayerStaggerSec: 0.08,
    hybridOrderedUseStepDurations: false,
    hybridOrderedStepDurations: [],
    hybridStackIn: ["none"],
    hybridStackOut: ["none"],
    hybridEntranceDuration: 0.45,
    hybridExitDuration: 0.45,
    entrance: {
      direction: entranceDirection,
      distancePx: 24,
      fromOpacity: 0,
      toOpacity: 1,
      fromX: 0,
      toX: 0,
      fromY: 0,
      toY: 0,
      fromScale: 1,
      toScale: 1,
      fromRotate: 0,
      toRotate: 0,
      duration: 0.45,
      delay: 0,
      curve: {
        preset: "easeOut",
        customBezier: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: {
      direction: exitDirection,
      distancePx: 24,
      toOpacity: 0,
      toX: 0,
      toY: 0,
      toScale: 1,
      toRotate: 0,
      duration: 0.28,
      delay: 0,
      curve: {
        preset: "easeInOut",
        customBezier: [0.4, 0, 0.2, 1],
      },
    },
  };
}

export function buildImageMotionTimingFromAnimationDefaults(animation: PbImageAnimationDefaults): {
  trigger: PbImageAnimationTrigger;
  exitTrigger: PbImageExitTrigger;
  exitViewport?: PbImageMotionViewport;
  entrancePreset?: PbImageAnimationPreset;
  exitPreset?: PbImageAnimationPreset;
  entranceMotion?: Record<string, unknown>;
  exitMotion?: Record<string, unknown>;
} {
  const base: {
    trigger: PbImageAnimationTrigger;
    exitTrigger: PbImageExitTrigger;
    exitViewport?: PbImageMotionViewport;
    entrancePreset?: PbImageAnimationPreset;
    exitPreset?: PbImageAnimationPreset;
    entranceMotion?: Record<string, unknown>;
    exitMotion?: Record<string, unknown>;
  } = {
    trigger: animation.trigger,
    exitTrigger: animation.exitTrigger ?? "manual",
    ...(animation.exitViewport ? { exitViewport: animation.exitViewport } : {}),
  };
  if (animation.entrancePreset.trim().length > 0) {
    base.entrancePreset = animation.entrancePreset;
  }
  if (animation.exitPreset.trim().length > 0) {
    base.exitPreset = animation.exitPreset;
  }

  const ft = animation.fineTune;
  const entranceFt = ft.entrance;
  const exitFt = ft.exit;
  const entranceTransition = toMotionTransition(
    entranceFt.duration,
    entranceFt.delay,
    entranceFt.curve
  );
  const exitTransition = toMotionTransition(exitFt.duration, exitFt.delay, exitFt.curve);

  /** Both sides use named presets only (optional duration overrides on `animation`). */
  if (ft.entranceBehavior === "preset" && ft.exitBehavior === "preset") {
    const pe = animation.presetEntranceDuration;
    const px = animation.presetExitDuration;
    if (pe != null && Number.isFinite(pe) && pe > 0) {
      base.entranceMotion = {
        transition: { type: "tween", duration: pe, delay: 0, ease: "easeOut" },
      };
    }
    if (px != null && Number.isFinite(px) && px > 0) {
      base.exitMotion = {
        transition: { type: "tween", duration: px, delay: 0, ease: "easeOut" },
      };
    }
    return base;
  }

  let entranceMotion: Record<string, unknown> | undefined;
  let exitMotion: Record<string, unknown> | undefined;

  if (ft.entranceBehavior === "preset") {
    const pe = animation.presetEntranceDuration;
    if (pe != null && Number.isFinite(pe) && pe > 0) {
      entranceMotion = {
        transition: { type: "tween", duration: pe, delay: 0, ease: "easeOut" },
      };
    }
  } else if (ft.entranceBehavior === "hybrid") {
    const hybridEntranceDuration = Math.max(0, Number(ft.hybridEntranceDuration || 0.45));
    const composition = ft.hybridCompositionIn ?? "ordered";
    const activeLayers = ft.hybridStackIn.filter((s) => s !== "none");
    const segmentCount = Math.max(0, 1 + activeLayers.length);
    const segmentDurations =
      ft.hybridOrderedUseStepDurations &&
      Array.isArray(ft.hybridOrderedStepDurations) &&
      ft.hybridOrderedStepDurations.length === segmentCount &&
      segmentCount > 0
        ? ft.hybridOrderedStepDurations
        : undefined;
    entranceMotion =
      composition === "layered"
        ? buildLayeredHybridEntranceMotion(
            animation.entrancePreset,
            ft.hybridStackIn,
            hybridEntranceDuration,
            {
              staggerEnabled: ft.hybridLayerStaggerEnabled,
              staggerSec: ft.hybridLayerStaggerSec,
            }
          )
        : buildSequentialHybridEntranceMotion(
            animation.entrancePreset,
            ft.hybridStackIn,
            hybridEntranceDuration,
            segmentDurations
          );
  } else {
    const entranceOffset = toEntranceOffset(entranceFt.direction, entranceFt.distancePx);
    const entranceInitialX = (entranceFt.fromX ?? 0) + (entranceOffset.x ?? 0);
    const entranceInitialY = (entranceFt.fromY ?? 0) + (entranceOffset.y ?? 0);
    entranceMotion = {
      initial: {
        opacity: clampNumber(entranceFt.fromOpacity, 0, 1),
        x: entranceInitialX,
        y: entranceInitialY,
        scale: Number.isFinite(entranceFt.fromScale) ? entranceFt.fromScale : 1,
        rotate: Number.isFinite(entranceFt.fromRotate) ? entranceFt.fromRotate : 0,
      },
      animate: {
        opacity: clampNumber(entranceFt.toOpacity, 0, 1),
        x: entranceFt.toX ?? 0,
        y: entranceFt.toY ?? 0,
        scale: Number.isFinite(entranceFt.toScale) ? entranceFt.toScale : 1,
        rotate: Number.isFinite(entranceFt.toRotate) ? entranceFt.toRotate : 0,
      },
      transition: entranceTransition,
    };
  }

  if (ft.exitBehavior === "preset") {
    const px = animation.presetExitDuration;
    if (px != null && Number.isFinite(px) && px > 0) {
      exitMotion = {
        transition: { type: "tween", duration: px, delay: 0, ease: "easeOut" },
      };
    }
  } else if (ft.exitBehavior === "hybrid") {
    const hybridExitDuration = Math.max(0, Number(ft.hybridExitDuration || 0.45));
    const baseExit = getExitPresetKeyframes(animation.exitPreset);
    const stackExit = mergeHybridExitStackKeyframes(ft.hybridStackOut);
    exitMotion = {
      exit: { ...baseExit.exit, ...stackExit.exit },
      transition: {
        type: "tween" as const,
        duration: hybridExitDuration,
        delay: 0,
        ease: "easeOut" as const,
      },
    };
  } else {
    const exitOffset = toExitOffset(exitFt.direction, exitFt.distancePx);
    const exitTargetX = (exitFt.toX ?? 0) + (exitOffset.x ?? 0);
    const exitTargetY = (exitFt.toY ?? 0) + (exitOffset.y ?? 0);
    exitMotion = {
      exit: {
        opacity: clampNumber(exitFt.toOpacity, 0, 1),
        x: exitTargetX,
        y: exitTargetY,
        scale: Number.isFinite(exitFt.toScale) ? exitFt.toScale : 1,
        rotate: Number.isFinite(exitFt.toRotate) ? exitFt.toRotate : 0,
      },
      transition: exitTransition,
    };
  }

  const out: {
    trigger: PbImageAnimationTrigger;
    exitTrigger: PbImageExitTrigger;
    exitViewport?: PbImageMotionViewport;
    entrancePreset?: PbImageAnimationPreset;
    exitPreset?: PbImageAnimationPreset;
    entranceMotion?: Record<string, unknown>;
    exitMotion?: Record<string, unknown>;
  } = {
    ...base,
    ...(entranceMotion ? { entranceMotion } : {}),
    ...(exitMotion ? { exitMotion } : {}),
  };

  if (ft.entranceBehavior === "custom") delete out.entrancePreset;
  if (ft.exitBehavior === "custom") delete out.exitPreset;

  return out;
}
