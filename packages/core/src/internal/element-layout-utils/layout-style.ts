import type { CSSProperties } from "react";
import { getPbContentGuidelines } from "../adapters/host-config";
import { scaleSpaceForDensity } from "@pb/contracts/peblor/core/page-density";
import type { ElementLayout } from "@pb/contracts/types";
import { resolveResponsiveValue } from "../../lib/responsive-value";
import { resolveConstraintStyle } from "./figma-constraints-style";

export function coalesceEmptyString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number" && !Number.isNaN(value)) return String(value);
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t === "" ? undefined : t;
}

export function normalizeFlexAlignItemsValue(
  value: string
): NonNullable<CSSProperties["alignItems"]> {
  const s = value.trim();
  if (s === "left" || s === "start") return "flex-start";
  if (s === "right" || s === "end") return "flex-end";
  return s as NonNullable<CSSProperties["alignItems"]>;
}

export function normalizeFlexJustifyContentValue(value: string): string {
  const s = value.trim();
  if (s === "left" || s === "start") return "flex-start";
  if (s === "right" || s === "end") return "flex-end";
  return s;
}

function resolveSize(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  return value === "hug" ? "fit-content" : value;
}

export function peblorFlexGapToCss(gap: string | undefined | null): string | undefined {
  if (gap == null || gap === "auto") return undefined;
  if (/^-\d*\.?\d+(px|rem|em|vw|vh|%)$/i.test(gap.trim())) return undefined;
  return gap;
}

export function resolveFrameGapCss(gap: string | undefined | null): string | undefined {
  const pbContentGuidelines = getPbContentGuidelines();
  if (gap == null || gap === "") {
    const fallback = pbContentGuidelines.frameGapWhenUnset;
    return fallback != null ? scaleSpaceForDensity(fallback) : undefined;
  }
  return peblorFlexGapToCss(gap);
}

export function resolveFrameRowGapCss(rowGap: string | undefined | null): string | undefined {
  const pbContentGuidelines = getPbContentGuidelines();
  if (rowGap == null || rowGap === "") {
    const fallback = pbContentGuidelines.frameRowGapWhenUnset;
    return fallback != null ? scaleSpaceForDensity(fallback) : undefined;
  }
  return peblorFlexGapToCss(rowGap);
}

export function resolveFrameColumnGapCss(columnGap: string | undefined | null): string | undefined {
  const pbContentGuidelines = getPbContentGuidelines();
  if (columnGap == null || columnGap === "") {
    const fallback = pbContentGuidelines.frameColumnGapWhenUnset;
    return fallback != null ? scaleSpaceForDensity(fallback) : undefined;
  }
  return peblorFlexGapToCss(columnGap);
}

export function peblorOverlapGapToCss(gap: string | undefined | null): string | undefined {
  if (gap == null) return undefined;
  const trimmed = gap.trim();
  return /^-\d*\.?\d+(px|rem|em|vw|vh|%)$/i.test(trimmed) ? trimmed : undefined;
}

export function peblorJustifyContentForGap(
  justifyContent: CSSProperties["justifyContent"] | undefined,
  gap: string | undefined | null
): CSSProperties["justifyContent"] | undefined {
  const overlapGap = peblorOverlapGapToCss(gap);
  if (overlapGap && justifyContent === "space-between") return "center";
  return justifyContent;
}

const GRADIENT_RE = /^(repeating-)?(linear|radial|conic)-gradient\(/;

/**
 * Check if a value is a ThemeString object ({ value?, light?, dark? }) suitable for
 * light/dark mode resolution. These objects appear in `wrapperStyle`, `hoverStyle`,
 * and other style-related fields where CSS values may vary by theme.
 */
function isThemeStringObject(
  value: unknown
): value is { value?: string; light?: string; dark?: string } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((key) => key === "value" || key === "light" || key === "dark") &&
    (keys.includes("value") || keys.includes("light") || keys.includes("dark"))
  );
}

/**
 * Lower a value from `wrapperStyle` (or any style context) to a CSS-safe string or
 * number. Handles plain strings/numbers (pass-through), ThemeString objects
 * ({ value?, light?, dark? }), and special cases like gradient strings.
 *
 * For ThemeString objects with different light and dark values, emits the
 * `light-dark(light, dark)` CSS function so the browser selects the correct value
 * based on `color-scheme`. Gradient values skip `light-dark()` since browsers
 * reject it for non-color values.
 *
 * This is a light inline equivalent of the runtime-react `lowerThemeStringToCss`
 * utility, duplicated here because `packages/core` has zero React dependencies.
 */
