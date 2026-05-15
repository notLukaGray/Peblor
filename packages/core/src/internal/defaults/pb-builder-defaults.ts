import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant, ElementImageObjectFit } from "@pb/contracts";
import type { HeadingLevel } from "../element-body-typography";
import type { PbContentGuidelines } from "../defaults/pb-guidelines-expand";

export type PbTypographyBinding =
  | { copyType: "body"; level: ElementBodyVariant }
  | { copyType: "heading"; level: HeadingLevel };

export type PbBuilderFoundations = {
  alignment: "start" | "center" | "end";
  spacingBaseRem: number;
  radiusBaseRem: number;
};

export type PbSectionDefaults = {
  defaultTextAlign: CSSProperties["textAlign"];
};

export type PbModuleFrameDefaults = {
  gapWhenUnset: string | null;
  rowGapWhenUnset: string | null;
  columnGapWhenUnset: string | null;
  alignItemsDefault: NonNullable<CSSProperties["alignItems"]>;
  flexDirectionDefault: NonNullable<CSSProperties["flexDirection"]>;
  justifyContentDefault: string;
  paddingDefault: string;
  flexWrapDefault: NonNullable<CSSProperties["flexWrap"]>;
  borderRadiusDefault: string;
};

export type PbRichTextDefaults = {
  paragraphGap: string;
  codeBorderRadius: string;
  headingH1Margin: string;
  headingH1MarginTop: string | null;
  headingH1MarginBottom: string | null;
  headingH2Margin: string;
  headingH2MarginTop: string | null;
  headingH2MarginBottom: string | null;
  headingH3Margin: string;
  headingH3MarginTop: string | null;
  headingH3MarginBottom: string | null;
  listMarginY: string;
  blockquoteMarginY: string;
  hrMarginY: string;
  preWrapMarginY: string;
};

export type PbButtonVariantKey = "default" | "accent" | "ghost" | "text";

export type PbButtonVariantDefaults = {
  typography: PbTypographyBinding;
  wrapperFill?: string;
  wrapperStroke?: string;
  wrapperPadding?: string;
  wrapperBorderRadius?: string;
};

export type PbButtonDefaults = {
  labelGap: string;
  nakedPadding: string;
  nakedPaddingY: string | null;
  nakedPaddingX: string | null;
  nakedBorderRadius: string;
  defaultVariant: PbButtonVariantKey;
  variants: Record<PbButtonVariantKey, PbButtonVariantDefaults>;
};

export type PbImageDefaults = {
  borderRadius: string;
  defaultVariant: PbImageVariantKey;
  variants: Record<PbImageVariantKey, PbImageVariantDefaults>;
};

export type PbImageVariantKey = "hero" | "inline" | "fullCover" | "feature" | "crop";

export type PbImageAnimationTrigger = "onMount" | "onFirstVisible" | "onEveryVisible" | "onTrigger";

/** Exit presence semantics for `motionTiming` / ElementExitWrapper. */
export type PbImageExitTrigger = "manual" | "leaveViewport";

/** Intersection options (mirrors motion `viewport` / `exitViewport` schema). */
export type PbImageMotionViewport = {
  once?: boolean;
  amount?: number | "some" | "all";
  margin?: string;
};

export type PbImageAnimationPreset = string;

export type PbImageAnimationDirection = "none" | "up" | "down" | "left" | "right";
export type PbImageHybridStackPreset = "none" | "zoomIn" | "zoomOut" | "tiltIn";

export type PbImageAnimationCurvePreset =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "customBezier";

export type PbImageAnimationCurve = {
  preset: PbImageAnimationCurvePreset;
  customBezier: [number, number, number, number];
};

export type PbImageEntranceFineTune = {
  direction: PbImageAnimationDirection;
  distancePx: number;
  fromOpacity: number;
  toOpacity: number;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  fromScale: number;
  toScale: number;
  fromRotate: number;
  toRotate: number;
  duration: number;
  delay: number;
  curve: PbImageAnimationCurve;
};

export type PbImageExitFineTune = {
  direction: PbImageAnimationDirection;
  distancePx: number;
  toOpacity: number;
  toX: number;
  toY: number;
  toScale: number;
  toRotate: number;
  duration: number;
  delay: number;
  curve: PbImageAnimationCurve;
};

/** Independent animation mode per side (UI labels: Preset / Hybrid / Complex). */
export type PbImageSideAnimationBehavior = "preset" | "hybrid" | "custom";

