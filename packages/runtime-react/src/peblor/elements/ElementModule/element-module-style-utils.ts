import type { CSSProperties } from "react";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { ElementLayout, SectionEffect } from "@pb/contracts/peblor/core/peblor-schemas";

// Border-gradient overlay helpers live in a shared module so the mask string isn't duplicated
// (C-22). Re-exported here for the existing import sites.
export {
  type BorderGradient,
  buildBorderGradientOverlayStyle,
} from "@/peblor/elements/Shared/border-gradient-overlay";

const ALIGN_TO_ALIGN_SELF: Record<"left" | "center" | "right", CSSProperties["alignSelf"]> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export function lightenHexColor(hex: string, amount: number): string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return hex;
  const matchedHex = match[1];
  if (!matchedHex) return hex;
  const int = parseInt(matchedHex, 16);
  const r = Math.min(255, ((int >> 16) & 0xff) + amount);
  const g = Math.min(255, ((int >> 8) & 0xff) + amount);
  const b = Math.min(255, (int & 0xff) + amount);
  const toHex = (value: number) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getContainerWrapperStyle(base: CSSProperties): CSSProperties {
  const background = base.background;
  if (!background || typeof background !== "string") return base;
  return {
    ...base,
    background: lightenHexColor(background, 10),
  };
}

export function coerceSectionEffects(value: unknown): SectionEffect[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const entries = value.filter(
    (entry): entry is SectionEffect =>
      !!entry &&
      typeof entry === "object" &&
      "type" in entry &&
      typeof (entry as { type?: unknown }).type === "string"
  );
  return entries.length > 0 ? entries : undefined;
}

export function getChildWrapperLayoutStyle(
  layout: Pick<ElementLayout, "selfAlign">,
  isMobile: boolean
): CSSProperties {
  const align = resolveResponsiveValue<"left" | "center" | "right">(
    layout.selfAlign as
      | "left"
      | "center"
      | "right"
      | { base?: "left" | "center" | "right"; md?: "left" | "center" | "right" }
      | undefined,
    isMobile
  );
  if (align !== "left" && align !== "center" && align !== "right") return {};
  const alignSelf = ALIGN_TO_ALIGN_SELF[align];
  return alignSelf ? { alignSelf } : {};
}

export function hasStyleEntries(style: CSSProperties): boolean {
  return Object.keys(style).length > 0;
}

export function shouldRenderChildWrapper(options: {
  hasHandler: boolean;
  layoutChildren: boolean;
  style: CSSProperties;
}): boolean {
  if (options.hasHandler || options.layoutChildren) return true;
  return hasStyleEntries(options.style);
}