function lowerThemeStringToCss(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  if (!isThemeStringObject(value)) return undefined;

  const { value: val, light, dark } = value;

  // Both light and dark present and different — use light-dark()
  if (light != null && dark != null && light !== dark) {
    // light-dark() only accepts <color> values — skip for gradients
    if (!GRADIENT_RE.test(light) && !GRADIENT_RE.test(dark)) {
      return `light-dark(${light}, ${dark})`;
    }
    // Gradient fallback: dark value (site is dark-by-default)
    return dark;
  }

  // Single value or both identical: prefer value, then light, then dark
  return val ?? light ?? dark;
}

const ALIGN_TO_ALIGN_SELF: Record<"left" | "center" | "right", string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export type ResolvedElementLayout = {
  id?: string;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  borderRadius?: string;
  constraints?: ElementLayout["constraints"];
  align?: "left" | "center" | "right";
  alignY?: "top" | "center" | "bottom";
  textAlign?: "left" | "right" | "center" | "justify";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  margin?: string;
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  inset?: string;
  sticky?: boolean;
  flexShrink?: number;
  flexGrow?: number;
  flexBasis?: string;
  order?: number;
  alignSelf?: string;
  zIndex?: number;
  fixed?: boolean;
  pointerEvents?: string;
  userSelect?: string;
  outline?: string;
  transform?: string;
  willChange?: string;
};

export function normalizeLayoutInput(
  layout: Partial<ElementLayout> | ElementLayout | undefined,
  isMobile?: boolean
): ResolvedElementLayout | undefined {
  if (!layout) return undefined;
  if (isMobile === undefined) return layout as ResolvedElementLayout;
  const extendedLayout = layout as Partial<ElementLayout> & {
    minWidth?: ElementLayout["width"];
    maxWidth?: ElementLayout["width"];
    minHeight?: ElementLayout["height"];
    maxHeight?: ElementLayout["height"];
  };
  const width = resolveResponsiveValue(layout.width, isMobile);
  const height = resolveResponsiveValue(layout.height, isMobile);
  const minWidth = resolveResponsiveValue(extendedLayout.minWidth, isMobile);
  const maxWidth = resolveResponsiveValue(extendedLayout.maxWidth, isMobile);
  const minHeight = resolveResponsiveValue(extendedLayout.minHeight, isMobile);
  const maxHeight = resolveResponsiveValue(extendedLayout.maxHeight, isMobile);
  const borderRadius = resolveResponsiveValue(layout.borderRadius, isMobile);
  const align = resolveResponsiveValue(layout.selfAlign, isMobile);
  const alignY = resolveResponsiveValue(layout.alignY, isMobile);
  const textAlign = resolveResponsiveValue(layout.textAlign, isMobile);
  const marginTop = resolveResponsiveValue(layout.marginTop, isMobile);
  const marginBottom = resolveResponsiveValue(layout.marginBottom, isMobile);
  const marginLeft = resolveResponsiveValue(layout.marginLeft, isMobile);
  const marginRight = resolveResponsiveValue(layout.marginRight, isMobile);
  const margin = resolveResponsiveValue(layout.margin, isMobile);
  const border = resolveResponsiveValue(layout.border, isMobile);
  const borderTop = resolveResponsiveValue(layout.borderTop, isMobile);
  const borderRight = resolveResponsiveValue(layout.borderRight, isMobile);
  const borderBottom = resolveResponsiveValue(layout.borderBottom, isMobile);
  const borderLeft = resolveResponsiveValue(layout.borderLeft, isMobile);
  const position = resolveResponsiveValue(layout.position, isMobile);
  const top = resolveResponsiveValue(layout.top, isMobile);
  const iright = resolveResponsiveValue(layout.right, isMobile);
  const bottom = resolveResponsiveValue(layout.bottom, isMobile);
  const ileft = resolveResponsiveValue(layout.left, isMobile);
  const inset = resolveResponsiveValue(layout.inset, isMobile);
  const flexBasis = resolveResponsiveValue(layout.flexBasis, isMobile);
  const alignSelf = resolveResponsiveValue(layout.alignSelf, isMobile);
  return {
    ...layout,
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    borderRadius,
    align,
    alignY,
    textAlign,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    margin,
    border,
    borderTop,
    borderRight,
    borderBottom,
    borderLeft,
    position,
    top,
    right: iright,
    bottom,
    left: ileft,
    inset,
    flexBasis,
    alignSelf,
    sticky: layout.sticky,
    flexShrink: layout.flexShrink,
    flexGrow: layout.flexGrow,
    order: layout.order,
    pointerEvents: layout.interaction,
    userSelect: layout.selectable,
    outline: resolveResponsiveValue(layout.outline, isMobile),
    transform: layout.transform,
    willChange: layout.willChange,
    zIndex: layout.layer ?? undefined,
  } as ResolvedElementLayout;
}