export type PbImageAnimationFineTune = {
  entranceBehavior: PbImageSideAnimationBehavior;
  exitBehavior: PbImageSideAnimationBehavior;
  /** Hybrid entrance: parallel vs sequential keyframes. */
  hybridCompositionIn: "ordered" | "layered";
  /** Layered hybrid only: stagger each stack layer by this delay (seconds) when enabled. */
  hybridLayerStaggerEnabled: boolean;
  hybridLayerStaggerSec: number;
  /** Ordered hybrid entrance: per-step weights vs equal splits. */
  hybridOrderedUseStepDurations: boolean;
  hybridOrderedStepDurations: number[];
  /** Ordered stack layers merged shallowly on top of base entrance preset (first → last wins on conflicts). */
  hybridStackIn: PbImageHybridStackPreset[];
  /** Ordered stack layers merged on top of base exit preset. */
  hybridStackOut: PbImageHybridStackPreset[];
  /** Hybrid / ordered entrance total duration (seconds); independent from exit. */
  hybridEntranceDuration: number;
  /** Hybrid exit total duration (seconds). */
  hybridExitDuration: number;
  entrance: PbImageEntranceFineTune;
  exit: PbImageExitFineTune;
};

export type PbImageAnimationDefaults = {
  trigger: PbImageAnimationTrigger;
  /** When / how exit runs in ElementExitWrapper (mirrors `motionTiming.exitTrigger`). */
  exitTrigger: PbImageExitTrigger;
  exitViewport?: PbImageMotionViewport;
  entrancePreset: PbImageAnimationPreset;
  exitPreset: PbImageAnimationPreset;
  /** Optional tween duration overrides for preset-based entrance/exit resolution (seconds). */
  presetEntranceDuration?: number;
  presetExitDuration?: number;
  fineTune: PbImageAnimationFineTune;
};

export type PbImageLayoutMode = "aspectRatio" | "fill" | "constraints";

export type PbResponsiveValue<T> = T | [T, T];
export type PbImageConstraintValues = {
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
};
export type PbResponsiveImageConstraints = PbResponsiveValue<PbImageConstraintValues | undefined>;

export type PbImageVariantDefaults = {
  layoutMode: PbImageLayoutMode;
  objectFit: PbResponsiveValue<ElementImageObjectFit>;
  aspectRatio?: PbResponsiveValue<string>;
  width?: PbResponsiveValue<string>;
  height?: PbResponsiveValue<string>;
  constraints?: PbResponsiveImageConstraints;
  borderRadius: PbResponsiveValue<string>;
  objectPosition?: string;
  /** Pan/zoom inside a fixed frame when `objectFit` is `crop`. x/y are % translate; scale ≥ 1 zooms in from cover baseline. focalX/focalY are 0–1 metadata only (no CSS). */
  imageCrop?: { x: number; y: number; scale: number; focalX?: number; focalY?: number };
  align?: PbResponsiveValue<"left" | "center" | "right">;
  alignY?: PbResponsiveValue<"top" | "center" | "bottom">;
  marginTop?: PbResponsiveValue<string>;
  marginBottom?: PbResponsiveValue<string>;
  marginLeft?: PbResponsiveValue<string>;
  marginRight?: PbResponsiveValue<string>;
  /** Stacking order on the layout wrapper (`elementLayoutSchema.zIndex`). */
  zIndex?: number;
  rotate?: number | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  opacity?: number;
  blendMode?: string;
  boxShadow?: string;
  filter?: string;
  backdropFilter?: string;
  overflow?: "hidden" | "visible" | "auto" | "scroll";
  hidden?: boolean;
  priority?: boolean;
  animation: PbImageAnimationDefaults;
};

export type PbInputVariantKey = "default" | "compact" | "minimal";

export type PbInputVariantDefaults = {
  showIcon?: boolean;
  color?: string;
  height?: string;
};

export type PbInputDefaults = {
  defaultVariant: PbInputVariantKey;
  variants: Record<PbInputVariantKey, PbInputVariantDefaults>;
};

export type PbRangeVariantKey = "default" | "slim" | "accent";

export type PbRangeVariantDefaults = {
  style: {
    trackColor: string;
    fillColor: string;
    trackHeight: string;
    thumbSize: string;
    borderRadius: string;
  };
};

export type PbRangeDefaults = {
  defaultVariant: PbRangeVariantKey;
  variants: Record<PbRangeVariantKey, PbRangeVariantDefaults>;
};

