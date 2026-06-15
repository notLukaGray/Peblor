"use client";

import { createElement, useInsertionEffect, type CSSProperties } from "react";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import type { ElementBlock } from "@pb/contracts/types";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  extractElementResponsiveLayoutStyles,
  stripResponsiveLayoutKeys,
  RESPONSIVE_LAYOUT_CSS_KEYS,
} from "@pb/core/layout";
import { getHeadingTypographyClass } from "@pb/core/typography";
import { useVariable } from "@/peblor/runtime/peblor-variable-store";
import { resolveFontFamily } from "@pb/core/typography";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { InlineFormattedText } from "./Shared/InlineFormattedText";
import { buildResponsiveStyle, type ResponsiveStyleInput } from "./Shared/responsive-style";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

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

export function ElementHeading({
  level,
  semanticLevel,
  text,
  variableKey,
  letterSpacing,
  lineHeight,
  color,
  textFill,
  fontFamily,
  fontSize,
  fontWeight,
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
}: Props & { variableKey?: string }) {
  // Always call hook unconditionally; use its value only when variableKey is set
  const variableValue = useVariable(variableKey ?? "");
  const { isMobile } = useDeviceType();
  const resolvedText = variableKey !== undefined ? String(variableValue ?? "") : text;
  const headingTag = resolveHeadingTag(level, semanticLevel);
  const typographyClass = getHeadingTypographyClass(level);
  const resolvedFontSize = resolveResponsiveValue(fontSize, isMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, isMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, isMobile);

  // ── Responsive typography + layout style injection (stage 3) ────────────
  const elementId = (rest as Record<string, unknown>).id as string | undefined;
  const styles: Record<string, unknown> = {};
  const rawBlock: Record<string, unknown> = {
    ...rest,
    width,
    height,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
  };
  Object.assign(styles, extractElementResponsiveLayoutStyles(rawBlock));
  if (fontSize !== undefined && fontSize !== null && typeof fontSize === "object")
    styles.fontSize = fontSize;
  if (lineHeight !== undefined && lineHeight !== null && typeof lineHeight === "object")
    styles.lineHeight = lineHeight;
  if (letterSpacing !== undefined && letterSpacing !== null && typeof letterSpacing === "object")
    styles.letterSpacing = letterSpacing;
  const responsiveResult = buildResponsiveStyle({ id: elementId, styles } as ResponsiveStyleInput);
  const {
    className: responsiveStyleClass,
    css: responsiveStyleCss,
    needsContainer: _needsContainer,
  } = responsiveResult;
  useInsertionEffect(() => {
    if (!responsiveStyleCss || !responsiveStyleClass) return;
    const el = document.createElement("style");
    el.setAttribute("data-pb-rs", responsiveStyleClass);
    el.textContent = responsiveStyleCss;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [responsiveStyleCss, responsiveStyleClass]);

  // When responsive CSS class is active, strip inline values for layout keys that have tier-map values.
  // This builds a filtered set of responsive keys from the explicit props + rest.
  const responsiveLayoutKeys: string[] | undefined = responsiveStyleClass
    ? [
        ...(
          ["width", "height", "marginTop", "marginBottom", "marginLeft", "marginRight"] as const
        ).filter((key) => {
          const v = { width, height, marginTop, marginBottom, marginLeft, marginRight }[key];
          return v !== undefined && v !== null && typeof v === "object";
        }),
        ...Object.entries(rest as Record<string, unknown>)
          .filter(([, v]) => v !== undefined && v !== null && typeof v === "object")
          .map(([k]) => k)
          .filter((k) => (RESPONSIVE_LAYOUT_CSS_KEYS as readonly string[]).includes(k)),
      ].filter((k) => (RESPONSIVE_LAYOUT_CSS_KEYS as readonly string[]).includes(k))
    : undefined;
  const layoutInput = stripResponsiveLayoutKeys(
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
    responsiveLayoutKeys
  );
  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle(layoutInput),
    ...getLayoutRotateFlipStyle({ rotate, flipHorizontal, flipVertical }),
  };
  applyPbDefaultTextAlign(blockStyle, selfAlign, textAlign);

  const textStyle: CSSProperties = {
    // Inline typography values — only used as fallback when no responsive CSS class covers them
    ...(responsiveStyleClass
      ? {}
      : {
          ...(resolvedLetterSpacing !== undefined ? { letterSpacing: resolvedLetterSpacing } : {}),
          ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
          ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
        }),
    ...(resolveFontFamily(fontFamily) !== undefined
      ? { fontFamily: resolveFontFamily(fontFamily) }
      : {}),
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
    // word wrap / overflow — must be on the text element, not the wrapper, for text-overflow to work
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

  return (
    <div
      className={["shrink-0 max-w-full", responsiveStyleClass].filter(Boolean).join(" ")}
      style={blockStyle}
    >
      {createElement(
        headingTag,
        {
          className: `m-0 ${typographyClass}`,
          style: textStyle,
        },
        <InlineFormattedText text={resolvedText} />
      )}
    </div>
  );
}