export function computePositioningStyle(resolved: ResolvedElementLayout): CSSProperties {
  const style: CSSProperties = {};
  if (resolved.align != null) style.alignSelf = ALIGN_TO_ALIGN_SELF[resolved.align];
  if (resolved.textAlign != null) style.textAlign = resolved.textAlign;
  if (resolved.margin != null) style.margin = resolved.margin;
  if (resolved.marginTop != null) style.marginTop = resolved.marginTop;
  if (resolved.marginBottom != null) style.marginBottom = resolved.marginBottom;
  if (resolved.marginLeft != null) style.marginLeft = resolved.marginLeft;
  if (resolved.marginRight != null) style.marginRight = resolved.marginRight;
  if (resolved.alignY === "center") {
    if (resolved.marginTop == null) style.marginTop = "auto";
    if (resolved.marginBottom == null) style.marginBottom = "auto";
  } else if (resolved.alignY === "bottom") {
    if (resolved.marginTop == null) style.marginTop = "auto";
  }
  if (resolved.position != null) style.position = resolved.position as CSSProperties["position"];
  if (resolved.sticky) style.position = "sticky";
  if (resolved.top != null) style.top = resolved.top;
  if (resolved.right != null) style.right = resolved.right;
  if (resolved.bottom != null) style.bottom = resolved.bottom;
  if (resolved.left != null) style.left = resolved.left;
  if (resolved.inset != null) style.inset = resolved.inset;
  if (resolved.flexShrink != null) style.flexShrink = resolved.flexShrink;
  if (resolved.flexGrow != null) style.flexGrow = resolved.flexGrow;
  if (resolved.flexBasis != null) style.flexBasis = resolved.flexBasis;
  if (resolved.order != null) style.order = resolved.order;
  if (resolved.alignSelf != null)
    style.alignSelf = resolved.alignSelf as CSSProperties["alignSelf"];
  if (resolved.zIndex != null) style.zIndex = resolved.zIndex;
  if (resolved.borderRadius != null) style.borderRadius = resolved.borderRadius;
  return style;
}

export function computeSizingStyle(resolved: ResolvedElementLayout): CSSProperties {
  const style: CSSProperties = {};
  const width = resolveSize(resolved.width);
  const height = resolveSize(resolved.height);
  if (width != null) {
    style.width = width;
    if (resolved.width != null && resolved.width !== "hug") style.minWidth = 0;
  }
  if (height != null) {
    style.height = height;
    if (resolved.height != null && resolved.height !== "hug") style.minHeight = 0;
  }
  const constraints = Array.isArray(resolved.constraints)
    ? undefined
    : (resolved.constraints as
        | { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string }
        | undefined);
  if (constraints) {
    if (constraints.minWidth != null) style.minWidth = constraints.minWidth;
    if (constraints.maxWidth != null) style.maxWidth = constraints.maxWidth;
    if (constraints.minHeight != null) style.minHeight = constraints.minHeight;
    if (constraints.maxHeight != null) style.maxHeight = constraints.maxHeight;
  }
  if (resolved.minWidth != null) style.minWidth = resolved.minWidth;
  if (resolved.maxWidth != null) style.maxWidth = resolved.maxWidth;
  if (resolved.minHeight != null) style.minHeight = resolved.minHeight;
  if (resolved.maxHeight != null) style.maxHeight = resolved.maxHeight;
  return style;
}

function computeFixedStyle(resolved: ResolvedElementLayout): CSSProperties {
  if (!resolved.fixed) return {};
  const style: CSSProperties = { position: "fixed" };
  if (resolved.zIndex != null) style.zIndex = resolved.zIndex;
  return style;
}

/**
 * Standard sr-only clip pattern — element is visually hidden but present in the a11y tree.
 * Referenced by computeVisualStyle (server + client share the same layout util).
 */
export const SR_ONLY_STYLE: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * Sanitize a `wrapperStyle` value into a safe CSSProperties object.
 *
 * Processes each entry through `lowerThemeStringToCss` so that:
 * - Plain strings and numbers pass through
 * - ThemeString objects ({ value?, light?, dark? }) are lowered to `light-dark()`
 *   or a single resolved value
 * - Unknown / non-resolvable values are silently dropped
 *
 * NOTE: `wrapperStyle` does NOT support responsive tier maps (base/md/lg/etc.)
 * by design — the schema type is `cssInlineStyleValueSchema`
 * (z.union([themeStringSchema, z.number()])) rather than a `responsiveValueSchema`
 * wrapper. Responsive padding/outline/gap should use the dedicated element-level
 * fields (which DO support `responsiveStringSchema`), not `wrapperStyle`.
 */
