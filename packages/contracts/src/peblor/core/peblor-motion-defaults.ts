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

function stripKeysFromKeyframes(
  keyframes: Record<string, unknown> | null | undefined,
  keys: ReadonlySet<string>
): Record<string, unknown> {
  if (!keyframes || typeof keyframes !== "object" || Array.isArray(keyframes))
    return keyframes ?? {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(keyframes)) {
    if (!keys.has(k)) out[k] = v;
  }
  return out;
}

export function stripLayoutKeysFromKeyframes(
  keyframes: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return stripKeysFromKeyframes(keyframes, LAYOUT_KEYFRAME_KEYS);
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

/** Valid entrance preset names for schema validation. Fails loudly if preset JSON is empty (C-10). */
export const ENTRANCE_PRESET_NAMES: readonly [string, ...string[]] = (() => {
  const keys = Object.keys(entrancePresetsBuilt);
  if (keys.length === 0) {
    throw new Error(
      "ENTRANCE_PRESET_NAMES: No entrance presets found in framer-motion-presets.json. " +
        "Ensure the JSON file contains at least one valid entrance preset entry."
    );
  }
  return keys as [string, ...string[]];
})();

/** Valid exit preset names for schema validation. Fails loudly if preset JSON is empty (C-10). */
export const EXIT_PRESET_NAMES: readonly [string, ...string[]] = (() => {
  const keys = Object.keys(exitPresetsBuilt);
  if (keys.length === 0) {
    throw new Error(
      "EXIT_PRESET_NAMES: No exit presets found in framer-motion-presets.json. " +
        "Ensure the JSON file contains at least one valid exit preset entry."
    );
  }
  return keys as [string, ...string[]];
})();

/** Valid reveal preset names for schema validation (same source as entrance presets). */
export const REVEAL_PRESET_NAMES: readonly [string, ...string[]] = ENTRANCE_PRESET_NAMES;

export type MotionDefaults = {
  transition: typeof transitionFromJson;
  viewport: MotionViewportDefaults;
  drag: DragPreset;
  layout: LayoutPreset;
  defaultSlideDistancePx: number;
  defaultFeedbackDurationMs: number;
  progressBar: Json["progressBar"];
  easeTuple: [number, number, number, number];

  /** Tooltip enter/exit animation durations and show delay. */
  tooltipEnterDurationSec: number;
  tooltipExitDurationSec: number;
  tooltipShowDelayMs: number;

  /** Default snap animation duration for infinite-scroll elements (ms). */
  snapDurationMs: number;

  /** Lerp factor for background-layer pointer tracking (0–1, lower = smoother). */
  bgLayerPointerLerpFactor: number;
  /** Default duration for background-layer trigger animations (seconds). */
  bgLayerTriggerDurationSec: number;

  /** Default entrance animation duration for staggered element groups (seconds). */
  groupEntranceDurationSec: number;

  /** Lerp factor for scroll-container trigger scrolling (0–1, lower = smoother). */
  scrollContainerLerpFactor: number;

  /** Lerp factor for button pointer-tracking gradient (0–1, lower = smoother). */
  buttonPointerLerpFactor: number;

  /**
   * Smooth-scroll lerp formula constants.
   * The effective lerp factor is: `smoothScrollBaseFactor - smoothness * smoothScrollRangeFactor`
   * where `smoothness` is a 0–1 user preference (default 0.5).
   * At smoothness=0  → factor = 0.25 (fast)
   * At smoothness=1  → factor = 0.05 (slow)
   */
  smoothScrollBaseFactor: number;
  smoothScrollRangeFactor: number;

  /** Default duration for reveal-section item animations (ms). */
  revealItemDurationMs: number;

  /** Default duration for drag snap-back animations (ms). */
  snapBackDurationMs: number;

  defaultEntrancePreset: string | undefined;

  defaultExitPreset: string | undefined;

  entrancePresets: Record<string, EntrancePreset>;

  exitPresets: Record<string, ExitPreset>;

  motionComponent: {
    from: Record<string, unknown>;
    to: Record<string, unknown>;
    leave: Record<string, unknown>;
    states: Record<string, unknown>;
    inherit: boolean;
  };

  gestures: {
    onHover: Record<string, unknown>;
    onPress: Record<string, unknown>;
    onFocus: Record<string, unknown>;
    onDrag: Record<string, unknown>;
    onVisible: Record<string, unknown>;
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
    tooltipEnterDurationSec: motionDefaultsJson.tooltipEnterDurationSec ?? 0.35,
    tooltipExitDurationSec: motionDefaultsJson.tooltipExitDurationSec ?? 0.2,
    tooltipShowDelayMs: motionDefaultsJson.tooltipShowDelayMs ?? 200,
    snapDurationMs: motionDefaultsJson.snapDurationMs ?? 420,
    bgLayerPointerLerpFactor: motionDefaultsJson.bgLayerPointerLerpFactor ?? 0.08,
    bgLayerTriggerDurationSec: motionDefaultsJson.bgLayerTriggerDurationSec ?? 0.8,
    groupEntranceDurationSec: motionDefaultsJson.groupEntranceDurationSec ?? 0.8,
    scrollContainerLerpFactor: motionDefaultsJson.scrollContainerLerpFactor ?? 0.06,
    buttonPointerLerpFactor: motionDefaultsJson.buttonPointerLerpFactor ?? 0.08,
    smoothScrollBaseFactor: motionDefaultsJson.smoothScrollBaseFactor ?? 0.25,
    smoothScrollRangeFactor: motionDefaultsJson.smoothScrollRangeFactor ?? 0.2,
    revealItemDurationMs: motionDefaultsJson.revealItemDurationMs ?? 300,
    snapBackDurationMs: motionDefaultsJson.snapBackDurationMs ?? 300,
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
      from: stripCommentKeys(mc?.initial ?? { opacity: 0 }) as Record<string, unknown>,
      to: stripCommentKeys(mc?.animate ?? { opacity: 1 }) as Record<string, unknown>,
      leave: stripCommentKeys(mc?.exit ?? { opacity: 0 }) as Record<string, unknown>,
      states: stripCommentKeys(mc?.variants ?? {}) as Record<string, unknown>,
      inherit: inheritDefault,
    },
    gestures: {
      onHover: stripCommentKeys(gestures?.whileHover ?? {}) as Record<string, unknown>,
      onPress: stripCommentKeys(gestures?.whileTap ?? {}) as Record<string, unknown>,
      onFocus: stripCommentKeys(gestures?.whileFocus ?? {}) as Record<string, unknown>,
      onDrag: stripCommentKeys(gestures?.whileDrag ?? {}) as Record<string, unknown>,
      onVisible: stripCommentKeys(gestures?.whileInView ?? {}) as Record<string, unknown>,
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

/**
 * If `target[key]` is undefined or null, set it to `defaultValue` (if provided).
 * Otherwise no-op.
 */
function mergeIfMissing<T>(target: Record<string, T>, key: string, defaultValue?: T): void {
  const val = target[key];
  if ((val === undefined || val === null) && defaultValue !== undefined) {
    target[key] = defaultValue;
  }
}

/**
 * Merge a gesture block (whileHover, whileTap, whileFocus, whileDrag).
 * If the raw value is undefined, null, or an empty object, assign the default
 * gesture (or undefined if the default is empty). Otherwise keep the spread value.
 */
function mergeGestureConfig(
  merged: Record<string, unknown>,
  key: string,
  rawValue: unknown,
  defaultGestures: Record<string, unknown>
): void {
  const isEmptyGesture = (o: unknown) =>
    o != null &&
    typeof o === "object" &&
    !Array.isArray(o) &&
    Object.keys(o as object).length === 0;
  if (rawValue === undefined || rawValue === null || isEmptyGesture(rawValue)) {
    merged[key] = Object.keys(defaultGestures).length > 0 ? { ...defaultGestures } : undefined;
  }
  // else: merged[key] is already set from the { ...config } spread
}

export function mergeMotionDefaults(
  config: MotionPropsFromJson | null | undefined
): MotionPropsFromJson {
  if (!config || typeof config !== "object") {
    return (config ?? {}) as MotionPropsFromJson;
  }
  const d = getMotionDefaults();
  const merged = { ...config } as Record<string, unknown>;

  if (merged.from === undefined || merged.from === null)
    merged.from = { ...d.motionComponent.from };
  if (merged.to === undefined || merged.to === null) merged.to = { ...d.motionComponent.to };
  if (merged.leave === undefined || merged.leave === null)
    merged.leave = { ...d.motionComponent.leave };
  if (
    Object.keys(d.motionComponent.states).length > 0 &&
    (merged.states === undefined || merged.states === null)
  )
    merged.states = { ...d.motionComponent.states };

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

  mergeGestureConfig(merged, "onHover", config.onHover, d.gestures.onHover);
  mergeGestureConfig(merged, "onPress", config.onPress, d.gestures.onPress);
  mergeGestureConfig(merged, "onFocus", config.onFocus, d.gestures.onFocus);
  mergeGestureConfig(merged, "onDrag", config.onDrag, d.gestures.onDrag);
  if (merged.onVisible === undefined && Object.keys(d.gestures.onVisible).length > 0)
    merged.onVisible = { ...d.gestures.onVisible };

  const dragPreset = d.drag;
  mergeIfMissing(
    merged,
    "drag",
    typeof dragPreset.drag === "boolean" || dragPreset.drag === "x" || dragPreset.drag === "y"
      ? dragPreset.drag
      : undefined
  );
  mergeIfMissing(
    merged,
    "dragConstraints",
    dragPreset.dragConstraints === "parent" ||
      (dragPreset.dragConstraints != null && typeof dragPreset.dragConstraints === "object")
      ? dragPreset.dragConstraints
      : undefined
  );
  mergeIfMissing(
    merged,
    "dragElastic",
    typeof dragPreset.dragElastic === "number" ? dragPreset.dragElastic : undefined
  );
  mergeIfMissing(
    merged,
    "dragMomentum",
    typeof dragPreset.dragMomentum === "boolean" ? dragPreset.dragMomentum : undefined
  );
  mergeIfMissing(
    merged,
    "dragTransition",
    dragPreset.dragTransition != null && typeof dragPreset.dragTransition === "object"
      ? dragPreset.dragTransition
      : undefined
  );
  mergeIfMissing(
    merged,
    "dragSnapToOrigin",
    typeof dragPreset.dragSnapToOrigin === "boolean" ? dragPreset.dragSnapToOrigin : undefined
  );
  mergeIfMissing(
    merged,
    "dragDirectionLock",
    typeof dragPreset.dragDirectionLock === "boolean" ? dragPreset.dragDirectionLock : undefined
  );
  mergeIfMissing(
    merged,
    "dragPropagation",
    typeof dragPreset.dragPropagation === "boolean" ? dragPreset.dragPropagation : undefined
  );

  mergeIfMissing(
    merged,
    "inherit",
    typeof d.motionComponent.inherit === "boolean" ? d.motionComponent.inherit : undefined
  );

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
  if (merged.from != null && typeof merged.from === "object" && !Array.isArray(merged.from))
    merged.from = stripLayoutKeysFromKeyframes(merged.from as Record<string, unknown>);
  if (merged.to != null && typeof merged.to === "object" && !Array.isArray(merged.to))
    merged.to = stripLayoutKeysFromKeyframes(merged.to as Record<string, unknown>);
  if (merged.leave != null && typeof merged.leave === "object" && !Array.isArray(merged.leave))
    merged.leave = stripLayoutKeysFromKeyframes(merged.leave as Record<string, unknown>);
  if (merged.states != null && typeof merged.states === "object") {
    const states = merged.states as Record<
      string,
      {
        from?: Record<string, unknown>;
        to?: Record<string, unknown>;
        leave?: Record<string, unknown>;
        [k: string]: unknown;
      }
    >;
    const stripped: Record<string, unknown> = {};
    for (const key of Object.keys(states)) {
      const v = states[key];
      if (!v || typeof v !== "object") {
        stripped[key] = v;
        continue;
      }
      stripped[key] = {
        ...v,
        ...(v.from != null && { from: stripLayoutKeysFromKeyframes(v.from) }),
        ...(v.to != null && { to: stripLayoutKeysFromKeyframes(v.to) }),
        ...(v.leave != null && { leave: stripLayoutKeysFromKeyframes(v.leave) }),
      };
    }
    merged.states = stripped;
  }

  // Strip incompatible layout keys from gesture keyframes.
  // Uses the narrower GESTURE_LAYOUT_STRIP_KEYS so width/height survive — they're
  // valid Framer Motion gesture targets and the ElementRenderer handles them correctly.
  for (const gestureKey of ["onHover", "onPress", "onFocus", "onDrag", "onVisible"] as const) {
    const val = merged[gestureKey];
    if (val != null && typeof val === "object" && !Array.isArray(val))
      (merged as Record<string, unknown>)[gestureKey] = stripKeysFromKeyframes(
        val as Record<string, unknown>,
        GESTURE_LAYOUT_STRIP_KEYS
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
    : (mc.from as Record<string, unknown>);
  const animate = preset
    ? (preset.animate as Record<string, unknown>)
    : (mc.to as Record<string, unknown>);
  const d = Math.max(0, options.distancePx);

  const applyDistance = (keyframes: Record<string, unknown>): Record<string, unknown> => {
    const out = { ...keyframes };
    if (typeof out.y === "number" && out.y !== 0) out.y = out.y > 0 ? d : -d;
    if (typeof out.x === "number" && out.x !== 0) out.x = out.x > 0 ? d : -d;
    return out;
  };

  return {
    from: applyDistance(initial) as Record<string, number>,
    to: applyDistance(animate) as Record<string, number>,
    transition: {
      type: "ease",
      duration: options.duration,
      delay: options.delay,
      ease: options.ease,
    },
  } as MotionPropsFromJson;
}

export function getExitMotionFromPreset(
  presetName: string,
  options?: { duration?: number; delay?: number; ease?: string | [number, number, number, number] }
): { leave: Record<string, unknown>; transition?: Record<string, unknown> } {
  const defaults = getMotionDefaults();
  const presets = defaults.exitPresets;
  const preset =
    presets[presetName] ??
    (defaults.defaultExitPreset ? presets[defaults.defaultExitPreset] : undefined);
  const mc = defaults.motionComponent;
  const leave = (preset?.exit ?? mc.leave) as Record<string, unknown>;
  const duration =
    options?.duration ?? defaults.transition.exitDuration ?? defaults.transition.duration;
  const delay = options?.delay ?? 0;
  const ease = options?.ease ?? defaults.transition.ease;
  return {
    leave,
    transition: { type: "ease" as const, duration, delay, ease },
  };
}
