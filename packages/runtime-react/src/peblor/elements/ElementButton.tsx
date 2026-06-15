"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { TransitionLink } from "./Shared/TransitionLink";
import { usePathname } from "next/navigation";
import type { ElementBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { ElementRenderer } from "@/peblor/elements/Shared/ElementRenderer";
import { useDefinitions } from "@/peblor/elements/ElementModule/ModuleSlotContext";
import { firePeblorAction } from "@/peblor/triggers";
import { AnimatePresence, MotionFromJson } from "@/peblor/integrations/framer-motion";
import {
  mergeMotionDefaults,
  getExitMotionFromPreset,
} from "@pb/contracts/peblor/core/peblor-motion-defaults";
import {
  buildElementButtonBlockStyle,
  buildElementButtonWrapperStyles,
  getElementButtonTypographyClass,
} from "./ElementButton/element-button-styles";
import { resolveFontFamily } from "@pb/core/typography";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import {
  buildElementButtonLinkState,
  resolveElementButtonVectorBlock,
} from "./ElementButton/element-button-link-and-vector";
import { useModel3DReadyButtonExit } from "./ElementButton/use-model3d-ready-button-exit";
import { useButtonPointer } from "./ElementButton/use-button-pointer";
import type { BgFillConfig } from "./ElementButton/use-button-pointer";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { useDeviceType } from "@pb/runtime-react/core/hooks/use-device-type";
import { resolveAuthoredUrl } from "@pb/core/lib/url-policy";
import { lowerThemeStringToCss, lowerThemeValueDeep } from "@/peblor/theme/theme-string";
import { useElementEffects } from "@/peblor/elements/Shared/use-element-effects";

type Props = Extract<ElementBlock, { type: "elementButton" }>;

/** Page-builder button: typography (like elementLink/body/heading), optional vector (via vectorRef), and either link (a-ref) or action (schema'd button function). */
export function ElementButton({
  label,
  copyType = "body",
  level,
  fontFamily,
  vectorRef,
  href,
  external = false,
  target,
  rel,
  download,
  hreflang,
  ping,
  referrerPolicy,
  action,
  actionPayload,
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
  wrapperFillRef,
  wrapperStrokeRef,
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
  interactions,
  aria,
  tabIndex,
  role,
  motion,
  exitPreset,
  effects,
  bgFill,
}: Props) {
  const pathname = usePathname();
  const { isMobile } = useDeviceType();
  const shellRef = useRef<HTMLDivElement | null>(null);
  // Ref for the wrapper span when glass is active — overlay anchors and measures from here,
  // so scale/transform on the wrapper carries the glass along with the content.
  const glassTargetRef = useRef<HTMLSpanElement | null>(null);
  const { ref: bgMotionRef, animationStyle: bgMotionAnimationStyle } = useButtonPointer(
    bgFill != null ? (bgFill as unknown as BgFillConfig) : undefined
  );
  // Stable callback ref: glass always gets set, bg motion attaches via bgMotionRef.
  const wrapperSpanRef: React.RefCallback<HTMLSpanElement> = useCallback(
    (el) => {
      glassTargetRef.current = el;
      bgMotionRef(el);
    },
    [bgMotionRef]
  );
  const isDisabled = disabled || loading;
  const definitions = useDefinitions();
  const resolvedWrapperBorderRadius = useMemo(
    () => resolveResponsiveValue(wrapperBorderRadius, isMobile),
    [wrapperBorderRadius, isMobile]
  );
  const resolvedWrapperPadding = useMemo(
    () => resolveResponsiveValue(wrapperPadding, isMobile),
    [wrapperPadding, isMobile]
  );
  const resolvedWrapperWidth = useMemo(
    () => resolveResponsiveValue(wrapperWidth, isMobile),
    [wrapperWidth, isMobile]
  );
  const resolvedWrapperHeight = useMemo(
    () => resolveResponsiveValue(wrapperHeight, isMobile),
    [wrapperHeight, isMobile]
  );
  const resolvedWrapperMinWidth = useMemo(
    () => resolveResponsiveValue(wrapperMinWidth, isMobile),
    [wrapperMinWidth, isMobile]
  );
  const resolvedWrapperMinHeight = useMemo(
    () => resolveResponsiveValue(wrapperMinHeight, isMobile),
    [wrapperMinHeight, isMobile]
  );
  const typographyClass = getElementButtonTypographyClass({
    type: "elementButton",
    label,
    copyType,
    level,
  } as Props);
  const {
    hasWrapper,
    useRoundedGradientStroke,
    wrapperStyle: rawWrapperStyle,
    innerWrapperStyle,
    hasStateVars,
  } = buildElementButtonWrapperStyles(definitions as Record<string, unknown> | null | undefined, {
    wrapperFill,
    wrapperStroke,
    wrapperFillRef,
    wrapperStrokeRef,
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
  const { hasLink, isInternal, linkStyle, linkClassName } = buildElementButtonLinkState(
    pathname,
    {
      href,
      external,
      linkDefault,
      linkHover,
      linkActive,
      linkDisabled,
      linkTransition,
      disabled: isDisabled,
    },
    typographyClass
  );
  const ariaProps = aria as Record<string, string | boolean> | undefined;
  const resolvedTarget = target ?? (external ? "_blank" : undefined);
  const resolvedRel =
    rel ?? (resolvedTarget === "_blank" || external ? "noopener noreferrer" : undefined);
  const blockStyle = useMemo(
    () =>
      buildElementButtonBlockStyle({
        width,
        height,
        selfAlign,
        textAlign,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        wordWrap,
      }),
    [
      width,
      height,
      selfAlign,
      textAlign,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      wordWrap,
    ]
  );
  const resolvedFontFamily = resolveFontFamily(fontFamily);
  const vectorBlock = resolveElementButtonVectorBlock(
    definitions as Record<string, unknown> | null | undefined,
    vectorRef
  );
  const model3DExit = useModel3DReadyButtonExit(action, actionPayload);
  const model3DExitRef = useRef(model3DExit);
  useLayoutEffect(() => {
    model3DExitRef.current = model3DExit;
  }, [model3DExit]);

  const { resolvedEffects: buttonEffects, hasGlassEffect } = useElementEffects(effects);
  const glassSyncBorderRadius =
    hasGlassEffect && resolvedWrapperBorderRadius != null && resolvedWrapperBorderRadius !== ""
      ? resolvedWrapperBorderRadius
      : undefined;

  // When glass is active, strip `background` from the wrapper's inline style.
  // Inline styles beat @layer CSS rules so the hover rule can't override them.
  // Instead, a fill layer div rendered above the glass overlay reads the same
  // CSS vars (--element-btn-fill / --element-btn-fill-hover etc.) with no
  // competing inline style, so the CSS rules apply correctly.
  const wrapperStyle: CSSProperties = useMemo(() => {
    if (!hasGlassEffect) return rawWrapperStyle;
    const { background: _, ...rest } = rawWrapperStyle;
    return rest;
  }, [hasGlassEffect, rawWrapperStyle]);

  const exitMotion = useMemo(() => {
    const resolvedMotion = lowerThemeValueDeep(motion) as typeof motion;
    const base = mergeMotionDefaults(resolvedMotion ?? {}) ?? {};
    const exitFromPreset =
      exitPreset && typeof exitPreset === "string"
        ? getExitMotionFromPreset(exitPreset, {
            duration: model3DExit.exitDurationMs / 1000,
            ease: model3DExit.exitEasing,
          }).leave
        : undefined;
    const exitKeyframes = (base.leave as Record<string, unknown> | undefined) ??
      exitFromPreset ?? { opacity: 0 };
    return {
      ...base,
      from: base.from ?? { opacity: 1 },
      to: base.to ?? { opacity: 1 },
      leave: exitKeyframes as Record<string, string | number | number[]>,
      transition: {
        ...(typeof base.transition === "object" && base.transition ? base.transition : {}),
        duration: model3DExit.exitDurationMs / 1000,
        ease: model3DExit.exitEasing,
      },
    };
  }, [motion, exitPreset, model3DExit.exitDurationMs, model3DExit.exitEasing]);

  const policyMode = external ? "external" : "any";
  const resolvedHrefResult = href != null ? resolveAuthoredUrl(href, policyMode) : null;
  const safeHref = resolvedHrefResult?.ok ? resolvedHrefResult.url : null;

  const resolvedLabel = loading && loadingLabel != null ? loadingLabel : label;
  const hasLabel = resolvedLabel != null && resolvedLabel !== "";
  const hasVector = vectorBlock != null;
  const hasAction = !!action && !href;
  const resolvedLinkDefault = lowerThemeStringToCss(linkDefault);
  const resolvedLinkHover = lowerThemeStringToCss(linkHover);
  const resolvedLinkActive = lowerThemeStringToCss(linkActive);
  const contentWrapStyle: CSSProperties = useMemo(
    () =>
      hasLabel && hasVector
        ? {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--pb-button-label-gap)",
          }
        : {},
    [hasLabel, hasVector]
  );

  const handleActionPointerDown = useCallback(() => {
    if (!interactions?.onPointerDown) return;
    firePeblorAction(interactions.onPointerDown, "button");
  }, [interactions]);

  const handleActionPointerUp = useCallback(() => {
    if (!interactions?.onPointerUp) return;
    firePeblorAction(interactions.onPointerUp, "button");
  }, [interactions]);

  const handleDisabledLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  }, []);

  const handleActionButtonClick = useCallback(() => {
    if (disabled || loading) return;
    model3DExitRef.current.arm();
    if (!action) return;
    firePeblorAction(
      { type: action, payload: actionPayload } as Parameters<typeof firePeblorAction>[0],
      "button"
    );
  }, [disabled, loading, action, actionPayload]);

  const nakedSurfacePadding: CSSProperties = useMemo(
    () =>
      hasWrapper
        ? resolvedWrapperPadding != null
          ? { padding: resolvedWrapperPadding as string | number }
          : {}
        : {
            paddingTop: "var(--pb-button-naked-pad-y)",
            paddingBottom: "var(--pb-button-naked-pad-y)",
            paddingLeft: "var(--pb-button-naked-pad-x)",
            paddingRight: "var(--pb-button-naked-pad-x)",
            borderRadius: "var(--pb-button-naked-radius)",
          },
    [hasWrapper, resolvedWrapperPadding]
  );

  const content = (
    <span
      style={contentWrapStyle}
      className="inline-flex items-center justify-center gap-(--pb-button-label-gap)"
    >
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
      {hasVector && <ElementRenderer block={vectorBlock as ElementBlock} />}
    </span>
  );

  const inner =
    hasLink && safeHref ? (
      isInternal ? (
        <TransitionLink
          href={safeHref}
          className={linkClassName}
          style={{ ...linkStyle, ...nakedSurfacePadding }}
          aria-disabled={isDisabled || undefined}
          aria-busy={loading || undefined}
          tabIndex={isDisabled ? -1 : tabIndex}
          download={download as string | undefined}
          hrefLang={hreflang}
          ping={ping}
          referrerPolicy={referrerPolicy}
          {...(ariaProps ? ariaProps : {})}
          onClick={isDisabled ? handleDisabledLinkClick : undefined}
        >
          {content}
        </TransitionLink>
      ) : (
        <a
          href={safeHref}
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
          onClick={isDisabled ? handleDisabledLinkClick : undefined}
        >
          {content}
          {resolvedTarget === "_blank" ? (
            <span className="sr-only"> Opens in a new tab.</span>
          ) : null}
        </a>
      )
    ) : hasLink ? (
      <span
        className={linkClassName}
        style={{ ...linkStyle, ...nakedSurfacePadding }}
        tabIndex={tabIndex}
        {...(ariaProps ? ariaProps : {})}
      >
        {content}
      </span>
    ) : hasAction ? (
      <button
        type="button"
        onClick={handleActionButtonClick}
        onPointerDown={interactions?.onPointerDown ? handleActionPointerDown : undefined}
        onPointerUp={interactions?.onPointerUp ? handleActionPointerUp : undefined}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={`inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pb-ring)] ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          color: "inherit",
          font: "inherit",
          textAlign: "inherit",
          ...(hasWrapper ? { padding: resolvedWrapperPadding ?? "0" } : nakedSurfacePadding),
          ...(isDisabled ? { opacity: 0.6 } : {}),
        }}
      >
        {content}
      </button>
    ) : (
      content
    );

  const wrapperClassName = useMemo(
    () =>
      [
        "inline-flex",
        hasStateVars ? "element-btn-wrap" : "",
        isDisabled ? "element-btn-wrap--disabled" : "",
      ]
        .filter(Boolean)
        .join(" "),
    [hasStateVars, isDisabled]
  );

  // When glass is active, content must be position:relative so it paints above the absolute overlay.
  const glassLifted = hasGlassEffect ? (
    <span style={{ position: "relative" }}>{inner}</span>
  ) : (
    inner
  );

  // Glass lives inside whichever span carries the interactions (.element-btn-wrap) so that
  // scale/transform on that span moves the overlay together with the content.
  // `syncBorderRadius` mirrors `wrapperBorderRadius` on the glass overlay + filter sizing.
  const wrappedInner =
    hasWrapper || hasStateVars ? (
      <span
        ref={wrapperSpanRef}
        style={{
          ...wrapperStyle,
          ...bgMotionAnimationStyle,
          ...(hasGlassEffect ? { position: "relative" as const } : {}),
        }}
        className={wrapperClassName}
      >
        {hasGlassEffect && (
          <>
            <SectionGlassEffect
              effects={buttonEffects}
              sectionRef={glassTargetRef}
              variant="auto"
              syncBorderRadius={glassSyncBorderRadius}
            />
            {/* Fill layer: above glass, below content. No inline background so CSS hover
                vars (--element-btn-fill-hover etc.) apply without inline-style interference. */}
            <span
              aria-hidden
              className="element-btn-glass-fill absolute inset-0 pointer-events-none"
              style={{
                borderRadius: glassSyncBorderRadius ?? "inherit",
              }}
            />
          </>
        )}
        {hasWrapper && useRoundedGradientStroke ? (
          <span style={innerWrapperStyle} className="inline-flex">
            {glassLifted}
          </span>
        ) : (
          glassLifted
        )}
      </span>
    ) : (
      inner
    );

  const shellStyle: CSSProperties = {
    ...blockStyle,
    // Naked glass (no wrapper span): overlay still needs an anchor and border-radius on the shell.
    ...(hasGlassEffect && !hasWrapper && !hasStateVars
      ? {
          ...(blockStyle.position == null ? { position: "relative" as const } : {}),
          ...(resolvedWrapperBorderRadius != null
            ? { borderRadius: resolvedWrapperBorderRadius }
            : {}),
        }
      : {}),
  };

  const renderButtonShell = (child: ReactNode) => (
    <div
      ref={shellRef}
      className="shrink-0"
      style={shellStyle}
      role={role}
      tabIndex={!hasLink && !hasAction ? tabIndex : undefined}
    >
      {/* Naked glass only — when there's a wrapper span the overlay renders inside it above. */}
      {hasGlassEffect && !hasWrapper && !hasStateVars && (
        <SectionGlassEffect
          effects={buttonEffects}
          sectionRef={shellRef}
          variant="auto"
          syncBorderRadius={glassSyncBorderRadius}
        />
      )}
      {child}
    </div>
  );

  if (model3DExit.hasExit) {
    return (
      <AnimatePresence>
        {model3DExit.showButton && (
          <MotionFromJson key="button-exit" motion={exitMotion}>
            {renderButtonShell(wrappedInner)}
          </MotionFromJson>
        )}
      </AnimatePresence>
    );
  }

  if (!model3DExit.isMounted) return null;

  return renderButtonShell(wrappedInner);
}
