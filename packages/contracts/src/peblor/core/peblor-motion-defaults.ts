import motionDefaultsJson from "../../content/framer-motion/motion-defaults.json";
import motionPresetsJson from "../../content/framer-motion/framer-motion-presets.json";
import type { MotionPropsFromJson } from "./peblor-schemas";

type Json = typeof motionDefaultsJson;

interface DragPreset {
  drag?: boolean | "x" | "y";
  dragConstraints?:
    | "parent"
    | { left?: number; right?: number; top?: number; bottom?: number }
    | null;
  dragElastic?: number;
  dragMomentum?: boolean;
  dragTransition?: Record<string, unknown>;
  dragSnapToOrigin?: boolean;
  dragDirectionLock?: boolean;
  dragPropagation?: boolean;
}

interface LayoutPreset {
  layout?: boolean;
  layoutId?: string | null;
  layoutDependency?: string | number | null;
  layoutScroll?: boolean;
  layoutRoot?: boolean;
}

type EntrancePreset = { initial: Record<string, unknown>; animate: Record<string, unknown> };

type ExitPreset = { exit: Record<string, unknown> };

function stripCommentKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripCommentKeys) as T;
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k.startsWith("$")) continue;
    out[k] = stripCommentKeys(v);
  }
  return out as T;
}

const LAYOUT_KEYFRAME_KEYS = new Set([
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "display",
  "flex",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignItems",
  "alignSelf",
  "justifyContent",
  "justifySelf",
  "gap",
  "rowGap",
  "columnGap",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
]);

/**
 * Keys stripped from GESTURE keyframes (whileHover, whileTap, etc.).
 * Narrower than LAYOUT_KEYFRAME_KEYS — deliberately excludes width/height/min/max
 * because Framer Motion CAN animate dimensions in gesture targets, and the
 * ElementRenderer dimension-gesture path handles ownership correctly.
 */
const GESTURE_LAYOUT_STRIP_KEYS = new Set([
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "display",
  "flex",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignItems",
  "alignSelf",
  "justifyContent",
  "justifySelf",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumn",
  "gridRow",
]);

export function stripLayoutKeysFromKeyframes(
  keyframes: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!keyframes || typeof keyframes !== "object" || Array.isArray(keyframes))
    return keyframes ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(keyframes)) {
    if (!LAYOUT_KEYFRAME_KEYS.has(k)) out[k] = v;
  }
  return out;
}

/** Like stripLayoutKeysFromKeyframes but allows width/height so gesture dimension tweens work. */
function stripGestureLayoutKeys(
  keyframes: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!keyframes || typeof keyframes !== "object" || Array.isArray(keyframes))
    return keyframes ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(keyframes)) {
    if (!GESTURE_LAYOUT_STRIP_KEYS.has(k)) out[k] = v;
  }
  return out;
}

const mc = motionDefaultsJson.motionComponent as Json["motionComponent"];
const gestures = motionDefaultsJson.gestures as Json["gestures"];
const layoutJson = motionDefaultsJson.layout as LayoutPreset | undefined;
const mcTransition = mc?.transition as Record<string, unknown> | undefined;
const tweenRaw = mcTransition?.tween as Record<string, unknown> | undefined;
const tween =
  tweenRaw != null
    ? {
        duration: typeof tweenRaw.duration === "number" ? tweenRaw.duration : undefined,
        delay: typeof tweenRaw.delay === "number" ? tweenRaw.delay : undefined,
        ease: typeof tweenRaw.ease === "string" ? tweenRaw.ease : undefined,
        easeCubicBezier: Array.isArray(tweenRaw.easeCubicBezier)
          ? (tweenRaw.easeCubicBezier as number[])
          : undefined,
      }
    : undefined;
const mcAsRecord = mc as Record<string, unknown>;
const inheritDefault: boolean = typeof mcAsRecord.inherit === "boolean" ? mcAsRecord.inherit : true;

