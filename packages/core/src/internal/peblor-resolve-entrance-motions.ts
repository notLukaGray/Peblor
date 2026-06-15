import {
  MOTION_DEFAULTS,
  getEntranceMotionFromPreset,
  getExitMotionFromPreset,
  mergeMotionDefaults,
} from "@pb/contracts";
import type {
  ResolvedEntranceMotion,
  ResolvedExitMotion,
  MotionPropsFromJson,
  ElementBlock,
} from "@pb/contracts";

function normalizeViewportAmount(amount: unknown): number {
  if (amount === "some") return 0.1;
  if (amount === "all") return 1;
  if (typeof amount === "number" && Number.isFinite(amount))
    return Math.max(0, Math.min(1, amount));
  return MOTION_DEFAULTS.viewport.amount;
}

/**
 * Normalises per-property transition overrides that passthrough the Zod schema
 * (e.g. CSS custom property keys like `{ "--pb-bg-x": { repeat: "Infinity" } }`).
 * The direct `repeat` field is already transformed by the contracts Zod schema.
 */
function normalizeLoopPassthrough(
  loopTransition: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(loopTransition)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const entry = v as Record<string, unknown>;
      result[k] =
        "repeat" in entry && entry.repeat === "Infinity" ? { ...entry, repeat: Infinity } : entry;
    } else {
      result[k] = v;
    }
  }
  return result;
}

/** Resolves entrance preset / entranceMotion (+ optional element `motion`) into FM props. */
export function resolveEntranceMotion(
  motionTiming: Record<string, unknown>,
  elementMotion?: Record<string, unknown>
): ResolvedEntranceMotion | undefined {
  const trigger = motionTiming.trigger as string | undefined;
  const entrancePreset = motionTiming.entrancePreset as string | undefined;
  const entranceMotion = motionTiming.entranceMotion as Record<string, unknown> | undefined;

  const loop = elementMotion?.loop as Record<string, unknown> | undefined;
  const hasLoop = !!loop?.to;

  // Only resolve if there's an explicit entrance signal OR a continuous loop animation.
  if (!trigger && !entrancePreset && !entranceMotion && !hasLoop) return undefined;

  const viewportOpts = motionTiming.viewport as Record<string, unknown> | undefined;
  const viewportAmount = normalizeViewportAmount(
    viewportOpts?.amount ?? MOTION_DEFAULTS.viewport.amount
  );
  const viewportOnce = (trigger ?? "onFirstVisible") !== "onEveryVisible";

  let resolved: Record<string, unknown>;

  if (!trigger && !entrancePreset && !entranceMotion && hasLoop) {
    // Loop-only: no entrance animation. Element starts fully visible; loop begins on mount/scroll.
    resolved = { from: {}, to: {}, transition: {} };
  } else {
    // Resolve transition params from entranceMotion overrides or defaults.
    const entranceTransition =
      entranceMotion?.transition != null && typeof entranceMotion.transition === "object"
        ? (entranceMotion.transition as Record<string, unknown>)
        : undefined;
    const duration =
      (entranceTransition?.duration as number | undefined) ?? MOTION_DEFAULTS.transition.duration;
    const delay =
      (entranceTransition?.delay as number | undefined) ?? MOTION_DEFAULTS.transition.delay;
    const playOffset = (viewportOpts?.playOffset as number | undefined) ?? 0;
    const effectiveDelay = delay + duration * playOffset;
    const ease =
      (entranceTransition?.ease as string | [number, number, number, number] | undefined) ??
      MOTION_DEFAULTS.easeTuple;

    // Pick the motion source: explicit entranceMotion, then fallback to element motion, then preset.
    const hasCustomMotion =
      entranceMotion != null &&
      typeof entranceMotion === "object" &&
      (entranceMotion.from != null || entranceMotion.to != null);
    const effectiveMotion = hasCustomMotion ? entranceMotion : elementMotion;

    if (
      effectiveMotion != null &&
      typeof effectiveMotion === "object" &&
      (effectiveMotion.from != null || effectiveMotion.to != null)
    ) {
      resolved = (mergeMotionDefaults(effectiveMotion as MotionPropsFromJson) ?? {}) as Record<
        string,
        unknown
      >;
    } else {
      const presetName = entrancePreset ?? MOTION_DEFAULTS.defaultEntrancePreset ?? "fade";
      const fromPreset = getEntranceMotionFromPreset(presetName, {
        distancePx: MOTION_DEFAULTS.defaultSlideDistancePx,
        duration,
        delay: effectiveDelay,
        ease,
      });
      resolved = (mergeMotionDefaults(fromPreset) ?? {}) as Record<string, unknown>;
    }
  }

  // Merge loop animation into to for continuous repeating effects.
  if (loop?.to) {
    resolved.to = {
      ...((resolved.to as Record<string, unknown>) ?? {}),
      ...(loop.to as Record<string, unknown>),
    };
    if (loop.transition) {
      // Normalise per-property passthrough overrides; direct `repeat` was already
      // handled by the Zod transform in the contracts layer.
      const normalizedLoopTransition = normalizeLoopPassthrough(
        loop.transition as Record<string, unknown>
      );
      resolved.transition = {
        ...((resolved.transition as Record<string, unknown>) ?? {}),
        ...normalizedLoopTransition,
      };
    }
  }

  const onHover = resolved.onHover as Record<string, unknown> | undefined;
  const onPress = resolved.onPress as Record<string, unknown> | undefined;

  return {
    from: (resolved.from ?? {}) as Record<string, unknown>,
    to: (resolved.to ?? { opacity: 1 }) as Record<string, unknown>,
    transition: (resolved.transition ?? {}) as Record<string, unknown>,
    viewportAmount,
    viewportOnce,
    ...(onHover != null && Object.keys(onHover).length > 0 ? { onHover } : {}),
    ...(onPress != null && Object.keys(onPress).length > 0 ? { onPress } : {}),
  };
}

