/**
 * Extracts universal layout props (size, opacity, rotation, radius, blend mode,
 * visibility, overflow, border) from any SceneNode.
 */

import type { LayoutProps } from "../types/peblor";
import { figmaRadiusToCSS, toPx } from "../utils/css";
import { extractBorderProps } from "./layout-border";
import { resolveNumericVar, type BoundVarsMap } from "./layout-var-resolve";

/**
 * Extracts universal layout props from any SceneNode.
 * Width, height, opacity, rotation, cornerRadius, blend mode, etc.
 */
export function extractLayoutProps(node: SceneNode): LayoutProps {
  const props: LayoutProps = {};

  // Collect Figma variable bindings for numeric properties
  const boundVars = (node as unknown as { boundVariables?: BoundVarsMap }).boundVariables;

  // Sizing mode hints — when HUG or FILL, we skip fixed px values for that axis
  const sizingH = (node as unknown as { layoutSizingHorizontal?: string }).layoutSizingHorizontal;
  const sizingV = (node as unknown as { layoutSizingVertical?: string }).layoutSizingVertical;

  const parentLayoutMode = readParentLayoutMode(node);

  // Dimensions — map Figma sizing modes to CSS equivalents.
  // FIXED → explicit px (or variable).
  // HUG   → no width emitted (natural content size; group nodes handle this via extractAutoLayoutProps).
  // FILL  → "100%" (stretch to parent — same as extractAutoLayoutProps does for group nodes).
  //          For text nodes this is critical: without an explicit width the renderer has no width
  //          signal and the text will not wrap at the correct container width.
  if ("width" in node) {
    if (sizingH === "FILL") {
      if (parentLayoutMode === "HORIZONTAL") {
        props.wrapperStyle = {
          ...(props.wrapperStyle ?? {}),
          flex: "1 1 0%",
          minWidth: 0,
        };
      } else {
        props.width = "100%";
      }
    } else if (sizingH !== "HUG") {
      const rw = resolveNumericVar(boundVars, "width", node.width, "px", node);
      // Guard against NaN (e.g. empty GROUP nodes) — "NaNpx" breaks layout.
      if (typeof rw === "number") {
        if (Number.isFinite(rw)) props.width = toPx(rw);
      } else {
        props.width = rw;
      }
    }
  }
  if ("height" in node) {
    if (sizingV === "FILL") {
      if (parentLayoutMode === "VERTICAL") {
        props.wrapperStyle = {
          ...(props.wrapperStyle ?? {}),
          flex: "1 1 0%",
          minHeight: 0,
        };
      } else {
        props.height = "100%";
      }
    } else if (sizingV !== "HUG") {
      const rh = resolveNumericVar(boundVars, "height", node.height, "px", node);
      // Guard against NaN (e.g. empty GROUP nodes) — "NaNpx" breaks layout.
      if (typeof rh === "number") {
        if (Number.isFinite(rh)) props.height = toPx(rh);
      } else {
        props.height = rh;
      }
    }
  }

  // Opacity
  if ("opacity" in node && typeof node.opacity === "number" && node.opacity < 1) {
    props.opacity = parseFloat(node.opacity.toFixed(3));
  }

  // Rotation (Figma rotation is in degrees, clockwise)
  if ("rotation" in node && typeof node.rotation === "number" && node.rotation !== 0) {
    props.rotate = parseFloat(node.rotation.toFixed(2));
  }

  // Corner radius (only on applicable node types)
  if (
    node.type === "FRAME" ||
    node.type === "RECTANGLE" ||
    node.type === "COMPONENT" ||
    node.type === "INSTANCE"
  ) {
    const radius = node.cornerRadius;
    if (radius !== 0) {
      if (typeof radius === "number") {
        const rr = resolveNumericVar(boundVars, "cornerRadius", radius, "px", node);
        props.borderRadius = typeof rr === "number" ? toPx(rr) : rr;
      } else {
        props.borderRadius = figmaRadiusToCSS(
          node as RectangleNode | FrameNode | ComponentNode | InstanceNode
        );
      }
    }
  }

  // Blend mode
  if (
    "blendMode" in node &&
    node.blendMode &&
    node.blendMode !== "NORMAL" &&
    node.blendMode !== "PASS_THROUGH"
  ) {
    props.blendMode = figmaBlendModeToCSS(node.blendMode);
  }

  // Visibility
  if ("visible" in node && node.visible === false) {
    props.hidden = true;
  }

  // Overflow (frames)
  if ("clipsContent" in node) {
    props.overflow = node.clipsContent ? "hidden" : "visible";
  }

  // Border / stroke — merged into wrapperStyle for element-level nodes.
  const borders = extractBorderProps(node);
  if (Object.keys(borders).length > 0) {
    if (!props.wrapperStyle) props.wrapperStyle = {};
    if (borders.border) props.wrapperStyle["border"] = borders.border;
    if (borders.borderTop) props.wrapperStyle["borderTop"] = borders.borderTop;
    if (borders.borderRight) props.wrapperStyle["borderRight"] = borders.borderRight;
    if (borders.borderBottom) props.wrapperStyle["borderBottom"] = borders.borderBottom;
    if (borders.borderLeft) props.wrapperStyle["borderLeft"] = borders.borderLeft;
    if (borders.outline) props.wrapperStyle["outline"] = borders.outline;
  }

  return props;
}

type ParentLayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
type ChildAutoLayoutOverrides = Pick<LayoutProps, "align" | "alignY" | "wrapperStyle">;

/**
 * Extracts child-level auto-layout overrides in peblor schema fields.
 * Figma `layoutAlign` is a cross-axis child override, so the mapping depends
 * on the parent auto-layout direction.
 */
export function extractChildAutoLayoutOverrides(
  node: SceneNode
): ChildAutoLayoutOverrides | undefined {
  const layoutAlign = (node as { layoutAlign?: string }).layoutAlign;
  if (!layoutAlign || layoutAlign === "INHERIT" || layoutAlign === "BASELINE") return undefined;

  const parentLayoutMode = readParentLayoutMode(node);
  if (parentLayoutMode !== "VERTICAL" && parentLayoutMode !== "HORIZONTAL") return undefined;

  if (layoutAlign === "STRETCH") {
    // Preserve Figma stretch behavior without relying on unsupported
    // top-level alignSelf in the element schema.
    return { wrapperStyle: { alignSelf: "stretch" } };
  }

  if (parentLayoutMode === "VERTICAL") {
    if (layoutAlign === "MIN") return { align: "left" };
    if (layoutAlign === "CENTER") return { align: "center" };
    if (layoutAlign === "MAX") return { align: "right" };
    return undefined;
  }

  if (layoutAlign === "MIN") return { alignY: "top" };
  if (layoutAlign === "CENTER") return { alignY: "center" };
  if (layoutAlign === "MAX") return { alignY: "bottom" };
  return undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function figmaBlendModeToCSS(mode: BlendMode): string {
  const map: Partial<Record<BlendMode, string>> = {
    MULTIPLY: "multiply",
    SCREEN: "screen",
    OVERLAY: "overlay",
    DARKEN: "darken",
    LIGHTEN: "lighten",
    COLOR_DODGE: "color-dodge",
    COLOR_BURN: "color-burn",
    HARD_LIGHT: "hard-light",
    SOFT_LIGHT: "soft-light",
    DIFFERENCE: "difference",
    EXCLUSION: "exclusion",
    HUE: "hue",
    SATURATION: "saturation",
    COLOR: "color",
    LUMINOSITY: "luminosity",
  };
  return map[mode] ?? "normal";
}

function readParentLayoutMode(node: SceneNode): ParentLayoutMode {
  const parent = node.parent;
  if (
    !parent ||
    (parent.type !== "FRAME" && parent.type !== "COMPONENT" && parent.type !== "INSTANCE")
  ) {
    return "NONE";
  }
  return parent.layoutMode;
}
