/**
 * Universal state-style helper — renders pseudo-state CSS (hover/focus/focus-visible/active/disabled)
 * as a scoped <style> tag with a deterministic class name.
 *
 * Inline styles cannot express pseudo-states, so this helper computes:
 *   - a stable class name derived from the element id or a hash of the style objects
 *   - the full CSS rule block to emit as a <style> tag sibling
 *
 * Designed to be zero-cost when no state styles are present (returns undefined for both outputs).
 * Works identically on server (RSC/SSR) and client — pure synchronous computation.
 */

import {
  hashCssString,
  sanitizeCssProp,
  sanitizeCssValue,
  sanitizeForClassName,
  toKebabCase,
} from "./css-declaration-utils";

type CssStyleObject = Record<string, string | number>;

/** Serialize a CSS style object to a declaration string (e.g. "opacity:0.8;color:red"). */
function serializeDeclarations(style: CssStyleObject): string {
  return Object.entries(style)
    .filter(([, v]) => v != null && v !== "")
    .map(([prop, val]) => {
      const safeProp = sanitizeCssProp(toKebabCase(prop));
      const safeVal = sanitizeCssValue(val);
      return { safeProp, safeVal };
    })
    .filter(({ safeProp, safeVal }) => safeProp !== "" && safeVal !== "")
    .map(({ safeProp, safeVal }) => `${safeProp}:${safeVal}`)
    .join(";");
}

export type StateStyleInput = {
  id?: string | null | undefined;
  hoverStyle?: CssStyleObject | null | undefined;
  focusStyle?: CssStyleObject | null | undefined;
  focusVisibleStyle?: CssStyleObject | null | undefined;
  activeStyle?: CssStyleObject | null | undefined;
  disabledStyle?: CssStyleObject | null | undefined;
};

export type StateStyleResult = {
  /** CSS class name to add to the element wrapper. Undefined when no state styles are present. */
  className: string | undefined;
  /** Full CSS text to emit as a <style> tag sibling. Undefined when no state styles are present. */
  css: string | undefined;
};

/**
 * Compute a deterministic scoped class name and the CSS rules for the provided state styles.
 *
 * Class derivation:
 *  - When `id` is provided and non-empty: use it as the class suffix (sanitized).
 *  - Otherwise: hash the serialized style objects for a content-derived stable key.
 *
 * Only emits CSS blocks for states that are provided (non-null, non-empty).
 * Returns `{ className: undefined, css: undefined }` when no states are provided.
 */
export function computeStateStyle(input: StateStyleInput): StateStyleResult {
  const { id, hoverStyle, focusStyle, focusVisibleStyle, activeStyle, disabledStyle } = input;

  const hasHover = hoverStyle != null && Object.keys(hoverStyle).length > 0;
  const hasFocus = focusStyle != null && Object.keys(focusStyle).length > 0;
  const hasFocusVisible = focusVisibleStyle != null && Object.keys(focusVisibleStyle).length > 0;
  const hasActive = activeStyle != null && Object.keys(activeStyle).length > 0;
  const hasDisabled = disabledStyle != null && Object.keys(disabledStyle).length > 0;

  if (!hasHover && !hasFocus && !hasFocusVisible && !hasActive && !hasDisabled) {
    return { className: undefined, css: undefined };
  }

  // Derive a stable suffix for the class name.
  let suffix: string;
  if (id != null && id.length > 0) {
    suffix = sanitizeForClassName(id);
  } else {
    // Hash all style objects together for a content-stable key.
    const payload = JSON.stringify({
      h: hoverStyle,
      f: focusStyle,
      fv: focusVisibleStyle,
      a: activeStyle,
      d: disabledStyle,
    });
    suffix = hashCssString(payload);
  }

  const cls = `pb-st-${suffix}`;

  const rules: string[] = [];
  if (hasHover) {
    rules.push(`.${cls}:hover{${serializeDeclarations(hoverStyle as CssStyleObject)}}`);
  }
  if (hasFocus) {
    rules.push(`.${cls}:focus{${serializeDeclarations(focusStyle as CssStyleObject)}}`);
  }
  if (hasFocusVisible) {
    rules.push(
      `.${cls}:focus-visible{${serializeDeclarations(focusVisibleStyle as CssStyleObject)}}`
    );
  }
  if (hasActive) {
    rules.push(`.${cls}:active{${serializeDeclarations(activeStyle as CssStyleObject)}}`);
  }
  if (hasDisabled) {
    const decls = serializeDeclarations(disabledStyle as CssStyleObject);
    rules.push(`.${cls}:disabled{${decls}}`, `.${cls}[aria-disabled="true"]{${decls}}`);
  }

  return { className: cls, css: rules.join("") };
}
