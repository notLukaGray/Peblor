import { MOTION_DEFAULTS, getEntranceMotionFromPreset, mergeMotionDefaults } from "@pb/contracts";
import type { ResolvedEntranceMotion, SectionBlock, MotionPropsFromJson } from "@pb/contracts";

function normalizeViewportAmount(amount: unknown): number {
  if (amount === "some") return 0.1;
  if (amount === "all") return 1;
  if (typeof amount === "number" && Number.isFinite(amount))
    return Math.max(0, Math.min(1, amount));
  return MOTION_DEFAULTS.viewport.amount;
}

/** Resolves entrance preset / entranceMotion (+ optional element `motion`) into FM props. */
export function resolveEntranceMotion(
  motionTiming: Record<string, unknown>,
  elementMotion?: Record<string, unknown>
): ResolvedEntranceMotion | undefined {
  const trigger = motionTiming.trigger as string | undefined;
  const entrancePreset = motionTiming.entrancePreset as string | undefined;
  const entranceMotion = motionTiming.entranceMotion as Record<string, unknown> | undefined;

  // Only resolve if there's an explicit entrance signal.
  if (!trigger && !entrancePreset && !entranceMotion) return undefined;

  const viewportOpts = motionTiming.viewport as Record<string, unknown> | undefined;
  const viewportAmount = normalizeViewportAmount(
    viewportOpts?.amount ?? MOTION_DEFAULTS.viewport.amount
  );
  const viewportOnce = (trigger ?? "onFirstVisible") !== "onEveryVisible";

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
    (entranceMotion.initial != null || entranceMotion.animate != null);
  const effectiveMotion = hasCustomMotion ? entranceMotion : elementMotion;

  let resolved: Record<string, unknown>;
  if (
    effectiveMotion != null &&
    typeof effectiveMotion === "object" &&
    (effectiveMotion.initial != null || effectiveMotion.animate != null)
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

  const whileHover = resolved.whileHover as Record<string, unknown> | undefined;
  const whileTap = resolved.whileTap as Record<string, unknown> | undefined;

  return {
    initial: (resolved.initial ?? {}) as Record<string, unknown>,
    animate: (resolved.animate ?? { opacity: 1 }) as Record<string, unknown>,
    transition: (resolved.transition ?? {}) as Record<string, unknown>,
    viewportAmount,
    viewportOnce,
    ...(whileHover != null && Object.keys(whileHover).length > 0 ? { whileHover } : {}),
    ...(whileTap != null && Object.keys(whileTap).length > 0 ? { whileTap } : {}),
  };
}

/** Resolves `motionTiming.resolvedEntranceMotion` for a single element record (same as section walk). */
export function resolveEntranceMotionsForElement(el: unknown): unknown {
  return processElement(el);
}

function processElement(el: unknown): unknown {
  if (!el || typeof el !== "object") return el;
  const element = el as Record<string, unknown>;
  let changed = false;
  const result: Record<string, unknown> = { ...element };

  const motionTiming = element.motionTiming as Record<string, unknown> | undefined;
  if (motionTiming) {
    const elementMotion = element.motion as Record<string, unknown> | undefined;
    const resolved = resolveEntranceMotion(motionTiming, elementMotion);
    if (resolved) {
      result.motionTiming = { ...motionTiming, resolvedEntranceMotion: resolved };
      changed = true;
    }
  }

  // elementGroup / elementInfiniteScroll: recurse into section.definitions
  if (element.type === "elementGroup" || element.type === "elementInfiniteScroll") {
    const section = element.section as { definitions?: Record<string, unknown> } | undefined;
    if (section?.definitions) {
      const newDefs: Record<string, unknown> = {};
      let defsChanged = false;
      for (const [k, def] of Object.entries(section.definitions)) {
        const newDef = processElement(def);
        if (newDef !== def) defsChanged = true;
        newDefs[k] = newDef;
      }
      if (defsChanged) {
        result.section = { ...section, definitions: newDefs };
        changed = true;
      }
    }
  }

  // elementModule: recurse into moduleConfig.slots[*].section.definitions
  const moduleConfig = element.moduleConfig as
    | { slots?: Record<string, { section?: { definitions?: Record<string, unknown> } }> }
    | undefined;
  if (moduleConfig?.slots) {
    const newSlots: typeof moduleConfig.slots = {};
    let slotsChanged = false;
    for (const [k, slot] of Object.entries(moduleConfig.slots)) {
      const defs = slot?.section?.definitions;
      if (!defs) {
        newSlots[k] = slot;
        continue;
      }
      const newDefs: Record<string, unknown> = {};
      let defsChanged = false;
      for (const [dk, def] of Object.entries(defs)) {
        const newDef = processElement(def);
        if (newDef !== def) defsChanged = true;
        newDefs[dk] = newDef;
      }
      if (defsChanged) {
        newSlots[k] = { ...slot, section: { ...slot.section, definitions: newDefs } };
        slotsChanged = true;
      } else {
        newSlots[k] = slot;
      }
    }
    if (slotsChanged) {
      result.moduleConfig = { ...moduleConfig, slots: newSlots };
      changed = true;
    }
  }

  return changed ? result : el;
}

function processSection(section: SectionBlock): SectionBlock {
  const s = section as Record<string, unknown>;
  let changed = false;
  const result: Record<string, unknown> = { ...s };

  // contentBlock / scrollContainer / sectionColumn: elements array
  if (Array.isArray(s.elements)) {
    const newElements = (s.elements as unknown[]).map((el) => processElement(el));
    const anyChanged = newElements.some((el, i) => el !== (s.elements as unknown[])[i]);
    if (anyChanged) {
      result.elements = newElements;
      changed = true;
    }
  }

  const definitions = s.definitions as Record<string, unknown> | undefined;
  if (definitions && typeof definitions === "object") {
    const newDefs: Record<string, unknown> = {};
    let defsChanged = false;
    for (const [key, definition] of Object.entries(definitions)) {
      const newDefinition = processElement(definition);
      if (newDefinition !== definition) defsChanged = true;
      newDefs[key] = newDefinition;
    }
    if (defsChanged) {
      result.definitions = newDefs;
      changed = true;
    }
  }

  // revealSection: collapsedElements + revealedElements
  if (s.type === "revealSection") {
    const collapsed = s.collapsedElements as unknown[] | undefined;
    const revealed = s.revealedElements as unknown[] | undefined;
    if (Array.isArray(collapsed)) {
      const newCollapsed = collapsed.map((el) => processElement(el));
      if (newCollapsed.some((el, i) => el !== collapsed[i])) {
        result.collapsedElements = newCollapsed;
        changed = true;
      }
    }
    if (Array.isArray(revealed)) {
      const newRevealed = revealed.map((el) => processElement(el));
      if (newRevealed.some((el, i) => el !== revealed[i])) {
        result.revealedElements = newRevealed;
        changed = true;
      }
    }
  }

  return changed ? (result as SectionBlock) : section;
}

/**
 * Walks all sections and elements, resolving entrancePreset / entranceMotion into
 * motionTiming.resolvedEntranceMotion so the client never runs preset lookups or
 * mergeMotionDefaults at runtime.
 *
 * Returns a new array (sections/elements are copied only when changed).
 */
export function resolveEntranceMotionsIntoSections(sections: SectionBlock[]): SectionBlock[] {
  return sections.map((section) => {
    if (!section || typeof section !== "object") return section;
    return processSection(section);
  });
}
