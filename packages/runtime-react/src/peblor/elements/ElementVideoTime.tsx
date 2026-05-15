"use client";

import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/peblor/core/peblor-schemas";
import { getElementLayoutStyle } from "@pb/core/layout";
import { getBodyTypographyClass } from "@pb/core/typography";
import { useVideoControlContext } from "./ElementVideo/VideoControlContext";

type Props = Extract<ElementBlock, { type: "elementVideoTime" }>;

const DEFAULT_VIDEO_TIME_LEVEL: ElementBodyVariant = 1;

function formatTime(seconds: number, _format?: string): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ElementVideoTime({
  format: _format,
  level = DEFAULT_VIDEO_TIME_LEVEL,
  wordWrap = false,
  align,
  textAlign,
  width,
  height,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  style,
  ...rest
}: Props) {
  const videoCtx = useVideoControlContext();
  const resolvedLevel = (Array.isArray(level) ? level[0] : level) ?? DEFAULT_VIDEO_TIME_LEVEL;
  const typographyClass = getBodyTypographyClass(resolvedLevel as ElementBodyVariant);

  const current = videoCtx?.currentTime ?? 0;
  const duration = videoCtx?.duration ?? 0;
  const text = `${formatTime(current)} / ${formatTime(duration)}`;

  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle({
      width,
      height,
      align,
      textAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      ...rest,
    }),
  };
  const multilineAlign = textAlign ?? align;
  if (multilineAlign)
    blockStyle.textAlign = multilineAlign as "left" | "right" | "center" | "justify";
  blockStyle.whiteSpace = wordWrap ? "normal" : "nowrap";
  if (!wordWrap) blockStyle.overflow = "hidden";
  blockStyle.textOverflow = wordWrap ? undefined : "ellipsis";

  const styleOverride = (style as CSSProperties) ?? {};

  return (
    <div className="shrink-0 tabular-nums" style={blockStyle}>
      <span
        className={`m-0 block ${typographyClass}`}
        style={Object.keys(styleOverride).length > 0 ? styleOverride : undefined}
        suppressHydrationWarning
      >
        {text}
      </span>
    </div>
  );
}
