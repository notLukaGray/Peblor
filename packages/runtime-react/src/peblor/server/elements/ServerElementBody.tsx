import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/types";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  stripResponsiveLayoutKeys,
} from "@pb/core/layout";
import { getBodyTypographyClass, resolveFontFamily } from "@pb/core/typography";
import { lowerThemeStringToCss } from "../../theme/theme-string";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { sanitizeRichTextMarkup } from "@pb/runtime-react/core/lib/sanitize-rich-text";
import type { ServerElementComponentProps } from "../server-element-types";
import { renderInlineMarkdown } from "../../elements/Shared/InlineMarkdownTokens";

type Props = Extract<ElementBlock, { type: "elementBody" }>;

export function ServerElementBody({
  text,
  level,
  letterSpacing,
  lineHeight,
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
  color,
  textFill,
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
  textDecoration,
  textTransform,
  whiteSpace,
  rotate,
  flipHorizontal,
  flipVertical,
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
  const resolvedLevel =
    level !== undefined && level !== null
      ? ((Array.isArray(level) ? level[0] : level) ?? undefined)
      : undefined;
  const typographyClass =
    resolvedLevel !== undefined ? getBodyTypographyClass(resolvedLevel as ElementBodyVariant) : "";

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
  const resolvedFontSize = resolveResponsiveValue(fontSize, serverIsMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, serverIsMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, serverIsMobile);
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
    ...(textAlign !== undefined && !Array.isArray(textAlign)
      ? { textAlign: textAlign as CSSProperties["textAlign"] }
      : {}),
    ...(textShadow !== undefined ? { textShadow } : {}),
    ...(textDecoration !== undefined ? { textDecoration } : {}),
    ...(textTransform !== undefined ? { textTransform } : {}),
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
  } else if (textFill?.type === "color" && resolvedTextFill) {
    textStyle.color = resolvedTextFill;
  } else if (resolvedColor !== undefined) {
    textStyle.color = resolvedColor;
  }

  // Precompiled markup from the pipeline (set during EXPAND for elementBody/elementHeading).
  const rawMarkup = (rest as Record<string, unknown>).markup as string | undefined;
  const safeMarkup =
    typeof rawMarkup === "string" && rawMarkup.trim()
      ? sanitizeRichTextMarkup(rawMarkup)
      : undefined;
  const useMarkup = safeMarkup != null;

  // Multi-paragraph markup needs a <div> container; inline markup stays in <p>.
  if (useMarkup && (safeMarkup.includes("<p>") || safeMarkup.includes("</p>"))) {
    return (
      <div
        className={["shrink-0 max-w-full", stateStyleClass, responsiveStyleClass]
          .filter(Boolean)
          .join(" ")}
        style={blockStyle}
      >
        <div
          className={`m-0 block${typographyClass ? ` ${typographyClass}` : ""}`}
          style={textStyle}
          dangerouslySetInnerHTML={{ __html: safeMarkup }}
        />
      </div>
    );
  }

  return (
    <div
      className={["shrink-0 max-w-full", stateStyleClass, responsiveStyleClass]
        .filter(Boolean)
        .join(" ")}
      style={blockStyle}
    >
      <p className={`m-0 block${typographyClass ? ` ${typographyClass}` : ""}`} style={textStyle}>
        {useMarkup ? (
          <span dangerouslySetInnerHTML={{ __html: safeMarkup }} />
        ) : (
          renderInlineMarkdown(text)
        )}
      </p>
    </div>
  );
}
