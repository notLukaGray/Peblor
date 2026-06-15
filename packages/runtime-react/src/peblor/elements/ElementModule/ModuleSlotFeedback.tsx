"use client";

import type { CSSProperties } from "react";
import type { CssInlineStyle, ElementBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { getFeedbackJustifyContent, getFeedbackPadding } from "@pb/core/modules";
import type { ModuleSlotConfig } from "./types";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";

export type ModuleSlotFeedbackProps = {
  slot: ModuleSlotConfig;
  feedback: { type: string; at: number };
  feedbackMap: Record<string, string>;
  feedbackDurationMs?: number;
};

export function ModuleSlotFeedback({
  slot,
  feedback,
  feedbackMap,
  feedbackDurationMs = globals.uiVideoFeedbackDurationMs,
}: ModuleSlotFeedbackProps) {
  const elementKey = feedbackMap[feedback.type];
  if (!elementKey) return null;
  const section = slot.section;
  const def = section?.definitions?.[elementKey];
  if (!def || typeof def !== "object" || !("type" in def)) return null;
  const block = "id" in def && def.id ? def : { ...def, id: elementKey };
  const wrapperStyle = (block as ElementBlock & { wrapperStyle?: CssInlineStyle }).wrapperStyle;
  const feedbackChrome = slot.feedbackChromeStyle;
  const mergedStyle: CSSProperties = {
    ...(lowerThemeStyleObject(feedbackChrome) as CSSProperties),
    ...(lowerThemeStyleObject(wrapperStyle) as CSSProperties),
  };
  const justifyContent = getFeedbackJustifyContent(feedback.type);
  const padding = getFeedbackPadding(feedback.type);

  return (
    <div
      style={{
        position: (slot.position as CSSProperties["position"]) ?? "absolute",
        ...(slot.inset ? { inset: slot.inset } : {}),
        ...(slot.top ? { top: slot.top } : {}),
        ...(slot.left ? { left: slot.left } : {}),
        ...(slot.right ? { right: slot.right } : {}),
        ...(slot.bottom ? { bottom: slot.bottom } : {}),
        ...(slot.zIndex != null ? { zIndex: slot.zIndex } : {}),
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent,
        padding,
        pointerEvents: "none",
        animation: `touch-feedback-flash ${feedbackDurationMs}ms ease forwards`,
        ...(lowerThemeStyleObject(slot.style) as CSSProperties),
      }}
      aria-hidden="false"
    >
      <div className="shrink-0 flex items-center justify-center" style={mergedStyle}>
        <ElementRenderer key={elementKey} block={block as ElementBlock} />
      </div>
    </div>
  );
}
