import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/types";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import { getElementLayoutStyle, getLayoutRotateFlipStyle } from "@pb/core/layout";
import {
  DEFAULT_BODY_LEVEL,
  getBodyTypographyClass,
  getHeadingTypographyClass,
  resolveFontFamily,
} from "@pb/core/typography";
import { resolveThemeString } from "../../theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementLink" }>;

function getLinkTypographyClass(props: Props): string {
  if (props.copyType === "heading") {
    const level = (Array.isArray(props.level) ? props.level[0] : props.level) ?? 1;
    return getHeadingTypographyClass(level);
  }
  const level = (Array.isArray(props.level) ? props.level[0] : props.level) ?? DEFAULT_BODY_LEVEL;
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
  fontWeight,
  textShadow,
  textDecoration,
  textTransform,
  whiteSpace,
  align,
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
  ...rest
}: Props) {
  const linkStyle: CSSProperties = {};
  const resolvedLinkDefault = resolveThemeString(linkDefault, "light");
  const resolvedLinkHover = resolveThemeString(linkHover, "light");
  const resolvedLinkActive = resolveThemeString(linkActive, "light");
  const resolvedLinkDisabled = resolveThemeString(linkDisabled, "light");
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
    ...getElementLayoutStyle({
      width,
      height,
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

  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const textStyle: CSSProperties = {
    ...((wrapperStyle as CSSProperties | undefined) ?? {}),
    ...(resolvedFontFamily !== undefined ? { fontFamily: resolvedFontFamily } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
    ...(textShadow !== undefined ? { textShadow } : {}),
    ...(textDecoration !== undefined ? { textDecoration } : {}),
    ...(textTransform !== undefined ? { textTransform } : {}),
    whiteSpace: whiteSpace ?? (wordWrap ? "normal" : "nowrap"),
    overflowWrap: wordWrap ? "break-word" : "normal",
    wordBreak: wordWrap ? "break-word" : "normal",
    ...(!wordWrap && whiteSpace == null ? { overflow: "hidden", textOverflow: "ellipsis" } : {}),
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

  if (Object.keys(blockStyle).length === 0 && role == null) return linkNode;

  return (
    <div className="shrink-0 max-w-full" style={blockStyle} role={role}>
      {linkNode}
    </div>
  );
}
