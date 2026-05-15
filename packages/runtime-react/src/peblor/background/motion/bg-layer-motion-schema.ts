import { z } from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

/**
 * FM-compatible easing: named string ("easeOut", "linear", …) or cubic-bezier [x1,y1,x2,y2].
 * The bezier form uses a tuple of exactly 4 numbers.
 */
const easeSchema = z.union([z.string(), z.tuple([z.number(), z.number(), z.number(), z.number()])]);

const baseTransitionSchema = z.object({
  duration: z.number().positive(),
  ease: easeSchema.optional(),
  delay: z.number().nonnegative().optional(),
});

// ── Loop ──────────────────────────────────────────────────────────────────────

/**
 * Continuous looping animation driven entirely by Framer Motion's `animate` prop.
 * Runs forever independently of scroll or viewport.
 *
 * Common uses: gradient pan, opacity pulse, hue-rotate.
 *
 * @example
 * { type: "loop",
 *   animate: { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] },
 *   transition: { duration: 8, ease: "linear" } }
 */
export const bgLoopMotionSchema = z.object({
  type: z.literal("loop"),
  /**
   * Framer Motion keyframe object. Property → single target value or keyframe array.
   * Any animatable CSS property is valid. Pairs naturally with backgroundSize + backgroundPosition.
   */
  animate: z.record(z.string(), z.any()),
  transition: baseTransitionSchema.extend({
    /**
     * "loop"   — restarts from the first keyframe (default, seamless for cyclic gradients)
     * "reverse" — alternates forward/backward
     * "mirror"  — like reverse but eases in both directions
     */
    repeatType: z.enum(["loop", "reverse", "mirror"]).optional(),
  }),
});

// ── Entrance ──────────────────────────────────────────────────────────────────

/**
 * One-shot entrance animation with configurable trigger.
 * Composes cleanly with `loop` — loops run in `animate`, entrance runs in `whileInView`.
 *
 * @example
 * { type: "entrance",
 *   initial: { opacity: 0 }, animate: { opacity: 1 },
 *   transition: { duration: 1.4, ease: "easeOut" },
 *   trigger: "onFirstVisible" }
 */
export const bgEntranceMotionSchema = z.object({
  type: z.literal("entrance"),
  /** Starting state (before animation). */
  initial: z.record(z.string(), z.any()),
  /** Target state (after animation completes). */
  animate: z.record(z.string(), z.any()),
  transition: baseTransitionSchema,
  /**
   * "onMount"        — fires immediately when the component mounts
   * "onFirstVisible" — fires once when the element enters the viewport (default)
   * "onEveryVisible" — fires every time the element re-enters the viewport
   */
  trigger: z.enum(["onMount", "onFirstVisible", "onEveryVisible"]).optional(),
  /** Fine-tune the Intersection Observer used for onFirstVisible/onEveryVisible. */
  viewport: z
    .object({
      once: z.boolean().optional(),
      amount: z.union([z.number().min(0).max(1), z.enum(["some", "all"])]).optional(),
      margin: z.string().optional(),
    })
    .optional(),
});

// ── Scroll ────────────────────────────────────────────────────────────────────

/**
 * Drive any CSS property (or CSS custom property) from page-scroll progress (0 → 1).
 * Progress is computed over the full scrollable height unless `offset` is customised.
 *
 * Supports numeric values and string-with-unit values ("0%", "100px", etc.).
 * Pairs well with gradient layers to fade, shift, or change colour as the user scrolls.
 *
 * @example
 * { type: "scroll",
 *   properties: { opacity: [0.3, 1], "--hue": [220, 320] } }
 */
export const bgScrollMotionSchema = z.object({
  type: z.literal("scroll"),
  /**
   * Map of CSS property → [valueAtScrollStart, valueAtScrollEnd].
   * CSS custom properties (--my-var) are set via style.setProperty.
   * Numeric or "number+unit" strings are linearly interpolated; other strings step at midpoint.
   */
  properties: z.record(z.string(), z.tuple([z.any(), z.any()])),
  /**
   * Framer Motion useScroll `offset` tuple.
   * Default: ["start start", "end end"] — maps full page scroll to [0, 1].
   */
  offset: z.tuple([z.string(), z.string()]).optional(),
  /** Clamp interpolated values to the [start, end] range. Default: true. */
  clamp: z.boolean().optional(),
});

// ── Pointer ───────────────────────────────────────────────────────────────────