function sanitizeWrapperStyle(value: unknown): CSSProperties {
  if (!value || typeof value !== "object") return {};
  const style: CSSProperties = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const resolved = lowerThemeStringToCss(raw);
    if (resolved !== undefined) {
      // Translate peblor property names to CSS — bgBlur lives in wrapperStyle
      // on some presets (e.g. preset-demo-nav-header sidebar-panel) and must
      // become backdropFilter, otherwise the browser ignores it as an unknown
      // CSS property.
      const cssKey = key === "bgBlur" ? "backdropFilter" : key;
      (style as Record<string, string | number>)[cssKey] = resolved;
    }
  }
  return style;
}

function computeVisualStyle(
  layout: Partial<ElementLayout> | ElementLayout | undefined
): CSSProperties {
  if (!layout) return {};
  const record = layout as Record<string, unknown>;
  const webkitBackdrop = record.WebkitBackdropFilter;
  // visuallyHidden applies the sr-only clip pattern and wins over display:none so the element
  // stays in the a11y tree. hidden (display:none) is still emitted when visuallyHidden is false/absent.
  if (layout.visuallyHidden) {
    return {
      ...SR_ONLY_STYLE,
      ...sanitizeWrapperStyle(layout.wrapperStyle),
    };
  }
  return {
    ...(layout.hidden ? { display: "none" } : {}),
    ...(layout.opacity !== undefined ? { opacity: layout.opacity } : {}),
    ...(layout.blendMode
      ? { mixBlendMode: layout.blendMode as CSSProperties["mixBlendMode"] }
      : {}),
    ...(layout.scroll ? { overflow: layout.scroll } : {}),
    ...(layout.scrollX ? { overflowX: layout.scrollX as CSSProperties["overflowX"] } : {}),
    ...(layout.scrollY ? { overflowY: layout.scrollY as CSSProperties["overflowY"] } : {}),
    ...(layout.boxShadow ? { boxShadow: layout.boxShadow } : {}),
    ...(layout.filter ? { filter: layout.filter } : {}),
    ...(layout.bgBlur ? { backdropFilter: layout.bgBlur } : {}),
    ...(layout.clipShape ? { clipPath: layout.clipShape } : {}),
    // Responsive shapes (tuples like ["4/3","16/9"], tier maps, container maps) are not
    // resolved here — element-specific renderers apply breakpoint resolution. Only scalar
    // string/number values are emitted.
    ...(typeof layout.aspectRatio === "number"
      ? { aspectRatio: String(layout.aspectRatio) }
      : typeof layout.aspectRatio === "string"
        ? { aspectRatio: layout.aspectRatio }
        : {}),
    ...(layout.transformOrigin ? { transformOrigin: layout.transformOrigin } : {}),
    ...(layout.isolation ? { isolation: layout.isolation as CSSProperties["isolation"] } : {}),
    ...(layout.mask ? { maskImage: layout.mask, WebkitMaskImage: layout.mask } : {}),
    ...(layout.scrollMarginTop != null
      ? {
          scrollMarginTop:
            typeof layout.scrollMarginTop === "number"
              ? `${layout.scrollMarginTop}px`
              : layout.scrollMarginTop,
        }
      : {}),
    ...(layout.contentVisibility
      ? { contentVisibility: layout.contentVisibility as CSSProperties["contentVisibility"] }
      : {}),
    ...(layout.contain ? { contain: layout.contain as CSSProperties["contain"] } : {}),
    ...(layout.textShadow ? { textShadow: layout.textShadow } : {}),
    ...(layout.whiteSpace ? { whiteSpace: layout.whiteSpace } : {}),
    ...(layout.textDecoration ? { textDecoration: layout.textDecoration } : {}),
    ...(layout.textTransform ? { textTransform: layout.textTransform } : {}),
    ...(typeof webkitBackdrop === "string"
      ? { WebkitBackdropFilter: webkitBackdrop }
      : layout.bgBlur
        ? { WebkitBackdropFilter: layout.bgBlur }
        : {}),
    ...(layout.border ? { border: layout.border as string } : {}),
    ...(layout.borderTop ? { borderTop: layout.borderTop as string } : {}),
    ...(layout.borderRight ? { borderRight: layout.borderRight as string } : {}),
    ...(layout.borderBottom ? { borderBottom: layout.borderBottom as string } : {}),
    ...(layout.borderLeft ? { borderLeft: layout.borderLeft as string } : {}),
    ...(layout.interaction
      ? { pointerEvents: layout.interaction as CSSProperties["pointerEvents"] }
      : {}),
    ...(layout.selectable ? { userSelect: layout.selectable as CSSProperties["userSelect"] } : {}),
    ...(layout.outline ? { outline: layout.outline as string } : {}),
    ...(layout.transform ? { transform: layout.transform } : {}),
    ...(layout.willChange ? { willChange: layout.willChange } : {}),
    ...sanitizeWrapperStyle(layout.wrapperStyle),
  };
}

