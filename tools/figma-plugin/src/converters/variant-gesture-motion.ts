/**
 * Gesture motion helpers for component variants.
 * Builds whileHover/whileTap motion objects and applies child-level gesture diffs.
 */

/**
 * Carries the per-gesture diffs for a single child element, together with a flag
 * that records whether the child's ORIGINAL (pre-Gap-6-deduplication) visual diff
 * contained a `width` key.  This flag must be captured before Gap 6 strips keys
 * that are already present in the parent-level gestureMotion, because once those
 * keys are removed `hasOwnWidthDiff` would always be false and Fix B's conditional
 * (skip alignSelf/width injection for self-sized children) would never trigger.
 */
export type ChildDiffEntry = {
  diffs: Map<"whileHover" | "whileTap", Record<string, unknown>>;
  hadOwnWidth: boolean;
};

/**
 * Applies gesture diffs to child element blocks within the default state group.
 * Mutates `definitions` in place.
 */
export function applyChildGestureDiffs(
  childDiffs: Map<string, ChildDiffEntry>,
  defaultChildren: { definitions: Record<string, unknown>; elementOrder: string[] },
  annotations: Record<string, string>
): void {
  if (childDiffs.size === 0) return;

  const childGestureTransition: Record<string, unknown> = { duration: 0.15, ease: "easeOut" };
  const annDur = parseFloat(annotations["duration"] ?? "");
  if (!isNaN(annDur)) childGestureTransition.duration = annDur;
  const annEase = annotations["ease"];
  if (annEase && annEase !== "spring") childGestureTransition.ease = annEase;

  for (const [childId, { diffs: gestureDiffsByProp, hadOwnWidth }] of childDiffs) {
    const block = defaultChildren.definitions[childId] as Record<string, unknown>;
    if (!block) continue;

    const existingMotion = (block.motion as Record<string, unknown>) ?? {};
    const mergedMotion: Record<string, unknown> = {
      initial: false,
      animate: {},
      ...existingMotion,
    };
    for (const [gestureProp, cDiff] of gestureDiffsByProp) {
      mergedMotion[gestureProp] = {
        ...((mergedMotion[gestureProp] as Record<string, unknown>) ?? {}),
        ...cDiff,
      };
    }
    mergedMotion.transition = childGestureTransition;
    block.motion = mergedMotion;

    // Fix B (Gap 8): only force alignSelf/width stretch when the child did NOT
    // have its own width in the original visual diff.  We use `hadOwnWidth` — set
    // from the unfiltered diff in variant-builder.ts — rather than re-checking the
    // already-filtered diffs, which may have had `width` removed by Gap 6.
    // Fix B side-effect (Bug 4): ...ws spreads all existing wrapperStyle keys
    // (including border) in both branches, so nothing is accidentally dropped.
    const ws = (block.wrapperStyle as Record<string, unknown>) ?? {};
    if (!hadOwnWidth) {
      block.wrapperStyle = { alignSelf: "stretch", width: "100%", ...ws };
    } else {
      block.wrapperStyle = { ...ws };
    }
  }
}

/**
 * Builds the outer gesture motion prop for an element group when gesture diffs exist.
 * Returns the motion object to assign to the default state element, or null if none.
 */
export function buildOuterGestureMotion(
  gestureMotion: Record<string, Record<string, unknown>>,
  annotations: Record<string, string>
): Record<string, unknown> | null {
  if (Object.keys(gestureMotion).length === 0) return null;

  const gestureTransition: Record<string, unknown> = { duration: 0.15, ease: "easeOut" };
  const annDuration = parseFloat(annotations["duration"] ?? "");
  if (!isNaN(annDuration)) gestureTransition.duration = annDuration;
  const annEase = annotations["ease"];
  if (annEase && annEase !== "spring") gestureTransition.ease = annEase;

  const hasDimensionGesture = Object.values(gestureMotion).some(
    (target) => "width" in target || "height" in target
  );

  return {
    initial: false,
    animate: {},
    ...gestureMotion,
    transition: gestureTransition,
    ...(hasDimensionGesture ? { layout: true } : {}),
  };
}
