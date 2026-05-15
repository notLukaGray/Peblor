import type { CSSProperties } from "react";

/** Mirrors `elementLayoutSchema` — raw Figma constraint payload for absolute layout. */
export type FigmaConstraintsInput = {
  horizontal?: "LEFT" | "RIGHT" | "LEFT_RIGHT" | "CENTER" | "SCALE";
  vertical?: "TOP" | "BOTTOM" | "TOP_BOTTOM" | "CENTER" | "SCALE";
  x?: number;
  y?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;
  parentWidth?: number;
  parentHeight?: number;
};

function px(n: number): string {
  return `${Math.round(n)}px`;
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${parseFloat(n.toFixed(4))}%`;
}

/**
 * Maps exported `figmaConstraints` to absolute-position CSS. Intended to be merged
 * after `wrapperStyle` so inset/size/position values win over baked JSON styles.
 */
export function resolveConstraintStyle(
  figmaConstraints: FigmaConstraintsInput | undefined
): CSSProperties {
  if (!figmaConstraints) return {};

  const c = figmaConstraints;
  const hc = c.horizontal ?? "LEFT";
  const vc = c.vertical ?? "TOP";

  const style: CSSProperties = {
    position: "absolute",
  };

  const transforms: string[] = [];

  // --- Horizontal ---
  if (hc === "LEFT") {
    if (c.x != null && Number.isFinite(c.x)) style.left = px(c.x);
  } else if (hc === "RIGHT") {
    const r =
      c.right != null && Number.isFinite(c.right)
        ? c.right
        : c.parentWidth != null &&
            c.x != null &&
            c.width != null &&
            Number.isFinite(c.parentWidth) &&
            Number.isFinite(c.x) &&
            Number.isFinite(c.width)
          ? c.parentWidth - c.x - c.width
          : undefined;
    if (r != null && Number.isFinite(r)) style.right = px(r);
  } else if (hc === "LEFT_RIGHT") {
    if (c.x != null && Number.isFinite(c.x)) style.left = px(c.x);
    const r =
      c.right != null && Number.isFinite(c.right)
        ? c.right
        : c.parentWidth != null &&
            c.x != null &&
            c.width != null &&
            Number.isFinite(c.parentWidth) &&
            Number.isFinite(c.x) &&
            Number.isFinite(c.width)
          ? c.parentWidth - c.x - c.width
          : undefined;
    if (r != null && Number.isFinite(r)) style.right = px(r);
    style.width = "auto";
  } else if (hc === "CENTER") {
    style.left = "50%";
    transforms.push("translateX(-50%)");
    if (c.width != null && Number.isFinite(c.width)) style.width = px(c.width);
  } else if (hc === "SCALE") {
    const pw = c.parentWidth;
    if (pw != null && Number.isFinite(pw) && pw > 0 && c.x != null && Number.isFinite(c.x)) {
      style.left = pct((c.x / pw) * 100);
      const rDist =
        c.right != null && Number.isFinite(c.right)
          ? c.right
          : c.width != null && Number.isFinite(c.width)
            ? pw - c.x - c.width
            : undefined;
      if (rDist != null && Number.isFinite(rDist)) {
        style.right = pct((rDist / pw) * 100);
      }
    }
    style.width = "auto";
  }

  // --- Vertical ---
  if (vc === "TOP") {
    if (c.y != null && Number.isFinite(c.y)) style.top = px(c.y);
  } else if (vc === "BOTTOM") {
    const b =
      c.bottom != null && Number.isFinite(c.bottom)
        ? c.bottom
        : c.parentHeight != null &&
            c.y != null &&
            c.height != null &&
            Number.isFinite(c.parentHeight) &&
            Number.isFinite(c.y) &&
            Number.isFinite(c.height)
          ? c.parentHeight - c.y - c.height
          : undefined;
    if (b != null && Number.isFinite(b)) style.bottom = px(b);
  } else if (vc === "TOP_BOTTOM") {
    if (c.y != null && Number.isFinite(c.y)) style.top = px(c.y);
    const b =
      c.bottom != null && Number.isFinite(c.bottom)
        ? c.bottom
        : c.parentHeight != null &&
            c.y != null &&
            c.height != null &&
            Number.isFinite(c.parentHeight) &&
            Number.isFinite(c.y) &&
            Number.isFinite(c.height)
          ? c.parentHeight - c.y - c.height
          : undefined;
    if (b != null && Number.isFinite(b)) style.bottom = px(b);
    style.height = "auto";
  } else if (vc === "CENTER") {
    style.top = "50%";
    transforms.push("translateY(-50%)");
    if (c.height != null && Number.isFinite(c.height)) style.height = px(c.height);
  } else if (vc === "SCALE") {
    const ph = c.parentHeight;
    if (ph != null && Number.isFinite(ph) && ph > 0 && c.y != null && Number.isFinite(c.y)) {
      style.top = pct((c.y / ph) * 100);
      const bDist =
        c.bottom != null && Number.isFinite(c.bottom)
          ? c.bottom
          : c.height != null && Number.isFinite(c.height)
            ? ph - c.y - c.height
            : undefined;
      if (bDist != null && Number.isFinite(bDist)) {
        style.bottom = pct((bDist / ph) * 100);
      }
    }
    style.height = "auto";
  }

  if (transforms.length > 0) {
    style.transform = transforms.join(" ");
  }

  // Fixed box on LEFT/TOP (etc.) when not stretch modes
  if (
    hc !== "LEFT_RIGHT" &&
    hc !== "SCALE" &&
    c.width != null &&
    Number.isFinite(c.width) &&
    style.width === undefined
  ) {
    style.width = px(c.width);
  }
  if (
    vc !== "TOP_BOTTOM" &&
    vc !== "SCALE" &&
    c.height != null &&
    Number.isFinite(c.height) &&
    style.height === undefined
  ) {
    style.height = px(c.height);
  }

  return style;
}
