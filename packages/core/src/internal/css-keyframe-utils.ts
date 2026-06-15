/**
 * Shared CSS keyframe generation utilities.
 *
 * Used by both the build-time pipeline (precompile-button-loop-css.ts) and the
 * runtime fallback (use-button-pointer.ts) to produce consistent @keyframes CSS
 * from structured animation data.
 *
 * This is the CANONICAL location for these helpers. Any duplicate implementations
 * elsewhere in the codebase should be replaced with imports from this module.
 */

// ---------------------------------------------------------------------------
// Property name conversion
// ---------------------------------------------------------------------------

/** Convert a camelCase CSS property name to kebab-case. Already-kebab names pass through. */
export function toKebabCase(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

// ---------------------------------------------------------------------------
// @keyframes generation
// ---------------------------------------------------------------------------

/**
 * Generate a `@keyframes` CSS block from a set of named animation properties.
 *
 * @param name    The keyframes name (e.g. `pb-btn-loop-xyz-0`).
 * @param animate A map of CSS property → array of per-stop values. Every array
 *                should be the same length; shorter arrays are padded with their
 *                last value.
 * @returns A complete `@keyframes <name> { … }` CSS string, or "" if empty.
 */
export function generateKeyframes(
  name: string,
  animate: Record<string, (string | number)[]>
): string {
  const props = Object.entries(animate);
  if (props.length === 0) return "";

  const stepCount = Math.max(...props.map(([, v]) => v.length));
  if (!Number.isFinite(stepCount) || stepCount < 1) return "";

  let css = `@keyframes ${name} {\n`;

  if (stepCount === 1) {
    // Single-stop animation: emit both 0% and 100% with the same declarations
    // so the animation holds at the target value rather than snapping from the
    // element's computed style on each loop cycle.
    const decls = props.map(([prop, values]) => `${toKebabCase(prop)}: ${values[0]}`).join("; ");
    css += `  0% { ${decls} }\n  100% { ${decls} }\n`;
  } else {
    for (let i = 0; i < stepCount; i++) {
      const pct = Math.round((i / (stepCount - 1)) * 100);
      const decls = props
        .map(([prop, values]) => {
          const val = values[i] ?? values[values.length - 1];
          return `${toKebabCase(prop)}: ${val}`;
        })
        .join("; ");
      css += `  ${pct}% { ${decls} }\n`;
    }
  }

  css += "}";
  return css;
}

// ---------------------------------------------------------------------------
// Animation shorthand value
// ---------------------------------------------------------------------------

/**
 * Build a CSS `animation` shorthand value for an infinite loop animation.
 *
 * @param name       The @keyframes name.
 * @param transition The transition timing configuration.
 * @returns A CSS animation shorthand string (e.g. `pb-btn-loop-x 1s ease-in-out 0s infinite normal`).
 */
export function buildAnimationValue(
  name: string,
  transition: {
    duration: number;
    ease?: string | number[];
    delay?: number;
    repeatType?: string;
  }
): string {
  const duration =
    typeof transition.duration === "number" && Number.isFinite(transition.duration)
      ? transition.duration
      : 0;
  const ease = Array.isArray(transition.ease)
    ? `cubic-bezier(${(transition.ease as number[]).join(",")})`
    : (transition.ease ?? "ease-in-out");
  const delay = transition.delay != null ? `${transition.delay}s` : "0s";
  const dir =
    transition.repeatType === "mirror" || transition.repeatType === "reverse"
      ? "alternate"
      : "normal";
  return `${name} ${duration}s ${ease} ${delay} infinite ${dir}`;
}
