import { createElement, type CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  stripResponsiveLayoutKeys,
} from "@pb/core/layout";
import { getHeadingTypographyClass, resolveFontFamily } from "@pb/core/typography";
import { lowerThemeStringToCss } from "../../theme/theme-string";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { ServerElementComponentProps } from "../server-element-types";
import { renderInlineMarkdown } from "../../elements/Shared/InlineMarkdownTokens";

type Props = Extract<ElementBlock, { type: "elementHeading" }>;

/** Resolve the semantic heading tag (h1-h6) from semanticLevel or visual level.
 *
 * Rules:
 *  - semanticLevel always wins (represents explicit author intent about the document outline).
 *  - Visual level:1 without semanticLevel defaults to h2 to prevent accidental multiple h1s
 *    on pages that already have one in the layout.
 *  - Fallback is h2 when neither is set.
 */
function resolveHeadingTag(
  level: 1 | 2 | 3 | 4 | 5 | 6 | undefined,
  semanticLevel?: 1 | 2 | 3 | 4 | 5 | 6
): "h1" | "h2" | "h3" | "h4" | "h5" | "h6" {
  const tag = semanticLevel ?? (level === 1 ? 2 : (level ?? 2));
  return `h${tag}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function ServerElementHeading({
  level,
  semanticLevel,
  text,
  letterSpacing,
  lineHeight,
  color,
  textFill,
  fontFamily,
  fontSize,
  fontWeight,
  serverIsMobile = false,
  stateStyleClass,
  responsiveStyleClass,
  responsiveNeedsContainer,
  responsiveLayoutKeys,
  fontStyle,
  fontVariationSettings,
  fontVariant,
  fontKerning,
  textWrap,
  hyphens,
  wordBreak: wordBreakOverride,
  overflowWrap: overflowWrapOverride,
  textIndent,
  textUnderlineOffset,
  selfAlign,
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
  textStroke,
  textDecoration,
  textTransform,
  whiteSpace,
  rotate,
  flipHorizontal,
  flipVertical,
  filter,
  blendMode,
  opacity,
  ...rest
}: Props &
  Pick<
    ServerElementComponentProps,
    | "serverIsMobile"
    | "stateStyleClass"
    | "responsiveStyleClass"
    | "responsiveNeedsContainer"
    | "responsiveLayoutKeys"
  >) {
  const resolvedFontSize = resolveResponsiveValue(fontSize, serverIsMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, serverIsMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, serverIsMobile);

  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle(
      stripResponsiveLayoutKeys(
        {
          width,
          height,
          constraints,
          selfAlign,
          textAlign,
          marginTop,
          marginBottom,
          marginLeft,
          marginRight,
          ...rest,
        },
        responsiveStyleClass ? responsiveLayoutKeys : undefined
      )
    ),
    ...getLayoutRotateFlipStyle({ rotate, flipHorizontal, flipVertical }),
    ...(responsiveNeedsContainer ? { containerType: "inline-size" as const } : {}),
  };
  applyPbDefaultTextAlign(blockStyle, selfAlign, textAlign);

  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const headingTag = resolveHeadingTag(level, semanticLevel);
  const textStyle: CSSProperties = {
    // Inline typography values — only used as fallback when no responsive CSS class covers them
    ...(responsiveStyleClass
      ? {}
      : {
          ...(resolvedLetterSpacing !== undefined ? { letterSpacing: resolvedLetterSpacing } : {}),
          ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
          ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
        }),
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
    ...(textShadow !== undefined ? { textShadow } : {}),
    ...(textStroke !== undefined ? { WebkitTextStroke: textStroke } : {}),
    ...(textDecoration !== undefined ? { textDecoration } : {}),
    ...(textTransform !== undefined ? { textTransform } : {}),
    ...(filter !== undefined ? { filter } : {}),
    ...(blendMode !== undefined
      ? { mixBlendMode: blendMode as CSSProperties["mixBlendMode"] }
      : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    whiteSpace: whiteSpace ?? (wordWrap ? "pre-line" : "nowrap"),
    overflowWrap: wordWrap ? "break-word" : "normal",
    wordBreak: wordWrap ? "break-word" : "normal",
    ...(!wordWrap && whiteSpace == null ? { overflow: "hidden", textOverflow: "ellipsis" } : {}),
    // Extended typography — gap 1.2 (applied after wordWrap defaults so explicit values win)
    ...(fontStyle !== undefined ? { fontStyle } : {}),
    ...(fontVariationSettings !== undefined ? { fontVariationSettings } : {}),
    ...(fontVariant !== undefined ? { fontVariant } : {}),
    ...(fontKerning !== undefined ? { fontKerning } : {}),
    ...(textWrap !== undefined ? { textWrap } : {}),
    ...(hyphens !== undefined ? { hyphens } : {}),
    ...(wordBreakOverride !== undefined ? { wordBreak: wordBreakOverride } : {}),
    ...(overflowWrapOverride !== undefined ? { overflowWrap: overflowWrapOverride } : {}),
    ...(textIndent !== undefined ? { textIndent } : {}),
    ...(textUnderlineOffset !== undefined ? { textUnderlineOffset } : {}),
  };

  const resolvedTextFill = lowerThemeStringToCss(textFill?.value);
  const resolvedColor = lowerThemeStringToCss(color);
  if (textFill?.type === "gradient" && resolvedTextFill) {
    textStyle.backgroundImage = resolvedTextFill;
    textStyle.backgroundClip = "text";
    textStyle.WebkitBackgroundClip = "text";
    textStyle.color = "transparent";
    (textStyle as Record<string, unknown>).WebkitTextFillColor = "transparent";
    textStyle.paddingBottom = "0.15em";
    textStyle.backgroundSize = "200% 100%";
    textStyle.backgroundPosition = "calc(var(--pb-bg-x, 0) * 1%) calc(var(--pb-bg-y, 50) * 1%)";
  } else if (textFill?.type === "image" && textFill.value) {
    textStyle.backgroundImage = `url(${textFill.value})`;
    textStyle.backgroundClip = "text";
    textStyle.WebkitBackgroundClip = "text";
    textStyle.color = "transparent";
    (textStyle as Record<string, unknown>).WebkitTextFillColor = "transparent";
    textStyle.paddingBottom = "0.15em";
    textStyle.backgroundSize = "cover";
  } else if (textFill?.type === "color" && resolvedTextFill) {
    textStyle.color = resolvedTextFill;
  } else if (resolvedColor !== undefined) {
    textStyle.color = resolvedColor;
  }

  // Precompiled markup from the pipeline (set during EXPAND for elementBody/elementHeading).
  const rawMarkup = (rest as Record<string, unknown>).markup as string | undefined;
  const safeMarkup = typeof rawMarkup === "string" && rawMarkup.trim() ? rawMarkup : undefined;

  return (
    <div
      className={["shrink-0 max-w-full", stateStyleClass, responsiveStyleClass]
        .filter(Boolean)
        .join(" ")}
      style={blockStyle}
    >
      {createElement(
        headingTag,
        {
          className: `m-0 ${getHeadingTypographyClass(level)}`,
          style: textStyle,
          ...(safeMarkup ? { dangerouslySetInnerHTML: { __html: safeMarkup } } : {}),
        },
        safeMarkup ? undefined : renderInlineMarkdown(text)
      )}
    </div>
  );
}
