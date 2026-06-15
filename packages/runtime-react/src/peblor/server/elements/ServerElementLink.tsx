import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/types";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import type { ServerElementComponentProps } from "../server-element-types";
import {
  getElementLayoutStyle,
  getLayoutRotateFlipStyle,
  stripResponsiveLayoutKeys,
} from "@pb/core/layout";
import {
  DEFAULT_BODY_LEVEL,
  getBodyTypographyClass,
  getHeadingTypographyClass,
  resolveFontFamily,
} from "@pb/core/typography";
import { lowerThemeStringToCss } from "../../theme/theme-string";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";

type Props = Extract<ElementBlock, { type: "elementLink" }>;

function getLinkTypographyClass(props: Props): string {
  if (props.copyType === "heading") {
    const level = resolveResponsiveValue(props.level, true) ?? 1;
    return getHeadingTypographyClass(level);
  }
  const level = resolveResponsiveValue(props.level, true) ?? DEFAULT_BODY_LEVEL;
  return getBodyTypographyClass(level as ElementBodyVariant);
}

function toTransitionValue(value: string | number | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}ms` : value;
}

export function ServerElementLink({
  label,
  href,
  external = false,
  target,
  rel,
  download,
  hreflang,
  ping,
  referrerPolicy,
  copyType,
  level,
  fontFamily,
  fontSize,
  fontWeight: _fontWeight,
  letterSpacing,
  lineHeight,
  serverIsMobile = false,
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
  textShadow,
  textDecoration,
  textTransform,
  whiteSpace,
  selfAlign,
  textAlign,
  width,
  height,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  wordWrap = true,
  linkDefault,
  linkHover,
  linkActive,
  linkDisabled,
  linkTransition,
  disabled = false,
  rotate,
  flipHorizontal,
  flipVertical,
  aria,
  tabIndex,
  role,
  wrapperStyle,
  stateStyleClass,
  responsiveStyleClass,
  responsiveLayoutKeys,
  ...rest
}: Props &
  Pick<
    ServerElementComponentProps,
    "serverIsMobile" | "stateStyleClass" | "responsiveStyleClass" | "responsiveLayoutKeys"
  >) {
  const resolvedFontSize = resolveResponsiveValue(fontSize, serverIsMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, serverIsMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, serverIsMobile);

  const linkStyle: CSSProperties = {};
  const resolvedLinkDefault = lowerThemeStringToCss(linkDefault);
  const resolvedLinkHover = lowerThemeStringToCss(linkHover);
  const resolvedLinkActive = lowerThemeStringToCss(linkActive);
  const resolvedLinkDisabled = lowerThemeStringToCss(linkDisabled);
  if (resolvedLinkDefault != null)
    (linkStyle as Record<string, string>)["--element-link-color"] = resolvedLinkDefault;
  if (resolvedLinkHover != null)
    (linkStyle as Record<string, string>)["--element-link-hover"] = resolvedLinkHover;
  if (resolvedLinkActive != null)
    (linkStyle as Record<string, string>)["--element-link-active"] = resolvedLinkActive;
  if (resolvedLinkDisabled != null)
    (linkStyle as Record<string, string>)["--element-link-disabled"] = resolvedLinkDisabled;
  const transition = toTransitionValue(linkTransition);
  if (transition != null)
    (linkStyle as Record<string, string>)["--element-link-transition"] = transition;

  const typographyClass = getLinkTypographyClass({
    type: "elementLink",
    label,
    href,
    external,
    copyType,
    ...(copyType === "heading" ? { level } : { level: level ?? DEFAULT_BODY_LEVEL }),
  } as Props);

  const blockStyle: CSSProperties = {
    ...getElementLayoutStyle(
      stripResponsiveLayoutKeys(
        {
          width,
          height,
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
  };
  applyPbDefaultTextAlign(blockStyle, selfAlign, textAlign);

  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const textStyle: CSSProperties = {
    ...((wrapperStyle as CSSProperties | undefined) ?? {}),
    // Inline typography values — only used as fallback when no responsive CSS class covers them
    ...(responsiveStyleClass
      ? {}
      : {
          ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
          ...(resolvedLetterSpacing !== undefined ? { letterSpacing: resolvedLetterSpacing } : {}),
          ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
        }),
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(textShadow !== undefined ? { textShadow } : {}),
    ...(textDecoration !== undefined ? { textDecoration } : {}),
    ...(textTransform !== undefined ? { textTransform } : {}),
    whiteSpace: whiteSpace ?? (wordWrap ? "normal" : "nowrap"),
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
  const resolvedTarget = target ?? (external ? "_blank" : undefined);
  const resolvedRel =
    rel ?? (resolvedTarget === "_blank" || external ? "noopener noreferrer" : undefined);
  const linkClassName = [
    "element-link m-0 block",
    typographyClass,
    disabled ? "element-link--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const ariaProps = aria as Record<string, string | boolean> | undefined;
  const linkNode = (
    <a
      href={href}
      className={linkClassName}
      style={{ ...linkStyle, ...textStyle }}
      target={resolvedTarget}
      rel={resolvedRel}
      download={download as string | boolean | undefined}
      hrefLang={hreflang}
      ping={ping}
      referrerPolicy={referrerPolicy}
      tabIndex={tabIndex}
      {...(ariaProps ? ariaProps : {})}
    >
      {label}
    </a>
  );

  if (Object.keys(blockStyle).length === 0 && role == null && !responsiveStyleClass)
    return linkNode;

  return (
    <div
      className={["shrink-0 max-w-full", stateStyleClass, responsiveStyleClass]
        .filter(Boolean)
        .join(" ")}
      style={blockStyle}
      role={role}
    >
      {linkNode}
    </div>
  );
}
