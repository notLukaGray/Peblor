import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import {
  getBodyTypographyClass,
  getHeadingTypographyClass,
  resolveFontFamily,
} from "@pb/core/typography";
import { getElementLayoutStyle } from "@pb/core/layout";
import { resolveThemeString } from "../../theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementCounter" }>;

function formatCounterValue(
  value: number,
  decimals: number,
  separator: boolean,
  locale: string | undefined
): string {
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (separator) {
    return value.toLocaleString(locale, opts);
  }
  if (locale) {
    return new Intl.NumberFormat(locale, opts).format(value);
  }
  return value.toFixed(decimals);
}

function counterTypographyClass(level: Props["level"], variant: Props["variant"]): string {
  if (level != null) return getHeadingTypographyClass(level);
  if (variant === "label") return getBodyTypographyClass(6);
  if (variant === "section") return getHeadingTypographyClass(3);
  if (variant === "display") return getHeadingTypographyClass(2);
  return "";
}

export function ServerElementCounter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
  separator = false,
  locale,
  level,
  variant,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  color,
  textFill,
  aria,
  role,
  tabIndex,
  width,
  height,
  align,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  zIndex,
  constraints,
}: Props) {
  const layoutStyle = getElementLayoutStyle({
    width: width as string | undefined,
    height: height as string | undefined,
    align: align as "left" | "center" | "right" | undefined,
    marginTop: marginTop as string | undefined,
    marginBottom: marginBottom as string | undefined,
    marginLeft: marginLeft as string | undefined,
    marginRight: marginRight as string | undefined,
    zIndex,
    constraints,
  });

  const value = formatCounterValue(target, decimals, separator, locale);
  const text = `${prefix}${value}${suffix}`;

  const resolvedTextFill = resolveThemeString(textFill?.value, "light");
  const resolvedColor = resolveThemeString(color, "light");
  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const resolvedFontSize = Array.isArray(fontSize) ? fontSize[0] : fontSize;

  const textStyle: CSSProperties = {
    letterSpacing,
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
  };

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

  const typoClass = counterTypographyClass(level, variant);

  return (
    <figure
      className="shrink-0 m-0"
      style={layoutStyle}
      {...(role ? { role } : {})}
      {...(tabIndex !== undefined ? { tabIndex } : {})}
      {...(aria ?? {})}
    >
      <span style={textStyle} className={typoClass ? `tabular-nums ${typoClass}` : "tabular-nums"}>
        {text}
      </span>
    </figure>
  );
}
