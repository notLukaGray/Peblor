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
import type { ModuleSlotConfig } from "./module-slot-types";

/**
 * Honor `elementOrder` for keys present in `definitions`, ignore stale keys, append keys that
 * were never listed (deterministic nested group / module resolution).
 * Accepts both flat string[] and responsive { mobile, desktop } shapes.
 */
export function reconcileElementOrderWithDefinitions(
  elementOrder: string[] | { mobile: string[]; desktop: string[] } | undefined,
  definitions: Record<string, unknown>
): string[] {
  const definitionKeys = Object.keys(definitions);
  const resolvedOrder: string[] | undefined =
    elementOrder == null
      ? undefined
      : Array.isArray(elementOrder)
        ? elementOrder
        : (elementOrder.desktop ?? elementOrder.mobile);
  const orderedFromJson = (resolvedOrder ?? definitionKeys).filter((key) => key in definitions);
  const orderedSet = new Set(orderedFromJson);
  return [...orderedFromJson, ...definitionKeys.filter((key) => !orderedSet.has(key))];
}

/** Resolves slot section definitions into ElementBlocks. Shared across video, image, model3d modules. */
export function resolveSlotElements(slot: ModuleSlotConfig): ElementBlock[] {
  const section = slot.section;
  if (!section?.definitions) return [];
  const definitions = section.definitions as Record<string, unknown>;
  const order = reconcileElementOrderWithDefinitions(section.elementOrder, definitions);
  const idCounts = new Map<string, number>();
  return order
    .map((key) => {
      const el = section.definitions![key] as unknown;
      if (!el || typeof el !== "object" || !("type" in el) || el.type === "cssGradient")
        return null;
      const candidate = el as ElementBlock & { id?: unknown };
      const baseId =
        typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : key;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...candidate, id: uniqueId } as ElementBlock;
    })
    .filter((x): x is ElementBlock => x != null);
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
