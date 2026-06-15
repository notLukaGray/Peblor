import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { getElementLayoutStyle, stripResponsiveLayoutKeys } from "@pb/core/layout";
import type { ServerElementComponentProps } from "../server-element-types";
import { resolveFontFamily } from "@pb/core/typography";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

type Props = Extract<ElementBlock, { type: "elementTable" }>;

export function ServerElementTable({
  caption,
  headers,
  rows,
  columnAlign,
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
  const tableStyle: CSSProperties = {
    // Inline typography values — only used as fallback when no responsive CSS class covers them
    ...(responsiveStyleClass
      ? {}
      : {
          ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
          ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
          ...(resolvedLetterSpacing !== undefined ? { letterSpacing: resolvedLetterSpacing } : {}),
        }),
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
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
    borderCollapse: "collapse",
  };

  function getCellAlign(colIndex: number): CSSProperties["textAlign"] | undefined {
    if (!columnAlign || colIndex >= columnAlign.length) return undefined;
    return columnAlign[colIndex];
  }

  return (
    <div
      className={["shrink-0 m-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      style={layoutStyle}
    >
      <table style={tableStyle}>
        {caption !== undefined && caption !== null && caption !== "" && (
          <caption>{caption}</caption>
        )}
        {headers !== undefined && headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((header, colIndex) => (
                <th
                  key={colIndex}
                  style={
                    getCellAlign(colIndex) !== undefined
                      ? { textAlign: getCellAlign(colIndex) }
                      : undefined
                  }
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td
                  key={colIndex}
                  style={
                    getCellAlign(colIndex) !== undefined
                      ? { textAlign: getCellAlign(colIndex) }
                      : undefined
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
