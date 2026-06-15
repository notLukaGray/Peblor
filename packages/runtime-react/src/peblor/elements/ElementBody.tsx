"use client";

import { useInsertionEffect, type CSSProperties } from "react";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/peblor/core/peblor-schemas";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  extractElementResponsiveLayoutStyles,
  stripResponsiveLayoutKeys,
  RESPONSIVE_LAYOUT_CSS_KEYS,
} from "@pb/core/layout";
import { getBodyTypographyClass } from "@pb/core/typography";
import { useVariable } from "@/peblor/runtime/peblor-variable-store";
import { resolveFontFamily } from "@pb/core/typography";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { InlineFormattedText } from "./Shared/InlineFormattedText";
import { buildResponsiveStyle, type ResponsiveStyleInput } from "./Shared/responsive-style";
import { useAudioControlContext } from "./ElementAudio/AudioControlContext";
import { formatMediaClock } from "./ElementAudio/format-media-clock";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

type Props = Extract<ElementBlock, { type: "elementBody" }>;

/** Page-builder body text element with layout and typography level (1-6). */
export function ElementBody({
  text,
  variableKey,
  bindAudioTransportTime,
  bindAudioCurrentTime,
  bindAudioDuration,
  level,
  letterSpacing,
  lineHeight,
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
}: Props & { variableKey?: string }) {
  const audioCtx = useAudioControlContext();
  // Always call hook unconditionally; use its value only when variableKey is set
  const variableValue = useVariable(variableKey ?? "");
  const { isMobile } = useDeviceType();
  const fromVariable = variableKey !== undefined ? String(variableValue ?? "") : text;
  const resolvedText =
    bindAudioCurrentTime === true && audioCtx
      ? formatMediaClock(audioCtx.currentTime)
      : bindAudioDuration === true && audioCtx
        ? formatMediaClock(audioCtx.duration)
        : bindAudioTransportTime === true && audioCtx
          ? `${formatMediaClock(audioCtx.currentTime)} / ${formatMediaClock(audioCtx.duration)}`
          : fromVariable;

  // When level is not provided, skip the typography class entirely so that
  // explicit fontSize/fontWeight/etc. overrides are not fighting a class.
  const resolvedLevel =
    level !== undefined && level !== null
      ? ((Array.isArray(level) ? level[0] : level) ?? undefined)
      : undefined;
  const typographyClass =
    resolvedLevel !== undefined ? getBodyTypographyClass(resolvedLevel as ElementBodyVariant) : "";

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

  const resolvedFontSize = resolveResponsiveValue(fontSize, isMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, isMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, isMobile);

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

  return (
    <div
      className={["shrink-0 max-w-full", responsiveStyleClass].filter(Boolean).join(" ")}
      style={blockStyle}
    >
      <p className={`m-0 block${typographyClass ? ` ${typographyClass}` : ""}`} style={textStyle}>
        <InlineFormattedText text={resolvedText} />
      </p>
    </div>
  );
}