export type PbSpacerVariantKey = "sm" | "md" | "lg";

export type PbSpacerVariantDefaults = {
  height: string;
};

export type PbSpacerDefaults = {
  defaultVariant: PbSpacerVariantKey;
  variants: Record<PbSpacerVariantKey, PbSpacerVariantDefaults>;
};

export type PbWorkbenchElementDefaultSet<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  v?: number;
  defaultVariant: string;
  variants: Record<string, T>;
};

export type PbWorkbenchElementDefaults = {
  richText: PbWorkbenchElementDefaultSet;
  videoTime: PbWorkbenchElementDefaultSet;
  vector: PbWorkbenchElementDefaultSet;
  svg: PbWorkbenchElementDefaultSet;
  model3d: PbWorkbenchElementDefaultSet;
  rive: PbWorkbenchElementDefaultSet;
  scrollProgressBar: PbWorkbenchElementDefaultSet;
};

export type PbVideoVariantKey = "inline" | "compact" | "fullcover" | "hero";

export type PbVideoVariantDefaults = {
  objectFit: "cover" | "contain" | "fillWidth" | "fillHeight";
  aspectRatio?: string;
  module?: string;
  showPlayButton?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
};

export type PbVideoDefaults = {
  defaultVariant: PbVideoVariantKey;
  variants: Record<PbVideoVariantKey, PbVideoVariantDefaults>;
};

export type PbHeadingVariantKey = "display" | "section" | "label";

export type PbBodyVariantKey = "lead" | "standard" | "fine";

export type PbLinkVariantKey = "inline" | "emphasis" | "nav";

export type PbHeadingVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementHeading" }>,
  "type"
>;

export type PbBodyVariantDefaults = Omit<Extract<ElementBlock, { type: "elementBody" }>, "type">;

export type PbLinkVariantDefaults = Omit<Extract<ElementBlock, { type: "elementLink" }>, "type">;

export type PbHeadingDefaults = {
  defaultVariant: PbHeadingVariantKey;
  variants: Record<PbHeadingVariantKey, PbHeadingVariantDefaults>;
};

export type PbBodyDefaults = {
  defaultVariant: PbBodyVariantKey;
  variants: Record<PbBodyVariantKey, PbBodyVariantDefaults>;
};

export type PbLinkDefaults = {
  defaultVariant: PbLinkVariantKey;
  variants: Record<PbLinkVariantKey, PbLinkVariantDefaults>;
};

export type PbElementDefaults = {
  richText: PbRichTextDefaults;
  button: PbButtonDefaults;
  image: PbImageDefaults;
  video: PbVideoDefaults;
  input: PbInputDefaults;
  range: PbRangeDefaults;
  spacer: PbSpacerDefaults;
  heading: PbHeadingDefaults;
  body: PbBodyDefaults;
  link: PbLinkDefaults;
};

export type PbBuilderDefaults = {
  version: 1;
  foundations: PbBuilderFoundations;
  sections: PbSectionDefaults;
  modules: {
    frame: PbModuleFrameDefaults;
  };
  elements: PbElementDefaults;
  workbenchElements?: PbWorkbenchElementDefaults;
};

const MIN_SPACING_REM = 0.125;
const MIN_RADIUS_REM = 0.25;

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