function resolveMotionForElement(el: Record<string, unknown>): Record<string, unknown> {
  const motionTiming = el.motionTiming as Record<string, unknown> | undefined;
  const elementMotion = el.motion as Record<string, unknown> | undefined;
  const hasLoopWithoutTiming =
    !motionTiming && !!(elementMotion?.loop as Record<string, unknown> | undefined)?.to;
  const effectiveTiming = motionTiming ?? (hasLoopWithoutTiming ? {} : undefined);
  if (!effectiveTiming) return el;
  const resolved = resolveEntranceMotion(effectiveTiming, elementMotion);
  if (!resolved) return el;
  return { ...el, motionTiming: { ...effectiveTiming, resolvedEntranceMotion: resolved } };
}

// ---------------------------------------------------------------------------
// Exit motion resolution
// ---------------------------------------------------------------------------

/**
 * Resolve `motionTiming.resolvedExitMotion` on an element.
 *
 * Priority:
 * 1. `motionTiming.exitMotion` → if it has a `.leave` key, use it directly
 * 2. `motionTiming.exitPreset` → resolve via `getExitMotionFromPreset`
 * 3. Top-level `motion` prop (if it has `.leave`) → use directly
 * 4. Top-level `exitPreset` → resolve via `getExitMotionFromPreset`
 *
 * If no exit config is found, the element passes through unchanged.
 *
 * This mirrors the old runtime resolution in `ElementExitWrapper` which was
 * removed in favor of pre-resolved motion — but the pipeline stage that writes
 * `resolvedExitMotion` was never added. This function fills that gap.
 */
function resolveExitMotionForElementRecord(el: Record<string, unknown>): Record<string, unknown> {
  const motionTiming = el.motionTiming as Record<string, unknown> | undefined;
  const topLevelExitPreset = el.exitPreset as string | undefined;
  const topLevelMotion = el.motion as Record<string, unknown> | undefined;

  let leave: Record<string, unknown> | undefined;
  let transition: Record<string, unknown> | undefined;

  // Priority 1: motionTiming.exitMotion.leave (highest — explicit per-element exit config)
  const timingExitMotion = motionTiming?.exitMotion as Record<string, unknown> | undefined;
  if (
    timingExitMotion != null &&
    typeof timingExitMotion === "object" &&
    (timingExitMotion.leave as Record<string, unknown> | undefined) != null
  ) {
    leave = timingExitMotion.leave as Record<string, unknown>;
    transition = timingExitMotion.transition as Record<string, unknown> | undefined;
  }
  // Priority 2: motionTiming.exitPreset (named preset on motionTiming)
  else if (motionTiming?.exitPreset && typeof motionTiming.exitPreset === "string") {
    const fromPreset = getExitMotionFromPreset(motionTiming.exitPreset);
    leave = fromPreset.leave;
    transition = fromPreset.transition;
  }
  // Priority 3: topLevelMotion.leave (top-level motion object with leave)
  else if (
    topLevelMotion != null &&
    typeof topLevelMotion === "object" &&
    (topLevelMotion.leave as Record<string, unknown> | undefined) != null
  ) {
    leave = topLevelMotion.leave as Record<string, unknown>;
    transition = topLevelMotion.transition as Record<string, unknown> | undefined;
  }
  // Priority 4: topLevelExitPreset (lowest)
  else if (topLevelExitPreset && typeof topLevelExitPreset === "string") {
    const fromPreset = getExitMotionFromPreset(topLevelExitPreset);
    leave = fromPreset.leave;
    transition = fromPreset.transition;
  } else {
    return el;
  }

  const resolvedExitMotion: ResolvedExitMotion = {
    leave,
    ...(transition ? { transition } : {}),
  };

  return {
    ...el,
    motionTiming: { ...(motionTiming ?? {}), resolvedExitMotion },
  };
}

/** Resolves `motionTiming.resolvedEntranceMotion` for a single element record (same as section walk). */
export function resolveEntranceMotionsForElement(el: unknown): unknown {
  if (!el || typeof el !== "object") return el;
  return resolveMotionForElement(el as Record<string, unknown>);
}

/**
 * Per-element entrance motion resolver for use with `transformElementsInSectionsCombined`.
 * Wraps `resolveMotionForElement` with proper `ElementBlock` typing for composition.
 */
export function resolveEntranceMotionForSingleElement(el: ElementBlock): ElementBlock {
  return resolveMotionForElement(el as unknown as Record<string, unknown>) as ElementBlock;
}

// ---------------------------------------------------------------------------
// Per-element exit motion resolver (for composeTransform)
// ---------------------------------------------------------------------------

/**
 * Per-element exit motion resolver for use with `transformElementsInSectionsCombined`.
 * Resolves `motionTiming.exitPreset` / top-level `exitPreset` / `motion.exit` into
 * `motionTiming.resolvedExitMotion` so ElementExitWrapper never runs preset lookups
 * or mergeMotionDefaults at runtime.
 */
export function resolveExitMotionForSingleElement(el: ElementBlock): ElementBlock {
  return resolveExitMotionForElementRecord(
    el as unknown as Record<string, unknown>
  ) as ElementBlock;
}