const transitionFromJson = {
  type: typeof mcTransition?.type === "string" ? mcTransition.type : "tween",
  duration: tween?.duration ?? 0.3,
  delay: tween?.delay ?? 0,
  ease: tween?.ease ?? "easeOut",
  enterDuration: typeof mcTransition?.enterDuration === "number" ? mcTransition.enterDuration : 0.2,
  exitDuration: typeof mcTransition?.exitDuration === "number" ? mcTransition.exitDuration : 0.15,
  staggerDelay: typeof mcTransition?.staggerDelay === "number" ? mcTransition.staggerDelay : 0.05,
  layout: stripCommentKeys(
    (mcTransition?.layout as Record<string, unknown> | undefined) ?? {}
  ) as Record<string, unknown>,
};

function normalizeViewportAmount(amount: number | "some" | "all" | undefined): number {
  if (amount === "some") return 0.1;
  if (amount === "all") return 1;
  if (typeof amount === "number" && Number.isFinite(amount))
    return Math.max(0, Math.min(1, amount));
  return 0.1;
}

export type MotionViewportDefaults = {
  once: boolean;
  amount: number;
  margin?: string;
  [key: string]: unknown;
};

const entrancePresetsFromFile = motionPresetsJson.entrancePresets as
  | Record<string, EntrancePreset>
  | undefined;
const exitPresetsFromFile = motionPresetsJson.exitPresets as Record<string, ExitPreset> | undefined;

const entrancePresetsBuilt: Record<string, EntrancePreset> = (() => {
  const out: Record<string, EntrancePreset> = {};
  if (entrancePresetsFromFile && typeof entrancePresetsFromFile === "object") {
    for (const key of Object.keys(entrancePresetsFromFile)) {
      const p = entrancePresetsFromFile[key];
      if (p && typeof p === "object" && p.initial && p.animate)
        out[key] = stripCommentKeys(p) as EntrancePreset;
    }
  }
  return out;
})();
const exitPresetsBuilt: Record<string, ExitPreset> = (() => {
  const out: Record<string, ExitPreset> = {};
  if (exitPresetsFromFile && typeof exitPresetsFromFile === "object") {
    for (const key of Object.keys(exitPresetsFromFile)) {
      const p = exitPresetsFromFile[key];
      if (p && typeof p === "object" && p.exit) out[key] = stripCommentKeys(p) as ExitPreset;
    }
  }
  return out;
})();

/** Valid entrance preset names for schema validation. Non-empty for z.enum(). */
export const ENTRANCE_PRESET_NAMES: readonly [string, ...string[]] =
  Object.keys(entrancePresetsBuilt).length > 0
    ? (Object.keys(entrancePresetsBuilt) as [string, ...string[]])
    : (["fade"] as const);

/** Valid exit preset names for schema validation. Non-empty for z.enum(). */
export const EXIT_PRESET_NAMES: readonly [string, ...string[]] =
  Object.keys(exitPresetsBuilt).length > 0
    ? (Object.keys(exitPresetsBuilt) as [string, ...string[]])
    : (["fade"] as const);

/** Valid reveal preset names for schema validation (same source as entrance presets). */
export const REVEAL_PRESET_NAMES: readonly [string, ...string[]] =
  Object.keys(entrancePresetsBuilt).length > 0
    ? (Object.keys(entrancePresetsBuilt) as [string, ...string[]])
    : (["fade"] as const);

export type MotionDefaults = {
  transition: typeof transitionFromJson;
  viewport: MotionViewportDefaults;
  drag: DragPreset;
  layout: LayoutPreset;
  defaultSlideDistancePx: number;
  defaultFeedbackDurationMs: number;
  progressBar: Json["progressBar"];
  easeTuple: [number, number, number, number];

  defaultEntrancePreset: string | undefined;

  defaultExitPreset: string | undefined;

  entrancePresets: Record<string, EntrancePreset>;

  exitPresets: Record<string, ExitPreset>;

  motionComponent: {
    initial: Record<string, unknown>;
    animate: Record<string, unknown>;
    exit: Record<string, unknown>;
    variants: Record<string, unknown>;
    inherit: boolean;
  };

  gestures: {
    whileHover: Record<string, unknown>;
    whileTap: Record<string, unknown>;
    whileFocus: Record<string, unknown>;
    whileDrag: Record<string, unknown>;
    whileInView: Record<string, unknown>;
  };
};