/**
 * Drive CSS properties from normalised mouse position (0 = left/top, 1 = right/bottom).
 * Values are smoothly lerped toward the target each animation frame for a silky feel.
 *
 * @example
 * { type: "pointer",
 *   x: { "--cx": ["30%", "70%"] },
 *   y: { "--cy": ["30%", "70%"] },
 *   ease: 0.06 }
 */
export const bgPointerMotionSchema = z.object({
  type: z.literal("pointer"),
  /** CSS property → [valueWhenMouseLeft, valueWhenMouseRight]. */
  x: z.record(z.string(), z.tuple([z.any(), z.any()])).optional(),
  /** CSS property → [valueWhenMouseTop, valueWhenMouseBottom]. */
  y: z.record(z.string(), z.tuple([z.any(), z.any()])).optional(),
  /**
   * Lerp factor applied each animation frame (0–1).
   * Lower values are smoother but slower to reach the target.
   * 1 = instant snap, 0.08 = very smooth (default).
   */
  ease: z.number().min(0).max(1).optional(),
});

// ── Parallax ──────────────────────────────────────────────────────────────────

/**
 * Classic parallax depth illusion: shift `backgroundPosition` based on scroll progress.
 * The background drifts slower than the scroll speed, implying depth.
 *
 * Pair with `backgroundSize` > 100% on the layer to give the background room to drift.
 *
 * @example
 * { type: "parallax", speed: 0.4, axis: "y" }
 * // Background drifts 0% → 40% of its height as the page scrolls top → bottom.
 */
export const bgParallaxMotionSchema = z.object({
  type: z.literal("parallax"),
  /**
   * Drift magnitude as a fraction of the background's dimension.
   * 0 = fully static, 0.5 = drifts 50% of its height, 1 = drifts 100%.
   */
  speed: z.number(),
  /** Axis to drift along. Default: "y". */
  axis: z.enum(["x", "y"]).optional(),
  /**
   * Framer Motion useScroll `offset` tuple.
   * Default: ["start start", "end end"] — full page progress.
   */
  offset: z.tuple([z.string(), z.string()]).optional(),
});

// ── Trigger ───────────────────────────────────────────────────────────────────

/**
 * Imperatively animate the layer in response to custom DOM events (or on mount).
 * Multiple trigger configs with different `id` values can coexist on the same layer,
 * each adding its own event listener independently.
 *
 * Dispatch events from anywhere: `window.dispatchEvent(new Event("my-trigger-id"))`.
 *
 * @example
 * { type: "trigger",
 *   id: "hero:activate",
 *   from: { opacity: 0.3 }, to: { opacity: 1 },
 *   transition: { duration: 0.8, ease: "easeOut" },
 *   toggle: true }
 */
export const bgTriggerMotionSchema = z.object({
  type: z.literal("trigger"),
  /** DOM event name — listens on `window` for a matching `Event` or `CustomEvent`. */
  id: z.string(),
  /** Resting / initial state (the layer starts here). */
  from: z.record(z.string(), z.any()),
  /** Active state (animate to this when the event fires). */
  to: z.record(z.string(), z.any()),
  transition: z
    .object({
      duration: z.number().positive().optional(),
      ease: easeSchema.optional(),
      delay: z.number().nonnegative().optional(),
    })
    .optional(),
  /** Automatically animate to `to` on mount. Default: false. */
  autoPlay: z.boolean().optional(),
  /** Seconds to wait before the auto-play animation fires. Default: 0. */
  autoPlayDelay: z.number().nonnegative().optional(),
  /**
   * If true, successive event fires alternate between `to` and `from`.
   * If false, always animates to `to`. Default: false.
   */
  toggle: z.boolean().optional(),
});

// ── Union ─────────────────────────────────────────────────────────────────────

/**
 * Single motion config for a background layer.
 * Layers accept an array of these — multiple types compose additively.
 *
 * Composition rules:
 * - loop + entrance on different props: ✅ works (loop → animate, entrance → whileInView)
 * - loop + scroll/pointer on different props: ✅ works (loop via FM, others via direct style)
 * - loop + parallax on different props: ✅ works
 * - multiple scroll configs: ✅ works (each drives different CSS vars)
 * - multiple trigger configs: ✅ works (each has its own id)
 * - two configs targeting the SAME CSS property: ⚠️ last-write-wins
 */
export const bgLayerMotionSchema = z.discriminatedUnion("type", [
  bgLoopMotionSchema,
  bgEntranceMotionSchema,
  bgScrollMotionSchema,
  bgPointerMotionSchema,
  bgParallaxMotionSchema,
  bgTriggerMotionSchema,
]);
