import { createElement, type CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import { getElementLayoutStyle, getLayoutRotateFlipStyle } from "@pb/core/layout";
import { getHeadingTypographyClass, resolveFontFamily } from "@pb/core/typography";
import { resolveThemeString } from "../../theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementHeading" }>;

function headingProps(
  level: 1 | 2 | 3 | 4 | 5 | 6 | undefined,
  semanticLevel?: 1 | 2 | 3 | 4 | 5 | 6
): { role: "heading"; "aria-level": number } {
  const ariaLevel = semanticLevel ?? level ?? 2;
  return { role: "heading", "aria-level": ariaLevel };
}

function renderInlineText(text: string) {
  return text;
}

export function ServerElementHeading({
  level,
  semanticLevel,
  text,
  letterSpacing,
  lineSpacing,
  lineHeight,
  color,
  textFill,
  fontFamily,
  fontSize,
  fontWeight,
  align,
  textAlign,
  width,
  height,
  constraints,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  wordWrap = true,
  textShadow,
  textDecoration,
  textTransform,
  whiteSpace,
  rotate,
  flipHorizontal,
  flipVertical,
  ...rest
}: Props) {
  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle({
      width,
      height,
      constraints,
      align,
      textAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      ...rest,
    }),
    ...getLayoutRotateFlipStyle({ rotate, flipHorizontal, flipVertical }),
  };
  applyPbDefaultTextAlign(blockStyle, align, textAlign);

  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const textStyle: CSSProperties = {
    letterSpacing,
    ...(lineSpacing !== undefined ? { lineHeight: lineSpacing } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
    ...(textShadow !== undefined ? { textShadow } : {}),
    ...(textDecoration !== undefined ? { textDecoration } : {}),
    ...(textTransform !== undefined ? { textTransform } : {}),
    whiteSpace: whiteSpace ?? (wordWrap ? "pre-line" : "nowrap"),
    overflowWrap: wordWrap ? "break-word" : "normal",
    wordBreak: wordWrap ? "break-word" : "normal",
    ...(!wordWrap && whiteSpace == null ? { overflow: "hidden", textOverflow: "ellipsis" } : {}),
  };

  const resolvedTextFill = resolveThemeString(textFill?.value, "light");
  const resolvedColor = resolveThemeString(color, "light");
  if (textFill?.type === "gradient" && resolvedTextFill) {
    textStyle.backgroundImage = resolvedTextFill;
    textStyle.backgroundClip = "text";
    textStyle.WebkitBackgroundClip = "text";
    textStyle.color = "transparent";
    (textStyle as Record<string, unknown>).WebkitTextFillColor = "transparent";
  } else if (textFill?.type === "color" && resolvedTextFill) {
    textStyle.color = resolvedTextFill;
  } else if (resolvedColor !== undefined) {
    textStyle.color = resolvedColor;
  }

  return (
    <div className="shrink-0 max-w-full" style={blockStyle}>
      {createElement(
        "div",
        {
          className: `m-0 ${getHeadingTypographyClass(level)}`,
          style: textStyle,
          ...headingProps(level, semanticLevel),
        },
        renderInlineText(text)
      )}
    </div>
  );
}