let motionDefaultsCache: MotionDefaults | undefined;

export function getMotionDefaults(): MotionDefaults {
  if (motionDefaultsCache) return motionDefaultsCache;

  motionDefaultsCache = {
    transition: transitionFromJson,
    viewport: (() => {
      const raw = stripCommentKeys(
        gestures?.viewport ?? { once: true, amount: 0.1, margin: "0px" }
      ) as Record<string, unknown>;
      return {
        ...raw,
        amount: normalizeViewportAmount(raw.amount as number | "some" | "all" | undefined),
      } as MotionViewportDefaults;
    })(),
    drag: stripCommentKeys(motionDefaultsJson.drag ?? {}) as DragPreset,
    layout: stripCommentKeys(layoutJson ?? {}) as LayoutPreset,
    defaultSlideDistancePx: motionDefaultsJson.defaultSlideDistancePx ?? 24,
    defaultFeedbackDurationMs: motionDefaultsJson.defaultFeedbackDurationMs ?? 400,
    progressBar: motionDefaultsJson.progressBar ?? {
      height: "4px",
      fill: "rgba(255,255,255,0.4)",
      trackBackground: "rgba(255,255,255,0.1)",
    },
    easeTuple: (tween?.easeCubicBezier ?? [0.25, 0.46, 0.45, 0.94]) as [
      number,
      number,
      number,
      number,
    ],
    entrancePresets: entrancePresetsBuilt,
    exitPresets: exitPresetsBuilt,
    defaultEntrancePreset: (() => {
      const v = (motionDefaultsJson as { defaultEntrancePreset?: string }).defaultEntrancePreset;
      return typeof v === "string" && v.trim() ? v.trim() : Object.keys(entrancePresetsBuilt)[0];
    })(),
    defaultExitPreset: (() => {
      const v = (motionDefaultsJson as { defaultExitPreset?: string }).defaultExitPreset;
      return typeof v === "string" && v.trim() ? v.trim() : Object.keys(exitPresetsBuilt)[0];
    })(),
    motionComponent: {
      initial: stripCommentKeys(mc?.initial ?? { opacity: 0 }) as Record<string, unknown>,
      animate: stripCommentKeys(mc?.animate ?? { opacity: 1 }) as Record<string, unknown>,
      exit: stripCommentKeys(mc?.exit ?? { opacity: 0 }) as Record<string, unknown>,
      variants: stripCommentKeys(mc?.variants ?? {}) as Record<string, unknown>,
      inherit: inheritDefault,
    },
    gestures: {
      whileHover: stripCommentKeys(gestures?.whileHover ?? {}) as Record<string, unknown>,
      whileTap: stripCommentKeys(gestures?.whileTap ?? {}) as Record<string, unknown>,
      whileFocus: stripCommentKeys(gestures?.whileFocus ?? {}) as Record<string, unknown>,
      whileDrag: stripCommentKeys(gestures?.whileDrag ?? {}) as Record<string, unknown>,
      whileInView: stripCommentKeys(gestures?.whileInView ?? {}) as Record<string, unknown>,
    },
  };

  return motionDefaultsCache;
}

export const MOTION_DEFAULTS: MotionDefaults = new Proxy({} as MotionDefaults, {
  get(_target, prop) {
    return getMotionDefaults()[prop as keyof MotionDefaults];
  },
});

