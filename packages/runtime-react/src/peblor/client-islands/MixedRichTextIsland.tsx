"use client";

import type { CSSProperties, ReactNode } from "react";
import type { MotionTiming } from "@pb/contracts/types";
import { getElementLayoutStyle } from "@pb/core/layout";
import { ElementEntranceWrapper } from "@/peblor/elements/Shared/ElementEntranceWrapper";

export type MixedRichTextIslandProps = {
  width?: string | [string, string];
  height?: string | [string, string];
  align?:
    | "center"
    | "left"
    | "right"
    | "full"
    | ["center" | "left" | "right" | "full", "center" | "left" | "right" | "full"];
  textAlign?: string | [string, string];
  marginTop?: string | [string, string];
  marginBottom?: string | [string, string];
  marginLeft?: string | [string, string];
  marginRight?: string | [string, string];
  wordWrap?: boolean;
  motionTiming?: MotionTiming;
  reduceMotion?: boolean;
  children: ReactNode;
};

export function MixedRichTextIsland({
  width,
  height,
  align,
  textAlign,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  wordWrap = true,
  motionTiming,
  reduceMotion,
  children,
}: MixedRichTextIslandProps) {
  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle({
      width,
      height,
      align,
      textAlign: textAlign as "left" | "right" | "center" | "justify" | undefined,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
    }),
  };
  const multilineAlign = textAlign ?? align;
  if (multilineAlign)
    blockStyle.textAlign = multilineAlign as "left" | "right" | "center" | "justify";
  blockStyle.whiteSpace = wordWrap ? "normal" : "nowrap";
  if (!wordWrap) blockStyle.overflow = "hidden";
  blockStyle.textOverflow = wordWrap ? undefined : "ellipsis";

  return (
    <ElementEntranceWrapper motionTiming={motionTiming} reduceMotion={reduceMotion}>
      <div className="shrink-0" style={blockStyle}>
        {children}
      </div>
    </ElementEntranceWrapper>
  );
}
