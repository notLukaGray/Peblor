import type { CSSProperties } from "react";
import type { FormFieldBlock } from "@pb/contracts/types";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import {
  type PeblorThemeMode,
  resolveThemeString,
  resolveThemeStyleObject,
} from "@/peblor/theme/theme-string";

/**
 * Builds CSS style object from form field block Style modifiers.
 * Used by FormFieldRenderer to apply width, padding, fill, stroke, margins, etc.
 */
export function formFieldStyleFromConfig(
  field: FormFieldBlock,
  isMobile: boolean,
  themeMode: PeblorThemeMode
): CSSProperties {
  const width = resolveResponsiveValue(field.width, isMobile);
  const marginTop = resolveResponsiveValue(field.marginTop, isMobile);
  const marginBottom = resolveResponsiveValue(field.marginBottom, isMobile);
  const marginLeft = resolveResponsiveValue(field.marginLeft, isMobile);
  const marginRight = resolveResponsiveValue(field.marginRight, isMobile);
  const padding = resolveResponsiveValue(field.padding, isMobile);
  const fill = resolveResponsiveValue(field.fill, isMobile);
  const stroke = resolveResponsiveValue(field.stroke, isMobile);
  const borderRadius = resolveResponsiveValue(field.borderRadius, isMobile);
  const borderWidth = resolveResponsiveValue(field.borderWidth, isMobile);
  const textAlign = resolveResponsiveValue(field.textAlign, isMobile);

  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (marginTop !== undefined) style.marginTop = marginTop;
  if (marginBottom !== undefined) style.marginBottom = marginBottom;
  if (marginLeft !== undefined) style.marginLeft = marginLeft;
  if (marginRight !== undefined) style.marginRight = marginRight;
  if (padding !== undefined) style.padding = padding;
  const resolvedFill = resolveThemeString(fill, themeMode);
  const resolvedStroke = resolveThemeString(stroke, themeMode);
  if (resolvedFill !== undefined) style.background = resolvedFill;
  if (resolvedStroke !== undefined) style.borderColor = resolvedStroke;
  if (borderRadius !== undefined) style.borderRadius = borderRadius;
  if (borderWidth !== undefined) style.borderWidth = borderWidth;
  if (textAlign !== undefined) style.textAlign = textAlign as CSSProperties["textAlign"];

  if (field.wrapperStyle && typeof field.wrapperStyle === "object") {
    Object.assign(style, resolveThemeStyleObject(field.wrapperStyle, themeMode));
  }
  return style;
}
