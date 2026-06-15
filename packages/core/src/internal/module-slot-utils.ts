/**
 * Pure module-slot helpers. No React, no DOM (except getRegionFromClientX which takes el for rect).
 * Used by ModuleSlotSection and useSlotGestures; unit-testable.
 */

import type React from "react";
import { getPbContentGuidelines } from "./adapters/host-config";
import {
  coalesceEmptyString,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  resolveFrameColumnGapCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
} from "./element-layout-utils";
import { scaleSpaceShorthandForDensity } from "@pb/contracts/peblor/core/page-density";
import type { ElementBlock } from "@pb/contracts/types";
import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";
import type { DefinitionsMap } from "./peblor-expand/section-shapes";
import type { ModuleSlotConfig } from "./module-slot-types";
import { resolveElements } from "./peblor-expand/element-resolution";

/**
 * Honor `elementOrder` for keys present in `definitions`, ignore stale keys, append keys that
 * were never listed (deterministic nested group / module resolution).
 * Accepts both flat string[] and responsive tier-map shapes.
 */
export function reconcileElementOrderWithDefinitions(
  elementOrder: string[] | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: string[] } | undefined,
  definitions: Record<string, unknown>
): string[] {
  const definitionKeys = Object.keys(definitions);
  const resolvedOrder: string[] | undefined =
    elementOrder == null
      ? undefined
      : Array.isArray(elementOrder)
        ? elementOrder
        : ((elementOrder as Record<string, string[] | undefined>).md ??
          (elementOrder as Record<string, string[] | undefined>).base);
  const orderedFromJson = (resolvedOrder ?? definitionKeys).filter((key) => key in definitions);
  const orderedSet = new Set(orderedFromJson);
  return [...orderedFromJson, ...definitionKeys.filter((key) => !orderedSet.has(key))];
}

/** Resolves slot section definitions into ElementBlocks. Shared across video, image, model3d modules. */
export function resolveSlotElements(slot: ModuleSlotConfig): ElementBlock[] {
  const section = slot.section;
  if (!section?.definitions) return [];
  const definitions = section.definitions as DefinitionsMap;
  const order = reconcileElementOrderWithDefinitions(section.elementOrder, definitions);
  // Filter out null/missing keys and cssGradient (private visual type) before resolving.
  // resolveElements throws on missing refs (K-13), so we sanitize the order first.
  const validOrder = order.filter((k) => {
    const d = definitions[k];
    return d != null && typeof d === "object" && "type" in d;
  });
  try {
    return resolveElements(validOrder, definitions).filter(
      (el) => (el as Record<string, unknown>).type !== "cssGradient"
    );
  } catch (err) {
    console.warn("[pb-core] Failed to resolve slot elements", err);
    return [];
  }
}

export type SlotRegion = "left" | "center" | "right";

/** Region from clientX relative to element width (thirds). */
export function getRegionFromClientX(clientX: number, el: HTMLElement): SlotRegion {
  const rect = el.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  if (x < 1 / 3) return "left";
  if (x > 2 / 3) return "right";
  return "center";
}

/** Justify-content for feedback overlay by feedback type. */
export function getFeedbackJustifyContent(
  feedbackType: string
): "flex-start" | "flex-end" | "center" {
  if (feedbackType === "seekBack") return "flex-start";
  if (feedbackType === "seekForward") return "flex-end";
  return "center";
}

/** Padding for feedback overlay by feedback type. */
export function getFeedbackPadding(feedbackType: string): string {
  if (feedbackType === "seekBack") return "0 0 0 15%";
  if (feedbackType === "seekForward") return "0 15% 0 0";
  return "0";
}

/** Infer feedback type for seek action from payload. */
export function inferSeekFeedbackType(
  payload: number | undefined
): "seekBack" | "seekForward" | undefined {
  if (payload == null) return undefined;
  return payload < 0 ? "seekBack" : "seekForward";
}

export type ModuleSlotBaseStyleParams = {
  slot: ModuleSlotConfig;
  useHugLayout: boolean;
  durationMs: number;
  easing: string;
  expandDurationMs: number;
  hasLayoutTransition: boolean;
};

/** Build base slot style (position, flex, transition). Caller merges visibility/cursor. */
export function getModuleSlotBaseStyle({
  slot,
  useHugLayout,
  durationMs,
  easing,
  expandDurationMs,
  hasLayoutTransition,
}: ModuleSlotBaseStyleParams): React.CSSProperties {
  const pbContentGuidelines = getPbContentGuidelines();
  const position = (slot.position as React.CSSProperties["position"]) ?? "absolute";
  const positionStyles: React.CSSProperties = {
    position,
    ...(slot.inset && !useHugLayout ? { inset: slot.inset } : {}),
    ...(slot.top ? { top: slot.top } : {}),
    ...(useHugLayout
      ? { left: "50%", right: "auto", transform: "translateX(-50%)", width: "fit-content" }
      : slot.left || slot.right
        ? {
            ...(slot.left ? { left: slot.left } : {}),
            ...(slot.right ? { right: slot.right } : {}),
          }
        : {}),
    ...(slot.bottom ? { bottom: slot.bottom } : {}),
    ...(slot.zIndex != null ? { zIndex: slot.zIndex } : {}),
  };
  const transitionParts = [
    `opacity ${durationMs}ms ${easing}`,
    hasLayoutTransition
      ? `left ${expandDurationMs}ms ${easing}, right ${expandDurationMs}ms ${easing}, transform ${expandDurationMs}ms ${easing}, width ${expandDurationMs}ms ${easing}`
      : "",
  ].filter(Boolean);
  const resolvedGap = resolveFrameGapCss(slot.gap);
  const resolvedRowGap = resolveFrameRowGapCss(
    slot.rowGap === undefined || slot.rowGap === null ? slot.rowGap : String(slot.rowGap)
  );
  const resolvedColGap = resolveFrameColumnGapCss(
    slot.columnGap === undefined || slot.columnGap === null
      ? slot.columnGap
      : String(slot.columnGap)
  );
  const slotPadding =
    slot.padding ?? scaleSpaceShorthandForDensity(pbContentGuidelines.framePaddingDefault);
  const resolvedFlexWrap =
    (coalesceEmptyString(slot.flexWrap) as React.CSSProperties["flexWrap"] | undefined) ??
    pbContentGuidelines.frameFlexWrapDefault;

  return {
    ...positionStyles,
    display: (slot.display as React.CSSProperties["display"]) ?? "flex",
    flexDirection:
      (coalesceEmptyString(slot.flexDirection) as React.CSSProperties["flexDirection"]) ??
      pbContentGuidelines.frameFlexDirectionDefault,
    alignItems: normalizeFlexAlignItemsValue(
      coalesceEmptyString(slot.alignItems) ?? pbContentGuidelines.frameAlignItemsDefault
    ),
    justifyContent: normalizeFlexJustifyContentValue(
      coalesceEmptyString(slot.justifyContent) ?? pbContentGuidelines.frameJustifyContentDefault
    ) as React.CSSProperties["justifyContent"],
    ...(resolvedGap != null ? { gap: resolvedGap } : {}),
    ...(resolvedRowGap != null ? { rowGap: resolvedRowGap } : {}),
    ...(resolvedColGap != null ? { columnGap: resolvedColGap } : {}),
    flexWrap: resolvedFlexWrap,
    ...(slotPadding != null && slotPadding !== "" ? { padding: slotPadding } : {}),
    transition: transitionParts.join(", "),
    ...(slot.style as React.CSSProperties),
  };
}
