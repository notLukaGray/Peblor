import { type CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { applyPbDefaultTextAlign } from "@pb/core/host";
import { resolveFontFamily } from "@pb/core/typography";
import { stripResponsiveLayoutKeys } from "@pb/core/layout";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { ServerElementComponentProps } from "../server-element-types";
import {
  buildElementButtonBlockStyle,
  buildElementButtonWrapperStyles,
  getElementButtonTypographyClass,
} from "../../elements/ElementButton/element-button-styles";
import { buildElementButtonLinkState } from "../../elements/ElementButton/element-button-link-and-vector";
import { lowerThemeStringToCss } from "../../theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementButton" }>;

/** Server-rendered button: link structure, text content, basic styling, and wrapper styling.
 *  Client-only features (action, pointer tracking, 3D exit, glass effects) are handled
 *  via ClientElementIsland — see ownReasonsForElement for the classification logic. */
export function ServerElementButton({
  label,
  copyType = "body",
  level,
  fontFamily,
  href,
  external = false,
  target,
  rel,
  download,
  hreflang,
  ping,
  referrerPolicy,
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
  loading = false,
  loadingLabel,
  wrapperFill,
  wrapperStroke,
  wrapperStrokeWidth,
  wrapperPadding,
  wrapperBorderRadius,
  wrapperWidth,
  wrapperHeight,
  wrapperMinWidth,
  wrapperMinHeight,
  wrapperFillHover,
  wrapperStrokeHover,
  wrapperFillActive,
  wrapperScaleHover,
  wrapperScaleActive,
  wrapperScaleDisabled,
  wrapperOpacityHover,
  wrapperFillDisabled,
  wrapperTransition,
  wrapperInteractionVars,
  bgFill,
  serverIsMobile = false,
  stateStyleClass,
  responsiveStyleClass,
  responsiveNeedsContainer,
  responsiveLayoutKeys,
  tabIndex,
  aria,
  role,
}: Props &
  Pick<
    ServerElementComponentProps,
    | "serverIsMobile"
    | "stateStyleClass"
    | "responsiveStyleClass"
    | "responsiveNeedsContainer"
    | "responsiveLayoutKeys"
  >) {
  const resolvedWrapperPadding = resolveResponsiveValue(wrapperPadding, serverIsMobile);
  const resolvedWrapperBorderRadius = resolveResponsiveValue(wrapperBorderRadius, serverIsMobile);
  const resolvedWrapperWidth = resolveResponsiveValue(wrapperWidth, serverIsMobile);
  const resolvedWrapperHeight = resolveResponsiveValue(wrapperHeight, serverIsMobile);
  const resolvedWrapperMinWidth = resolveResponsiveValue(wrapperMinWidth, serverIsMobile);
  const resolvedWrapperMinHeight = resolveResponsiveValue(wrapperMinHeight, serverIsMobile);

  const typographyClass = getElementButtonTypographyClass({
    type: "elementButton",
    label,
    copyType,
    level,
  } as Props);

  // Wrapper styles (no definitions context available on the server — pass null;
  // fill/stroke refs that require lookups are handled via ClientElementIsland).
  const {
    hasWrapper,
    useRoundedGradientStroke,
    wrapperStyle: rawWrapperStyle,
    innerWrapperStyle,
    hasStateVars,
  } = buildElementButtonWrapperStyles(null, {
    wrapperFill,
    wrapperStroke,
    wrapperStrokeWidth,
    wrapperPadding: resolvedWrapperPadding,
    wrapperBorderRadius: resolvedWrapperBorderRadius,
    wrapperWidth: resolvedWrapperWidth,
    wrapperHeight: resolvedWrapperHeight,
    wrapperMinWidth: resolvedWrapperMinWidth,
    wrapperMinHeight: resolvedWrapperMinHeight,
    wrapperFillHover,
    wrapperStrokeHover,
    wrapperFillActive,
    wrapperScaleHover,
    wrapperScaleActive,
    wrapperScaleDisabled,
    wrapperOpacityHover,
    wrapperFillDisabled,
    wrapperTransition,
    wrapperInteractionVars,
    bgFill,
  });

  // Link state — no pathname on the server, so isActive defaults to false
  const { hasLink, linkStyle, linkClassName } = buildElementButtonLinkState(
    null,
    {
      href,
      external,
      linkDefault,
      linkHover,
      linkActive,
      linkDisabled,
      linkTransition,
      disabled: disabled || loading,
    },
    typographyClass
  );

  const blockStyle: CSSProperties = {
    ...buildElementButtonBlockStyle(
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
          wordWrap,
        },
        responsiveStyleClass ? responsiveLayoutKeys : undefined
      ) as Parameters<typeof buildElementButtonBlockStyle>[0]
    ),
    ...(responsiveNeedsContainer ? { containerType: "inline-size" as const } : {}),
  };
  applyPbDefaultTextAlign(blockStyle, selfAlign, textAlign);

  const resolvedTarget = target ?? (external ? "_blank" : undefined);
  const resolvedRel =
    rel ?? (resolvedTarget === "_blank" || external ? "noopener noreferrer" : undefined);
  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const resolvedLabel = loading && loadingLabel != null ? loadingLabel : label;
  const hasLabel = resolvedLabel != null && resolvedLabel !== "";
  const isDisabled = disabled || loading;
  const ariaProps = aria as Record<string, string | boolean> | undefined;

  // Non-link text color: only applies when the button has no link wrapper
  // (matches the client-side fallback in ElementButton.tsx)
  const resolvedLinkDefault = lowerThemeStringToCss(linkDefault);
  const resolvedLinkHover = lowerThemeStringToCss(linkHover);
  const resolvedLinkActive = lowerThemeStringToCss(linkActive);

  const content = (
    <span className="inline-flex items-center justify-center gap-(--pb-button-label-gap)">
      {hasLabel && (
        <span
          className={`m-0 block ${typographyClass}${!hasLink ? " element-btn-text" : ""}`}
          style={{
            ...(resolvedFontFamily ? { fontFamily: resolvedFontFamily } : {}),
            ...(!hasLink && resolvedLinkDefault != null && resolvedLinkDefault !== ""
              ? {
                  "--element-btn-text": resolvedLinkDefault,
                  ...(resolvedLinkHover != null
                    ? { "--element-btn-text-hover": resolvedLinkHover }
                    : {}),
                  ...(resolvedLinkActive != null
                    ? { "--element-btn-text-active": resolvedLinkActive }
                    : {}),
                }
              : {}),
            ...(isDisabled && hasLink ? { opacity: 0.6 } : {}),
          }}
        >
          {resolvedLabel}
        </span>
      )}
    </span>
  );

  const nakedSurfacePadding: CSSProperties = hasWrapper
    ? resolvedWrapperPadding != null
      ? { padding: resolvedWrapperPadding as string | number }
      : {}
    : {
        paddingTop: "var(--pb-button-naked-pad-y)",
        paddingBottom: "var(--pb-button-naked-pad-y)",
        paddingLeft: "var(--pb-button-naked-pad-x)",
        paddingRight: "var(--pb-button-naked-pad-x)",
        borderRadius: "var(--pb-button-naked-radius)",
      };

  // ── Link / Action / Plain inner structure ────────────────────────────────

  const inner = hasLink ? (
    external ? (
      <a
        href={href}
        className={linkClassName}
        style={{ ...linkStyle, ...nakedSurfacePadding }}
        target={resolvedTarget}
        rel={resolvedRel}
        download={download as string | boolean | undefined}
        hrefLang={hreflang}
        ping={ping}
        referrerPolicy={referrerPolicy}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : tabIndex}
        {...(ariaProps ? ariaProps : {})}
      >
        {content}
        {resolvedTarget === "_blank" ? <span className="sr-only"> Opens in a new tab.</span> : null}
      </a>
    ) : (
      <a
        href={href}
        className={linkClassName}
        style={{ ...linkStyle, ...nakedSurfacePadding }}
        download={download as string | boolean | undefined}
        hrefLang={hreflang}
        ping={ping}
        referrerPolicy={referrerPolicy}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : tabIndex}
        {...(ariaProps ? ariaProps : {})}
      >
        {content}
      </a>
    )
  ) : (
    <span
      className={linkClassName}
      style={{ ...linkStyle, ...nakedSurfacePadding }}
      tabIndex={tabIndex}
      {...(ariaProps ? ariaProps : {})}
    >
      {content}
    </span>
  );

  // ── Wrapper span ─────────────────────────────────────────────────────────

  const wrapperClassName = [
    "inline-flex",
    hasStateVars ? "element-btn-wrap" : "",
    isDisabled ? "element-btn-wrap--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const wrappedInner =
    hasWrapper || hasStateVars ? (
      <span style={{ ...rawWrapperStyle }} className={wrapperClassName}>
        {hasWrapper && useRoundedGradientStroke ? (
          <span style={innerWrapperStyle} className="inline-flex">
            {inner}
          </span>
        ) : (
          inner
        )}
      </span>
    ) : (
      inner
    );

  // ── Shell div ────────────────────────────────────────────────────────────

  return (
    <div
      className={["shrink-0", stateStyleClass, responsiveStyleClass].filter(Boolean).join(" ")}
      style={blockStyle}
      role={role}
      tabIndex={!hasLink ? tabIndex : undefined}
    >
      {wrappedInner}
    </div>
  );
}