function createImageAnimationFineTune(
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

function rem(n: number): string {
  return `${n}rem`;
}

function normalizeSpacingBaseRem(n: number): number {
  return Number.isFinite(n) ? Math.max(MIN_SPACING_REM, n) : MIN_SPACING_REM;
}

function normalizeRadiusBaseRem(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function toTextAlign(
  alignment: PbBuilderFoundations["alignment"]
): NonNullable<CSSProperties["textAlign"]> {
  if (alignment === "center") return "center";
  if (alignment === "end") return "right";
  return "start";
}

function toFlexAlignItems(
  alignment: PbBuilderFoundations["alignment"]
): NonNullable<CSSProperties["alignItems"]> {
  if (alignment === "center") return "center";
  if (alignment === "end") return "flex-end";
  return "flex-start";
}

function toFlexJustifyContent(alignment: PbBuilderFoundations["alignment"]): string {
  if (alignment === "center") return "center";
  if (alignment === "end") return "flex-end";
  return "flex-start";
}

export const DEFAULT_PB_BUILDER_FOUNDATIONS: PbBuilderFoundations = {
  alignment: "center",
  spacingBaseRem: 0.5,
  radiusBaseRem: 0.375,
};

/**
 * Foundations-first generator for grouped peblor defaults.
 * Colors/fonts remain managed in their own tools; this controls spacing/alignment/radius defaults.
 */
export function createPbBuilderDefaultsFromFoundations(
  foundations: PbBuilderFoundations
): PbBuilderDefaults {
  const spacingBaseRem = normalizeSpacingBaseRem(foundations.spacingBaseRem);
  const radiusBaseRem = normalizeRadiusBaseRem(foundations.radiusBaseRem);
  const textAlign = toTextAlign(foundations.alignment);
  const alignItems = toFlexAlignItems(foundations.alignment);
  const justifyContent = toFlexJustifyContent(foundations.alignment);
  const radiusCss = rem(Math.max(MIN_RADIUS_REM, radiusBaseRem));

  return {
    version: 1,
    foundations: {
      alignment: foundations.alignment,
      spacingBaseRem,
      radiusBaseRem,
    },
    sections: {
      defaultTextAlign: textAlign,
    },
    modules: {
      frame: {
        gapWhenUnset: rem(spacingBaseRem * 2),
        rowGapWhenUnset: null,
        columnGapWhenUnset: null,
        alignItemsDefault: alignItems,
        flexDirectionDefault: "row",
        justifyContentDefault: justifyContent,
        paddingDefault: "0",
        flexWrapDefault: "nowrap",
        borderRadiusDefault: radiusCss,
      },
    },
    elements: {
      richText: {
        paragraphGap: rem(spacingBaseRem),
        codeBorderRadius: rem(Math.max(MIN_RADIUS_REM, spacingBaseRem)),
        headingH1Margin: `${rem(spacingBaseRem * 2)} ${rem(spacingBaseRem * 0.5)}`,
        headingH1MarginTop: null,
        headingH1MarginBottom: null,
        headingH2Margin: `${rem(spacingBaseRem * 1.5)} ${rem(spacingBaseRem * 0.5)}`,
        headingH2MarginTop: null,
        headingH2MarginBottom: null,
        headingH3Margin: `${rem(spacingBaseRem * 1)} ${rem(spacingBaseRem * 0.5)}`,
        headingH3MarginTop: null,
        headingH3MarginBottom: null,
        listMarginY: rem(spacingBaseRem),
        blockquoteMarginY: rem(spacingBaseRem),
        hrMarginY: rem(spacingBaseRem * 1.5),
        preWrapMarginY: rem(spacingBaseRem * 1.5),
      },
      button: {
        labelGap: rem(spacingBaseRem),
        nakedPadding: `${rem(spacingBaseRem)} ${rem(spacingBaseRem * 2.5)}`,
        nakedPaddingY: null,
        nakedPaddingX: null,
        nakedBorderRadius: radiusCss,
        defaultVariant: "default",
        variants: {
          default: {
            typography: { copyType: "body", level: 4 },
          },
          accent: {
            typography: { copyType: "body", level: 3 },
            wrapperFill: "var(--pb-accent)",
            wrapperBorderRadius: radiusCss,
          },
          ghost: {
            typography: { copyType: "body", level: 5 },
            wrapperStroke: "var(--pb-border)",
            wrapperBorderRadius: radiusCss,
          },
          /** Naked text link — no wrapper styling, just typography binding. */
          text: {
            typography: { copyType: "body", level: 5 },
          },
        },
      },
      image: {
        borderRadius: radiusCss,
        defaultVariant: "hero",
        variants: {
          hero: {
            layoutMode: "aspectRatio",
            objectFit: "cover",
            aspectRatio: "16 / 9",
            borderRadius: radiusCss,
            objectPosition: "center",
            align: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            overflow: "hidden",
            hidden: false,
            priority: true,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "slideUp",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("up", "up"),
            },
          },
          inline: {
            layoutMode: "aspectRatio",
            objectFit: "contain",
            aspectRatio: "4 / 3",
            borderRadius: radiusCss,
            objectPosition: "center",
            align: "left",
            alignY: "top",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            overflow: "visible",
            hidden: false,
            priority: false,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "fade",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("none", "none"),
            },
          },
          fullCover: {
            layoutMode: "fill",
            objectFit: "cover",
            width: "100%",
            height: "100%",
            borderRadius: "0",
            objectPosition: "center",
            align: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            overflow: "hidden",
            hidden: false,
            priority: true,
            animation: {
              trigger: "onMount",
              exitTrigger: "manual",
              entrancePreset: "fade",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("none", "none"),
            },
          },
          feature: {
            layoutMode: "aspectRatio",
            objectFit: "cover",
            aspectRatio: "3 / 4",
            borderRadius: radiusCss,
            objectPosition: "center top",
            align: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            overflow: "hidden",
            hidden: false,
            priority: false,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "slideLeft",
              exitPreset: "slideRight",
              fineTune: createImageAnimationFineTune("left", "right"),
            },
          },
          crop: {
            layoutMode: "aspectRatio",
            objectFit: "crop",
            aspectRatio: "16 / 9",
            borderRadius: radiusCss,
            objectPosition: "center",
            imageCrop: { x: 0, y: 0, scale: 1 },
            align: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            overflow: "hidden",
            hidden: false,
            priority: false,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "fade",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("none", "none"),
            },
          },
        },
      },
      video: {
        defaultVariant: "inline",
        variants: {
          inline: {
            objectFit: "cover",
            aspectRatio: "16 / 9",
            showPlayButton: true,
          },
          compact: {
            objectFit: "cover",
            aspectRatio: "4 / 3",
            module: "video-player-compact",
            showPlayButton: true,
          },
          fullcover: {
            objectFit: "cover",
            module: "video-player-full",
            showPlayButton: false,
          },
          hero: {
            objectFit: "cover",
            aspectRatio: "21 / 9",
            module: "video-player",
            showPlayButton: true,
            autoplay: true,
            loop: true,
            muted: true,
          },
        },
      },
      input: {
        defaultVariant: "default",
        variants: {
          default: {
            showIcon: true,
            color: "rgba(255,255,255,0.85)",
          },
          compact: {
            showIcon: false,
            color: "rgba(255,255,255,0.7)",
            height: "2.25rem",
          },
          minimal: {
            showIcon: false,
            color: "rgba(255,255,255,0.5)",
          },
        },
      },
      range: {
        defaultVariant: "default",
        variants: {
          default: {
            style: {
              trackColor: "rgba(255,255,255,0.2)",
              fillColor: "rgba(255,255,255,0.9)",
              trackHeight: "4px",
              thumbSize: "14px",
              borderRadius: "9999px",
            },
          },
          slim: {
            style: {
              trackColor: "rgba(255,255,255,0.1)",
              fillColor: "rgba(255,255,255,0.7)",
              trackHeight: "2px",
              thumbSize: "10px",
              borderRadius: "9999px",
            },
          },
          accent: {
            style: {
              trackColor: "rgba(255,255,255,0.15)",
              fillColor: "#a78bfa",
              trackHeight: "4px",
              thumbSize: "16px",
              borderRadius: "9999px",
            },
          },
        },
      },
      spacer: {
        defaultVariant: "md",
        variants: {
          sm: { height: "1rem" },
          md: { height: "2rem" },
          lg: { height: "4rem" },
        },
      },
      heading: {
        defaultVariant: "display",
        variants: {
          display: {
            variant: "display",
            level: 1,
            text: "Display heading",
            wordWrap: true,
            align: "left",
            alignY: "center",
          },
          section: {
            variant: "section",
            level: 2,
            text: "Section heading",
            wordWrap: true,
            align: "left",
            alignY: "top",
          },
          label: {
            variant: "label",
            level: 5,
            text: "Eyebrow label",
            wordWrap: true,
            align: "left",
            alignY: "center",
          },
        },
      },
      body: {
        defaultVariant: "standard",
        variants: {
          lead: {
            variant: "lead",
            text: "Lead paragraph for introductions and hero copy that should read larger than body text.",
            level: 2,
            wordWrap: true,
            align: "left",
            alignY: "top",
          },
          standard: {
            variant: "standard",
            text: "Standard body copy for descriptions, lists, and long-form content in layouts.",
            level: 4,
            wordWrap: true,
            align: "left",
            alignY: "top",
          },
          fine: {
            variant: "fine",
            text: "Fine print, captions, and tertiary supporting text.",
            level: 6,
            wordWrap: true,
            align: "left",
            alignY: "top",
          },
        },
      },
      link: {
        defaultVariant: "inline",
        variants: {
          inline: {
            variant: "inline",
            label: "Inline link",
            href: "/",
            external: false,
            copyType: "body",
            level: 4,
            wordWrap: true,
            align: "left",
            alignY: "center",
          },
          emphasis: {
            variant: "emphasis",
            label: "Emphasized link",
            href: "/work",
            external: false,
            copyType: "heading",
            level: 3,
            wordWrap: true,
            align: "left",
            alignY: "center",
          },
          nav: {
            variant: "nav",
            label: "Navigation link",
            href: "/about",
            external: false,
            copyType: "body",
            level: 4,
            wordWrap: true,
            align: "center",
            alignY: "center",
          },
        },
      },
    },
  };
}

