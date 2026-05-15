import { createElement, type CSSProperties } from "react";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle, getLayoutRotateFlipStyle } from "@pb/core/layout";
import { getHeadingTypographyClass } from "@pb/core/typography";
import { useVariable } from "@/peblor/runtime/peblor-variable-store";
import { resolveFontFamily } from "@pb/core/typography";
import { resolveThemeString } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { InlineFormattedText } from "./Shared/InlineFormattedText";

type Props = Extract<ElementBlock, { type: "elementHeading" }>;

/** Use role+aria-level instead of native heading tags so peblor headings
 *  don't break the document outline (the page already has a single <h1>). */
function headingProps(
  level: 1 | 2 | 3 | 4 | 5 | 6 | undefined,
  semanticLevel?: 1 | 2 | 3 | 4 | 5 | 6
): { role: "heading"; "aria-level": number } {
  const ariaLevel = semanticLevel ?? level ?? 2;
  return { role: "heading", "aria-level": ariaLevel };
}

export function ElementHeading({
  level,
  semanticLevel,
  text,
  variableKey,
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
}: Props & { variableKey?: string }) {
  const themeMode = usePeblorThemeMode();
  // Always call hook unconditionally; use its value only when variableKey is set
  const variableValue = useVariable(variableKey ?? "");
  const resolvedText = variableKey !== undefined ? String(variableValue ?? "") : text;
  const headingAriaProps = headingProps(level, semanticLevel);
  const typographyClass = getHeadingTypographyClass(level);

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
  const textStyle: CSSProperties = {
    letterSpacing,
    ...(lineSpacing !== undefined ? { lineHeight: lineSpacing } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(resolveFontFamily(fontFamily) !== undefined
      ? { fontFamily: resolveFontFamily(fontFamily) }
      : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
    ...(textShadow !== undefined ? { textShadow } : {}),
    ...(textDecoration !== undefined ? { textDecoration } : {}),
    ...(textTransform !== undefined ? { textTransform } : {}),
    // word wrap / overflow — must be on the text element, not the wrapper, for text-overflow to work
    whiteSpace: whiteSpace ?? (wordWrap ? "pre-line" : "nowrap"),
    overflowWrap: wordWrap ? "break-word" : "normal",
    wordBreak: wordWrap ? "break-word" : "normal",
    ...(!wordWrap && whiteSpace == null ? { overflow: "hidden", textOverflow: "ellipsis" } : {}),
  };
  const resolvedTextFill = resolveThemeString(textFill?.value, themeMode);
  const resolvedColor = resolveThemeString(color, themeMode);
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
          className: `m-0 ${typographyClass}`,
          style: textStyle,
          ...headingAriaProps,
        },
        <InlineFormattedText text={resolvedText} />
      )}
    </div>
  );
}