function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!overrides || typeof overrides !== "object") return { ...base };
  const out = { ...base };
  for (const key of Object.keys(overrides)) {
    const o = overrides[key];
    const b = out[key];
    if (
      o != null &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      b != null &&
      typeof b === "object" &&
      !Array.isArray(b)
    ) {
      out[key] = deepMerge(b as Record<string, unknown>, o as Record<string, unknown>);
    } else if (o !== undefined) {
      out[key] = o;
    }
  }
  return out;
}

export function mergeMotionDefaults(
  config: MotionPropsFromJson | null | undefined
): MotionPropsFromJson {
  if (!config || typeof config !== "object") {
    return (config ?? {}) as MotionPropsFromJson;
  }
  const d = getMotionDefaults();
  const merged = { ...config } as Record<string, unknown>;

  if (merged.initial === undefined || merged.initial === null)
    merged.initial = { ...d.motionComponent.initial };
  if (merged.animate === undefined || merged.animate === null)
    merged.animate = { ...d.motionComponent.animate };
  if (merged.exit === undefined || merged.exit === null)
    merged.exit = { ...d.motionComponent.exit };
  if (
    Object.keys(d.motionComponent.variants).length > 0 &&
    (merged.variants === undefined || merged.variants === null)
  )
    merged.variants = { ...d.motionComponent.variants };

  if (merged.transition === undefined || merged.transition === null) {
    merged.transition = { ...d.transition } as Record<string, unknown>;
  } else if (typeof merged.transition === "object") {
    merged.transition = deepMerge(
      d.transition as unknown as Record<string, unknown>,
      merged.transition as Record<string, unknown>
    );
  }

  if (merged.viewport === undefined || merged.viewport === null) {
    merged.viewport = { ...d.viewport };
  } else if (typeof merged.viewport === "object") {
    merged.viewport = deepMerge(d.viewport, merged.viewport as Record<string, unknown>);
  }
  if (merged.viewport != null && typeof merged.viewport === "object") {
    (merged.viewport as Record<string, unknown>).amount = normalizeViewportAmount(
      (merged.viewport as Record<string, unknown>).amount as number | "some" | "all" | undefined
    );
  }

  const isEmptyGesture = (o: unknown) =>
    o != null &&
    typeof o === "object" &&
    !Array.isArray(o) &&
    Object.keys(o as object).length === 0;
  if (
    config.whileHover === undefined ||
    config.whileHover === null ||
    isEmptyGesture(config.whileHover)
  )
    merged.whileHover =
      Object.keys(d.gestures.whileHover).length > 0 ? { ...d.gestures.whileHover } : undefined;
  else merged.whileHover = config.whileHover as Record<string, unknown>;
  if (config.whileTap === undefined || config.whileTap === null || isEmptyGesture(config.whileTap))
    merged.whileTap =
      Object.keys(d.gestures.whileTap).length > 0 ? { ...d.gestures.whileTap } : undefined;
  else merged.whileTap = config.whileTap as Record<string, unknown>;
  if (
    config.whileFocus === undefined ||
    config.whileFocus === null ||
    isEmptyGesture(config.whileFocus)
  )
    merged.whileFocus =
      Object.keys(d.gestures.whileFocus).length > 0 ? { ...d.gestures.whileFocus } : undefined;
  else merged.whileFocus = config.whileFocus as Record<string, unknown>;
  if (
    config.whileDrag === undefined ||
    config.whileDrag === null ||
    isEmptyGesture(config.whileDrag)
  )
    merged.whileDrag =
      Object.keys(d.gestures.whileDrag).length > 0 ? { ...d.gestures.whileDrag } : undefined;
  else merged.whileDrag = config.whileDrag as Record<string, unknown>;
  if (merged.whileInView === undefined && Object.keys(d.gestures.whileInView).length > 0)
    merged.whileInView = { ...d.gestures.whileInView };

  const dragPreset = d.drag;
  if (
    merged.drag === undefined &&
    (typeof dragPreset.drag === "boolean" || dragPreset.drag === "x" || dragPreset.drag === "y")
  )
    merged.drag = dragPreset.drag;
  if (
    merged.dragConstraints === undefined &&
    (dragPreset.dragConstraints === "parent" ||
      (dragPreset.dragConstraints != null && typeof dragPreset.dragConstraints === "object"))
  )
    merged.dragConstraints = dragPreset.dragConstraints;
  if (merged.dragElastic === undefined && typeof dragPreset.dragElastic === "number")
    merged.dragElastic = dragPreset.dragElastic;
  if (merged.dragMomentum === undefined && typeof dragPreset.dragMomentum === "boolean")
    merged.dragMomentum = dragPreset.dragMomentum;
  if (
    merged.dragTransition === undefined &&
    dragPreset.dragTransition != null &&
    typeof dragPreset.dragTransition === "object"
  )
    merged.dragTransition = dragPreset.dragTransition;
  if (merged.dragSnapToOrigin === undefined && typeof dragPreset.dragSnapToOrigin === "boolean")
    merged.dragSnapToOrigin = dragPreset.dragSnapToOrigin;
  if (merged.dragDirectionLock === undefined && typeof dragPreset.dragDirectionLock === "boolean")
    merged.dragDirectionLock = dragPreset.dragDirectionLock;
  if (merged.dragPropagation === undefined && typeof dragPreset.dragPropagation === "boolean")
    merged.dragPropagation = dragPreset.dragPropagation;

  const layoutPreset = d.layout;
  if (merged.layout === undefined && typeof layoutPreset.layout === "boolean")
    merged.layout = layoutPreset.layout;
  if (
    merged.layoutId === undefined &&
    (typeof layoutPreset.layoutId === "string" || layoutPreset.layoutId === null)
  )
    merged.layoutId = layoutPreset.layoutId;
  if (
    merged.layoutDependency === undefined &&
    (typeof layoutPreset.layoutDependency === "string" ||
      typeof layoutPreset.layoutDependency === "number" ||
      layoutPreset.layoutDependency === null)
  )
    merged.layoutDependency = layoutPreset.layoutDependency as string | number;
  if (merged.layoutScroll === undefined && typeof layoutPreset.layoutScroll === "boolean")
    merged.layoutScroll = layoutPreset.layoutScroll;
  if (merged.layoutRoot === undefined && typeof layoutPreset.layoutRoot === "boolean")
    merged.layoutRoot = layoutPreset.layoutRoot;

  if (merged.inherit === undefined && typeof d.motionComponent.inherit === "boolean")
    merged.inherit = d.motionComponent.inherit;

  // Resolve inheritMode -> inherit: isolate = false, inherit = true, auto = use default
  const inheritMode = (config as Record<string, unknown>).inheritMode as
    | "auto"
    | "inherit"
    | "isolate"
    | undefined;
  if (inheritMode === "isolate") merged.inherit = false;
  else if (inheritMode === "inherit") merged.inherit = true;
  else if (inheritMode === "auto" || inheritMode === undefined)
    merged.inherit = merged.inherit ?? d.motionComponent.inherit;

  // Strip layout-owned keys from keyframes so motion doesn't fight peblor layout
  if (
    merged.initial != null &&
    typeof merged.initial === "object" &&
    !Array.isArray(merged.initial)
  )
    merged.initial = stripLayoutKeysFromKeyframes(merged.initial as Record<string, unknown>);
  if (
    merged.animate != null &&
    typeof merged.animate === "object" &&
    !Array.isArray(merged.animate)
  )
    merged.animate = stripLayoutKeysFromKeyframes(merged.animate as Record<string, unknown>);
  if (merged.exit != null && typeof merged.exit === "object" && !Array.isArray(merged.exit))
    merged.exit = stripLayoutKeysFromKeyframes(merged.exit as Record<string, unknown>);
  if (merged.variants != null && typeof merged.variants === "object") {
    const variants = merged.variants as Record<
      string,
      {
        initial?: Record<string, unknown>;
        animate?: Record<string, unknown>;
        exit?: Record<string, unknown>;
        [k: string]: unknown;
      }
    >;
    const stripped: Record<string, unknown> = {};
    for (const key of Object.keys(variants)) {
      const v = variants[key];
      if (!v || typeof v !== "object") {
        stripped[key] = v;
        continue;
      }
      stripped[key] = {
        ...v,
        ...(v.initial != null && { initial: stripLayoutKeysFromKeyframes(v.initial) }),
        ...(v.animate != null && { animate: stripLayoutKeysFromKeyframes(v.animate) }),
        ...(v.exit != null && { exit: stripLayoutKeysFromKeyframes(v.exit) }),
      };
    }
    merged.variants = stripped;
  }

  // Strip incompatible layout keys from gesture keyframes.
  // Uses the narrower GESTURE_LAYOUT_STRIP_KEYS so width/height survive — they're
  // valid Framer Motion gesture targets and the ElementRenderer handles them correctly.
  for (const gestureKey of [
    "whileHover",
    "whileTap",
    "whileFocus",
    "whileDrag",
    "whileInView",
  ] as const) {
    const val = merged[gestureKey];
    if (val != null && typeof val === "object" && !Array.isArray(val))
      (merged as Record<string, unknown>)[gestureKey] = stripGestureLayoutKeys(
        val as Record<string, unknown>
      );
  }

  // Don't pass internal/schema-only keys to motion components
  delete (merged as Record<string, unknown>).inheritMode;
  delete (merged as Record<string, unknown>).motionTiming;

  return merged as MotionPropsFromJson;
}

