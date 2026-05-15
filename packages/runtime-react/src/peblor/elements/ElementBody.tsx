import type { CSSProperties } from "react";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/peblor/core/peblor-schemas";
import { getElementLayoutStyle, getLayoutRotateFlipStyle } from "@pb/core/layout";
import { getBodyTypographyClass } from "@pb/core/typography";
import { useVariable } from "@/peblor/runtime/peblor-variable-store";
import { resolveFontFamily } from "@pb/core/typography";
import { resolveThemeString } from "@/peblor/theme/theme-string";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { InlineFormattedText } from "./Shared/InlineFormattedText";
import { useAudioControlContext } from "./ElementAudio/AudioControlContext";
import { formatMediaClock } from "./ElementAudio/format-media-clock";

type Props = Extract<ElementBlock, { type: "elementBody" }>;

/** Page-builder body text element with layout and typography level (1-6). */
export function ElementBody({
  text,
  variableKey,
  bindAudioTransportTime,
  level,
  letterSpacing,
  lineSpacing,
  lineHeight,
  fontFamily,
  fontSize,
  fontWeight,
  color,
  textFill,
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
  const audioCtx = useAudioControlContext();
  // Always call hook unconditionally; use its value only when variableKey is set
  const variableValue = useVariable(variableKey ?? "");
  const fromVariable = variableKey !== undefined ? String(variableValue ?? "") : text;
  const resolvedText =
    bindAudioTransportTime === true && audioCtx
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

  // Build text inline styles. Explicit props override whatever the typography class sets.
  // lineSpacing maps to lineHeight (legacy prop name); lineHeight is the newer direct prop.
  // word wrap / overflow — must be on the text element, not the wrapper, for text-overflow to work
  const textStyle: CSSProperties = {
    ...(letterSpacing !== undefined ? { letterSpacing } : {}),
    ...(lineSpacing !== undefined ? { lineHeight: lineSpacing } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(resolveFontFamily(fontFamily) !== undefined
      ? { fontFamily: resolveFontFamily(fontFamily) }
      : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
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
      <p className={`m-0 block${typographyClass ? ` ${typographyClass}` : ""}`} style={textStyle}>
        <InlineFormattedText text={resolvedText} />
      </p>
    </div>
  );
}
