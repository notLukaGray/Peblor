"use client";

import { TransitionLink } from "./Shared/TransitionLink";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import type { ElementBlock, ElementBodyVariant } from "@pb/contracts/peblor/core/peblor-schemas";
import { getElementLayoutStyle, getLayoutRotateFlipStyle } from "@pb/core/layout";
import {
  getBodyTypographyClass,
  getHeadingTypographyClass,
  DEFAULT_BODY_LEVEL,
} from "@pb/core/typography";
import { resolveFontFamily } from "@pb/core/typography";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";
import { InlineFormattedText } from "./Shared/InlineFormattedText";
import { resolveAuthoredUrl } from "@pb/core/lib/url-policy";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
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

/** Page-builder link element: label, href, optional external; uses heading or body copy type with full layout (align, width, margins, textAlign). */
export function ElementLink({
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
  letterSpacing,
  lineHeight,
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
  ...rest
}: Props) {
  const pathname = usePathname();
  const { isMobile } = useDeviceType();
  const resolvedFontSize = resolveResponsiveValue(fontSize, isMobile);
  const resolvedLineHeight = resolveResponsiveValue(lineHeight, isMobile);
  const resolvedLetterSpacing = resolveResponsiveValue(letterSpacing, isMobile);
  const policyMode = external ? "external" : "any";
  const resolvedHrefResult = resolveAuthoredUrl(href, policyMode);
  const safeHref = resolvedHrefResult.ok ? resolvedHrefResult.url : null;
  const isInternal = !external && (safeHref?.startsWith("/") ?? false);
  const isActive = isInternal && (pathname === href || (href !== "/" && pathname.startsWith(href)));

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
    ...getElementLayoutStyle({
      width,
      height,
      selfAlign,
      textAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      ...rest,
    }),
    ...getLayoutRotateFlipStyle({ rotate, flipHorizontal, flipVertical }),
  };
  applyPbDefaultTextAlign(blockStyle, selfAlign, textAlign);

  // word wrap / overflow — must be on the text element, not the wrapper, for text-overflow to work
  const textStyle: CSSProperties = {
    ...((wrapperStyle as CSSProperties | undefined) ?? {}),
    ...(resolveFontFamily(fontFamily) !== undefined
      ? { fontFamily: resolveFontFamily(fontFamily) }
      : {}),
    ...(resolvedFontSize !== undefined ? { fontSize: resolvedFontSize } : {}),
    ...(fontWeight !== undefined ? { fontWeight: fontWeight as CSSProperties["fontWeight"] } : {}),
    ...(resolvedLetterSpacing !== undefined ? { letterSpacing: resolvedLetterSpacing } : {}),
    ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
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

  const linkClassName = [
    "element-link m-0 block",
    typographyClass,
    isActive ? "element-link--active" : "",
    disabled ? "element-link--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ariaProps = aria as Record<string, string | boolean> | undefined;
  const resolvedTarget = target ?? (external ? "_blank" : undefined);
  const resolvedRel =
    rel ?? (resolvedTarget === "_blank" || external ? "noopener noreferrer" : undefined);

  const linkNode =
    isInternal && safeHref ? (
      <TransitionLink
        href={safeHref}
        className={linkClassName}
        style={{ ...linkStyle, ...textStyle }}
        target={target}
        rel={rel}
        download={download as string | undefined}
        hrefLang={hreflang}
        ping={ping}
        referrerPolicy={referrerPolicy}
        tabIndex={tabIndex}
        {...(ariaProps ? ariaProps : {})}
      >
        <InlineFormattedText text={label} />
      </TransitionLink>
    ) : safeHref ? (
      <a
        href={safeHref}
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
        <InlineFormattedText text={label} />
      </a>
    ) : (
      <span
        className={linkClassName}
        style={{ ...linkStyle, ...textStyle }}
        tabIndex={tabIndex}
        {...(ariaProps ? ariaProps : {})}
      >
        <InlineFormattedText text={label} />
      </span>
    );

  if (Object.keys(blockStyle).length === 0 && role == null) {
    return linkNode;
  }

  return (
    <div className="shrink-0 max-w-full" style={blockStyle} role={role}>
      {linkNode}
    </div>
  );
}