export function getEntranceMotionFromPreset(
  presetName: string,
  options: {
    distancePx: number;
    duration: number;
    delay: number;
    ease: string | [number, number, number, number];
  }
): MotionPropsFromJson {
  const defaults = getMotionDefaults();
  const presets = defaults.entrancePresets;
  const preset =
    presets[presetName] ??
    (defaults.defaultEntrancePreset ? presets[defaults.defaultEntrancePreset] : undefined);
  const mc = defaults.motionComponent;
  const initial = preset
    ? (preset.initial as Record<string, unknown>)
    : (mc.initial as Record<string, unknown>);
  const animate = preset
    ? (preset.animate as Record<string, unknown>)
    : (mc.animate as Record<string, unknown>);
  const d = Math.max(0, options.distancePx);

  const applyDistance = (keyframes: Record<string, unknown>): Record<string, unknown> => {
    const out = { ...keyframes };
    if (typeof out.y === "number" && out.y !== 0) out.y = out.y > 0 ? d : -d;
    if (typeof out.x === "number" && out.x !== 0) out.x = out.x > 0 ? d : -d;
    return out;
  };

  return {
    initial: applyDistance(initial) as Record<string, number>,
    animate: applyDistance(animate) as Record<string, number>,
    transition: {
      type: "tween",
      duration: options.duration,
      delay: options.delay,
      ease: options.ease,
    },
  } as MotionPropsFromJson;
}

export function getExitMotionFromPreset(
  presetName: string,
  options?: { duration?: number; delay?: number; ease?: string | [number, number, number, number] }
): { exit: Record<string, unknown>; transition?: Record<string, unknown> } {
  const defaults = getMotionDefaults();
  const presets = defaults.exitPresets;
  const preset =
    presets[presetName] ??
    (defaults.defaultExitPreset ? presets[defaults.defaultExitPreset] : undefined);
  const mc = defaults.motionComponent;
  const exit = (preset?.exit ?? mc.exit) as Record<string, unknown>;
  const duration =
    options?.duration ?? defaults.transition.exitDuration ?? defaults.transition.duration;
  const delay = options?.delay ?? 0;
  const ease = options?.ease ?? defaults.transition.ease;
  return {
    exit,
    transition: { type: "tween" as const, duration, delay, ease },
  };
}