/**
 * Future-facing grouped defaults model.
 * This is intentionally organized by peblor domains instead of a flat token list.
 */
let pbBuilderDefaultsV1Cache: PbBuilderDefaults | null = null;

export function getPbBuilderDefaultsV1(): PbBuilderDefaults {
  if (pbBuilderDefaultsV1Cache) return pbBuilderDefaultsV1Cache;
  pbBuilderDefaultsV1Cache = createPbBuilderDefaultsFromFoundations(DEFAULT_PB_BUILDER_FOUNDATIONS);
  return pbBuilderDefaultsV1Cache;
}

/**
 * Compatibility adapter while runtime still consumes the flat content-guidelines shape.
 */
export function toPbContentGuidelines(defaults: PbBuilderDefaults): PbContentGuidelines {
  const frame = defaults.modules.frame;
  const rich = defaults.elements.richText;
  const btn = defaults.elements.button;
  return {
    copyTextAlign: defaults.sections.defaultTextAlign,
    frameGapWhenUnset: frame.gapWhenUnset,
    frameRowGapWhenUnset: frame.rowGapWhenUnset,
    frameColumnGapWhenUnset: frame.columnGapWhenUnset,
    frameAlignItemsDefault: frame.alignItemsDefault,
    frameFlexDirectionDefault: frame.flexDirectionDefault,
    frameJustifyContentDefault: frame.justifyContentDefault,
    framePaddingDefault: frame.paddingDefault,
    frameFlexWrapDefault: frame.flexWrapDefault,
    frameBorderRadiusDefault: frame.borderRadiusDefault,
    richTextParagraphGap: rich.paragraphGap,
    richTextCodeBorderRadius: rich.codeBorderRadius,
    richTextHeadingH1Margin: rich.headingH1Margin,
    richTextHeadingH1MarginTop: rich.headingH1MarginTop,
    richTextHeadingH1MarginBottom: rich.headingH1MarginBottom,
    richTextHeadingH2Margin: rich.headingH2Margin,
    richTextHeadingH2MarginTop: rich.headingH2MarginTop,
    richTextHeadingH2MarginBottom: rich.headingH2MarginBottom,
    richTextHeadingH3Margin: rich.headingH3Margin,
    richTextHeadingH3MarginTop: rich.headingH3MarginTop,
    richTextHeadingH3MarginBottom: rich.headingH3MarginBottom,
    richTextListMarginY: rich.listMarginY,
    richTextBlockquoteMarginY: rich.blockquoteMarginY,
    richTextHrMarginY: rich.hrMarginY,
    richTextPreWrapMarginY: rich.preWrapMarginY,
    buttonLabelGap: btn.labelGap,
    buttonNakedPadding: btn.nakedPadding,
    buttonNakedPaddingY: btn.nakedPaddingY,
    buttonNakedPaddingX: btn.nakedPaddingX,
    buttonNakedBorderRadius: btn.nakedBorderRadius,
  };
}

/**
 * Shared-radius helper for linked defaults across elements/modules.
 * Example: raising button radius can also raise image/module frame radius in one edit.
 */
export function withUnifiedRadius(
  defaults: PbBuilderDefaults,
  radiusCss: string
): PbBuilderDefaults {
  return {
    ...defaults,
    modules: {
      ...defaults.modules,
      frame: {
        ...defaults.modules.frame,
        borderRadiusDefault: radiusCss,
      },
    },
    elements: {
      ...defaults.elements,
      button: {
        ...defaults.elements.button,
        nakedBorderRadius: radiusCss,
      },
      image: {
        ...defaults.elements.image,
        borderRadius: radiusCss,
        variants: {
          ...defaults.elements.image.variants,
          hero: {
            ...defaults.elements.image.variants.hero,
            borderRadius: radiusCss,
          },
          inline: {
            ...defaults.elements.image.variants.inline,
            borderRadius: radiusCss,
          },
          feature: {
            ...defaults.elements.image.variants.feature,
            borderRadius: radiusCss,
          },
          crop: {
            ...defaults.elements.image.variants.crop,
            borderRadius: radiusCss,
          },
        },
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
