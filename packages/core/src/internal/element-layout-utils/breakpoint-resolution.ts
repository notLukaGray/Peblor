import type { ElementBlock } from "@pb/contracts/types";
import { resolveResponsiveValue } from "../../lib/responsive-value";

const LAYOUT_KEYS = [
  "display",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "flexWrap",
  "flex",
  "overflow",
  "width",
  "height",
  "borderRadius",
  "align",
  "alignY",
  "textAlign",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "gap",
  "rowGap",
  "columnGap",
  "length",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "level",
  "activeScale",
  "inactiveScale",
  "activeOpacity",
  "inactiveOpacity",
] as const;

function valueNeedsResolution(value: unknown): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.length === 2;
  if (value !== null && typeof value === "object") return "mobile" in value || "desktop" in value;
  return false;
}

export function resolveElementBlockForBreakpoint(
  block: ElementBlock,
  isMobile: boolean
): ElementBlock {
  const rec = block as Record<string, unknown>;
  const needsCopy =
    LAYOUT_KEYS.some((key) => key in block && valueNeedsResolution(rec[key])) ||
    valueNeedsResolution(rec.constraints) ||
    valueNeedsResolution(rec.objectFit);
  if (!needsCopy) return block;

  const resolved = { ...block };
  for (const key of LAYOUT_KEYS) {
    if (key in block) {
      (resolved as Record<string, unknown>)[key] = resolveResponsiveValue(rec[key], isMobile);
    }
  }
  const rawConstraints = rec.constraints;
  if (rawConstraints !== undefined) {
    (resolved as Record<string, unknown>).constraints = Array.isArray(rawConstraints)
      ? resolveResponsiveValue(rawConstraints, isMobile)
      : rawConstraints;
  }
  const rawObjectFit = rec.objectFit;
  if (rawObjectFit !== undefined) {
    (resolved as Record<string, unknown>).objectFit = Array.isArray(rawObjectFit)
      ? resolveResponsiveValue(rawObjectFit, isMobile)
      : rawObjectFit;
  }
  return resolved;
}
