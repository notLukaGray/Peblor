import type { BgLoopMotion, BgEntranceMotion, BgLayerMotion } from "./bg-layer-motion-types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ComposedMotionDivProps = {
  /**
   * FM `initial` — entrance start values.
   * Empty object when no entrance motions are present.
   */
  initial: Record<string, unknown>;

  /**
   * FM `animate` — loop keyframes + onMount entrance targets.
   * Loop props always live here; entrance props join when trigger is "onMount".
   */
  animate: Record<string, unknown>;

  /**
   * FM `whileInView` — onFirstVisible / onEveryVisible entrance targets.
   * `undefined` when no viewport-triggered entrance is present.
   *
   * This is intentionally separate from `animate` so loop animations (in `animate`)
   * keep running regardless of whether the element is in the viewport.
   */
  whileInView: Record<string, unknown> | undefined;

  /**
   * Per-property FM transition config.
   * Loop props carry `repeat: Infinity` + `repeatType`.
   * Entrance props carry one-shot duration/ease/delay.
   * When both a loop and an entrance target the same prop, the loop transition wins
   * (keeping it infinite) because the entrance resolved first and loop runs continuously.
   */
  transition: Record<string, unknown>;

  /** Viewport config forwarded to FM's `viewport` prop on `whileInView`. */
  viewport: { once?: boolean; amount?: number | "some" | "all"; margin?: string } | undefined;

  /**
   * True when at least one loop or entrance motion is present.
   * When false, the layer can render as a plain `<div>` — no FM needed for this axis.
   */
  needsMotionDiv: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLoopTransitionEntry(loop: BgLoopMotion): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  for (const prop of Object.keys(loop.animate)) {
    entry[prop] = {
      duration: loop.transition.duration,
      ease: loop.transition.ease ?? "linear",
      delay: loop.transition.delay ?? 0,
      repeat: Infinity,
      repeatType: loop.transition.repeatType ?? "loop",
    };
  }
  return entry;
}

function buildEntranceTransitionEntry(
  entrance: BgEntranceMotion,
  loopTransition: Record<string, unknown>
): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  for (const prop of Object.keys(entrance.animate)) {
    // Preserve loop transitions — they already have repeat:Infinity.
    // Entrance for that same prop just means it starts from `initial` on mount; loop keeps running.
    if (prop in loopTransition) continue;
    entry[prop] = {
      duration: entrance.transition.duration,
      ease: entrance.transition.ease ?? "easeOut",
      delay: entrance.transition.delay ?? 0,
    };
  }
  return entry;
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Merge all `loop` and `entrance` motion configs from a layer's `motion` array into
 * a single set of Framer Motion props suitable for a `motion.div`.
 *
 * Key composition strategy:
 * - Loop props → `animate` with `repeat: Infinity` per-property transitions.
 * - Entrance "onMount" → also in `animate`; merges with loops on different props.
 * - Entrance "onFirstVisible"/"onEveryVisible" → `whileInView` (kept separate so loops
 *   keep running even when the element leaves and re-enters the viewport).
 *
 * Same-prop conflicts:
 * - Loop + entrance on the same prop: loop transition wins (infinite), entrance initial
 *   still applies so the prop starts from the entrance `initial` value.
 * - Two loops on the same prop: last declaration wins.
 * - Two entrances on the same prop: last declaration wins.
 */
export function composeMotionDivProps(motions: BgLayerMotion[]): ComposedMotionDivProps {
  const loops = motions.filter((m): m is BgLoopMotion => m.type === "loop");
  const entrances = motions.filter((m): m is BgEntranceMotion => m.type === "entrance");

  if (loops.length === 0 && entrances.length === 0) {
    return {
      initial: {},
      animate: {},
      whileInView: undefined,
      transition: {},
      viewport: undefined,
      needsMotionDiv: false,
    };
  }

  // ── Loops ──────────────────────────────────────────────────────────

  const loopAnimate: Record<string, unknown> = {};
  const loopTransition: Record<string, unknown> = {};

  for (const loop of loops) {
    Object.assign(loopAnimate, loop.animate);
    Object.assign(loopTransition, buildLoopTransitionEntry(loop));
  }

  // ── Entrances ──────────────────────────────────────────────────────

  // Authority for trigger + viewport comes from the first entrance declaration.
  const primaryEntrance = entrances[0];
  const trigger = primaryEntrance?.trigger ?? "onFirstVisible";
  const viewportConfig = primaryEntrance?.viewport;

  const entranceInitial: Record<string, unknown> = {};
  const entranceAnimate: Record<string, unknown> = {};
  const entranceTransition: Record<string, unknown> = {};

  for (const entrance of entrances) {
    Object.assign(entranceAnimate, entrance.animate);
    Object.assign(entranceInitial, entrance.initial);
    Object.assign(entranceTransition, buildEntranceTransitionEntry(entrance, loopTransition));
  }

  // ── Compose animate + whileInView ──────────────────────────────────

  // Loop animate is always present in `animate`.
  const animate: Record<string, unknown> = { ...loopAnimate };
  let whileInView: Record<string, unknown> | undefined;

  if (entrances.length > 0) {
    if (trigger === "onMount") {
      // onMount: entrance target joins `animate` directly
      Object.assign(animate, entranceAnimate);
    } else {
      // onFirstVisible / onEveryVisible: separate whileInView so loops keep repeating
      whileInView = { ...entranceAnimate };
    }
  }

  const viewport =
    entrances.length > 0 ? (viewportConfig ?? { once: trigger !== "onEveryVisible" }) : undefined;

  return {
    initial: entranceInitial,
    animate,
    whileInView,
    transition: { ...loopTransition, ...entranceTransition },
    viewport,
    needsMotionDiv: true,
  };
}