const LAYOUT_STYLE_HANDLERS: Record<string, (resolved: ResolvedElementLayout) => CSSProperties> = {
  default: (resolved) => ({
    ...(resolved.fixed ? computeFixedStyle(resolved) : computePositioningStyle(resolved)),
    ...computeSizingStyle(resolved),
  }),
};

export function getElementLayoutStyle(
  layout: Partial<ElementLayout> | ElementLayout | undefined,
  isMobile?: boolean
): CSSProperties {
  const resolved = normalizeLayoutInput(layout, isMobile);
  if (!resolved) return {};
  const handler = LAYOUT_STYLE_HANDLERS.default ?? (() => ({}));
  const figmaConstraintStyle = resolveConstraintStyle(
    (layout as Partial<ElementLayout> | undefined)?.figmaConstraints ?? undefined
  );
  return {
    ...handler(resolved),
    ...computeVisualStyle(layout),
    ...figmaConstraintStyle,
  };
}

// ── Responsive layout CSS emission (stage 3 — shared between server and client) ────

/**
 * Layout keys whose raw responsive values can be emitted as CSS with 1:1 property mapping.
 *
 * Props intentionally excluded (handled differently, or deferred to follow-up):
 *   - gap / align / alignY / textAlign     → require per-tier translation logic
 *   - aspectRatio                          → ratio-pair semantics, not plain CSS values
 *   - level                                → maps to a typography class
 *   - elementOrder / hidden                → not style properties
 *   - ThemeString-valued props             → must go through lowerThemeStringToCss first
 *   - constraints / objectFit              → complex object/enum translation
 */
export const RESPONSIVE_LAYOUT_CSS_KEYS: readonly string[] = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "borderRadius",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "margin",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingBlock",
  "paddingBlockStart",
  "paddingBlockEnd",
  "paddingInline",
  "paddingInlineStart",
  "paddingInlineEnd",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "outline",
  "outlineOffset",
  "outlineWidth",
  "gap",
  "rowGap",
  "columnGap",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "flexBasis",
];

/**
 * Extract responsive (tier-map / container-map) layout values from a raw element
 * record. Returns a style map suitable for merging and passing to `buildResponsiveStyle`.
 *
 * Only includes values whose raw form is an object or array (i.e. not a scalar).
 * Width/height values of "hug" are translated to "fit-content" per tier.
 */
export function extractElementResponsiveLayoutStyles(
  element: Record<string, unknown>
): Record<string, unknown> {
  const styles: Record<string, unknown> = {};
  for (const key of RESPONSIVE_LAYOUT_CSS_KEYS) {
    const v = element[key];
    if (v !== undefined && v !== null && typeof v === "object") {
      // For width/height, resolve "hug" → "fit-content" per tier
      if ((key === "width" || key === "height") && !Array.isArray(v)) {
        const resolved: Record<string, unknown> = { ...(v as Record<string, unknown>) };
        for (const [tier, val] of Object.entries(resolved)) {
          if (typeof val === "string" && val.trim() === "hug") {
            resolved[tier] = "fit-content";
          }
        }
        styles[key] = resolved;
      } else {
        styles[key] = v;
      }
    }
  }
  return styles;
}

/**
 * Identify which of the standard responsive layout keys have tier-map / container-map
 * values in the given raw element record. Returns the subset of keys that carry
 * responsive values.
 */
export function getResponsiveLayoutKeySet(element: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const key of RESPONSIVE_LAYOUT_CSS_KEYS) {
    const v = element[key];
    if (v !== undefined && v !== null && typeof v === "object") {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Strip a set of keys from a props object. Used by server element renderers to
 * suppress inline layout values for props that are emitted via responsive CSS.
 */
export function stripResponsiveLayoutKeys<T extends Record<string, unknown>>(
  input: T,
  keys: readonly string[] | undefined
): T {
  if (!keys || keys.length === 0) return input;
  const result = { ...input };
  for (const key of keys) {
    if (key in result) {
      delete result[key as keyof T];
    }
  }
  return result;
}
