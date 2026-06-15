import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle, stripResponsiveLayoutKeys } from "@pb/core/layout";
import type { ServerElementComponentProps } from "../server-element-types";
import { resolveFontFamily } from "@pb/core/typography";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

type Props = Extract<ElementBlock, { type: "elementList" }>;

export function ServerElementList({
  items,
  ordered,
  markerStyle,
  start,
  width,
  height,
  selfAlign,
  alignY,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  layer,
  constraints,
  wrapperStyle,
  opacity,
  blendMode,
  boxShadow,
  filter,
  bgBlur,
  scroll,
  hidden,
  aspectRatio,
  borderRadius,
  // typography overrides
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  fontStyle,
  fontVariationSettings,
  fontVariant,
  fontKerning,
  textWrap,
  hyphens,
  wordBreak,
  overflowWrap,
  textIndent,
  textUnderlineOffset,
  fontFeatureSettings,
  textOverflow,
  textStroke,
  verticalAlign,
  paragraphSpacing,
  serverIsMobile = false,
  stateStyleClass,
  responsiveStyleClass,
  responsiveLayoutKeys,
}: Props &
  Pick<
    ServerElementComponentProps,
    "serverIsMobile" | "stateStyleClass" | "responsiveStyleClass" | "responsiveLayoutKeys"
  >) {
  const layoutInput = stripResponsiveLayoutKeys(
    {
      width,
      height,
      selfAlign,
      alignY,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      layer,
      constraints,
      wrapperStyle,
      opacity,
      blendMode,
      boxShadow,
      filter,
      bgBlur,
      scroll,
      hidden,
      aspectRatio,
      borderRadius,
    },
    responsiveStyleClass ? responsiveLayoutKeys : undefined
  );
  const layoutStyle = getElementLayoutStyle(layoutInput);

  const resolvedFontFamily = resolveFontFamily(fontFamily ?? undefined);
  const resolvedFontSize = resolveResponsiveValue(fontSize, serverIsMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, serverIsMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, serverIsMobile);
  const resolvedParagraphSpacing = resolveResponsiveValue(paragraphSpacing, serverIsMobile);
  const listStyle: CSSProperties = {
    ...(markerStyle !== undefined ? { listStyleType: markerStyle } : {}),
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
    ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
    ...(resolvedLetterSpacing !== undefined ? { letterSpacing: resolvedLetterSpacing } : {}),
    ...(fontStyle !== undefined ? { fontStyle } : {}),
    ...(fontVariationSettings !== undefined ? { fontVariationSettings } : {}),
    ...(fontVariant !== undefined ? { fontVariant } : {}),
    ...(fontKerning !== undefined ? { fontKerning } : {}),
    ...(textWrap !== undefined ? { textWrap } : {}),
    ...(hyphens !== undefined ? { hyphens } : {}),
    ...(wordBreak !== undefined ? { wordBreak } : {}),
    ...(overflowWrap !== undefined ? { overflowWrap } : {}),
    ...(textIndent !== undefined ? { textIndent } : {}),
    ...(textUnderlineOffset !== undefined ? { textUnderlineOffset } : {}),
    ...(fontFeatureSettings !== undefined ? { fontFeatureSettings } : {}),
    ...(textOverflow !== undefined ? { textOverflow } : {}),
    ...(textStroke !== undefined ? { WebkitTextStroke: textStroke } : {}),
    ...(verticalAlign !== undefined ? { verticalAlign } : {}),
    paddingInlineStart: "1.5em",
  };

  const Tag = ordered ? "ol" : "ul";

  return (
    <div
      className={["shrink-0 m-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      style={layoutStyle}
    >
      <Tag start={ordered && start !== undefined ? start : undefined} style={listStyle}>
        {items.map((item, index) => (
          <li
            key={index}
            style={
              resolvedParagraphSpacing !== undefined
                ? { marginBottom: resolvedParagraphSpacing }
                : undefined
            }
          >
            {item}
          </li>
        ))}
      </Tag>
    </div>
  );
}
