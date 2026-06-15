"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useInsertionEffect, useMemo, useRef } from "react";
import {
  getElementLayoutStyle,
  getElementTransformStyle,
  sectionEffectsToStyle,
  extractElementResponsiveLayoutStyles,
  RESPONSIVE_LAYOUT_CSS_KEYS,
  type ElementLayoutTransformOptions,
} from "@pb/core/layout";
import { buildResponsiveStyle, type ResponsiveStyleInput } from "./responsive-style";
import { firePeblorAction } from "@/peblor/triggers";
import type {
  PeblorAction,
  ElementLayout,
  SectionEffect,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";
import {
  useElementEffects,
  hasElementInteractions,
} from "@/peblor/elements/Shared/use-element-effects";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import { computeStateStyle, type StateStyleInput } from "./state-style";

type LayoutProps = Pick<
  ElementLayoutTransformOptions,
  "width" | "height" | "align" | "marginTop" | "marginBottom" | "marginLeft" | "marginRight"
> & {
  zIndex?: number;
  constraints?: ElementLayout["constraints"];
  effects?: SectionEffect[];
  [key: string]: unknown;
};

type TransformProps = Pick<
  ElementLayoutTransformOptions,
  "rotate" | "flipHorizontal" | "flipVertical"
>;

export type ElementInteractions = {
  onClick?: PeblorAction;
  onHoverEnter?: PeblorAction;
  onHoverLeave?: PeblorAction;
  onPointerDown?: PeblorAction;
  onPointerUp?: PeblorAction;
  onDoubleClick?: PeblorAction;
  cursor?: string;
};

type Props = {
  layout: LayoutProps;
  transform?: TransformProps;
  children: ReactNode;
  /** Choose whether glass overlays the content or sits behind it. */
  glassLayer?: "background" | "foreground";
  /** Inner div overflow; default "hidden". Use "visible" for range/slider so thumb isn't clipped. */
  overflow?: "hidden" | "visible";
  /** Optional extra props on the figure (e.g. aria-busy). */
  figureProps?: React.ComponentPropsWithoutRef<"figure">;
  /** Universal element interactions from JSON. */
  interactions?: ElementInteractions;
  /** Universal state styles (hover/focus/focus-visible/active/disabled) from the element base schema. */
  stateStyles?: StateStyleInput;
};

/**
 * Shared wrapper for elements that use layout + optional transform.
 * Supports universal pointer/click interactions from JSON.
 */
export function ElementLayoutWrapper({
  layout,
  transform,
  children,
  glassLayer = "background",
  overflow = "hidden",
  figureProps,
  interactions,
  stateStyles,
}: Props) {
  const { isMobile } = useDeviceType();
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  // ── State styles (hover/focus/focus-visible/active/disabled) ────────────
  // Merge explicit stateStyles prop with fields on layout (elements that spread their
  // full block props into layout will carry hoverStyle/focusStyle/etc. via the catchall).
  const resolvedStateStyles: StateStyleInput | null = useMemo(() => {
    const fromLayout = layout as Record<string, unknown>;
    const merged: StateStyleInput = {
      id: (stateStyles?.id ?? (typeof fromLayout.id === "string" ? fromLayout.id : undefined)) as
        | string
        | undefined,
      hoverStyle: (stateStyles?.hoverStyle ?? fromLayout.hoverStyle) as
        | Record<string, string | number>
        | undefined,
      focusStyle: (stateStyles?.focusStyle ?? fromLayout.focusStyle) as
        | Record<string, string | number>
        | undefined,
      focusVisibleStyle: (stateStyles?.focusVisibleStyle ?? fromLayout.focusVisibleStyle) as
        | Record<string, string | number>
        | undefined,
      activeStyle: (stateStyles?.activeStyle ?? fromLayout.activeStyle) as
        | Record<string, string | number>
        | undefined,
      disabledStyle: (stateStyles?.disabledStyle ?? fromLayout.disabledStyle) as
        | Record<string, string | number>
        | undefined,
    };
    return merged;
  }, [layout, stateStyles]);
  const { className: stateStyleClass, css: stateStyleCss } = useMemo(
    () => computeStateStyle(resolvedStateStyles ?? {}),
    [resolvedStateStyles]
  );
  useInsertionEffect(() => {
    if (!stateStyleCss || !stateStyleClass) return;
    // Deduplicate: SSR already emitted this <style> tag via ServerElementRenderer
    // (hoisted to <head> by React 19). Check before injecting to avoid post-hydration
    // duplicates that would persist in the DOM.
    if (document.head.querySelector(`style[data-pb-st="${stateStyleClass}"]`)) return;
    const el = document.createElement("style");
    el.setAttribute("data-pb-st", stateStyleClass);
    el.textContent = stateStyleCss;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [stateStyleCss, stateStyleClass]);

  // ── Responsive layout style injection (stage 3) ──────────────────────────
  // Extract responsive layout values from the raw layout prop and emit as scoped <style>.
  const responsiveLayoutResult = useMemo(() => {
    const rawLayout = layout as Record<string, unknown>;
    const styles = extractElementResponsiveLayoutStyles(rawLayout);
    if (Object.keys(styles).length === 0) {
      return {
        className: undefined as string | undefined,
        css: undefined as string | undefined,
        needsContainer: false,
      };
    }
    return buildResponsiveStyle({
      id: typeof rawLayout.id === "string" ? rawLayout.id : undefined,
      styles,
    } as ResponsiveStyleInput);
  }, [layout]);
  const {
    className: responsiveStyleClass,
    css: responsiveStyleCss,
    needsContainer: _responsiveNeedsContainer,
  } = responsiveLayoutResult;
  useInsertionEffect(() => {
    if (!responsiveStyleCss || !responsiveStyleClass) return;
    // Deduplicate: SSR already emitted this <style> tag via ServerElementRenderer
    // (hoisted to <head> by React 19). Check before injecting to avoid post-hydration
    // duplicates that would persist in the DOM.
    if (document.head.querySelector(`style[data-pb-rs="${responsiveStyleClass}"]`)) return;
    const el = document.createElement("style");
    el.setAttribute("data-pb-rs", responsiveStyleClass);
    el.textContent = responsiveStyleCss;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [responsiveStyleCss, responsiveStyleClass]);

  const resolvedLayout = useMemo(
    () => ({
      ...layout,
      wrapperStyle: lowerThemeStyleObject(
        layout.wrapperStyle as Record<string, unknown> | undefined
      ),
    }),
    [layout]
  );
  const { resolvedEffects: surfaceEffects, hasGlassEffect } = useElementEffects(layout.effects);
  // When a glass effect has a clip-path (non-rectangular shape), skip overflow:hidden —
  // the SVG clipPath on the <figure> handles shape clipping instead.
  const glassHasClipPath = (surfaceEffects ?? []).some(
    (effect) => effect.type === "glass" && !!(effect as { clipPath?: string }).clipPath
  );
  const glassInForeground = hasGlassEffect && glassLayer === "foreground";
  const nonGlassEffectStyle = useMemo(
    () => sectionEffectsToStyle((surfaceEffects ?? []).filter((effect) => effect.type !== "glass")),
    [surfaceEffects]
  );
  const layoutStyle: CSSProperties = (() => {
    const raw = getElementLayoutStyle(resolvedLayout as Partial<ElementLayout>, isMobile);
    if (!responsiveStyleClass) return raw;
    const stripped = { ...raw };
    for (const key of RESPONSIVE_LAYOUT_CSS_KEYS) {
      const v = (layout as Record<string, unknown>)[key];
      if (v !== undefined && v !== null && typeof v === "object") {
        delete (stripped as Record<string, unknown>)[key];
      }
    }
    return stripped;
  })();
  const transformStyle = getElementTransformStyle(
    transform ? { ...resolvedLayout, ...transform } : undefined
  );
  const innerStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: overflow as "hidden" | "visible",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...(layoutStyle.borderRadius != null ? { borderRadius: layoutStyle.borderRadius } : {}),
    ...(hasGlassEffect
      ? {
          position: "relative" as const,
          ...(glassInForeground ? {} : { zIndex: globals.zIndexRaised }),
        }
      : {}),
    ...transformStyle,
  };

  const hasInteractions = hasElementInteractions(interactions);

  const handleClick = useCallback(() => {
    if (interactions?.onClick) firePeblorAction(interactions.onClick, "trigger");
  }, [interactions]);

  const handlePointerEnter = useCallback(() => {
    if (interactions?.onHoverEnter) firePeblorAction(interactions.onHoverEnter, "trigger");
  }, [interactions]);

  const handlePointerLeave = useCallback(() => {
    if (interactions?.onHoverLeave) firePeblorAction(interactions.onHoverLeave, "trigger");
  }, [interactions]);

  const handlePointerDown = useCallback(() => {
    if (interactions?.onPointerDown) firePeblorAction(interactions.onPointerDown, "trigger");
  }, [interactions]);

  const handlePointerUp = useCallback(() => {
    if (interactions?.onPointerUp) firePeblorAction(interactions.onPointerUp, "trigger");
  }, [interactions]);

  const handleDoubleClick = useCallback(() => {
    if (interactions?.onDoubleClick) firePeblorAction(interactions.onDoubleClick, "trigger");
  }, [interactions]);

  const baseFigureStyle: CSSProperties = {
    ...layoutStyle,
    ...(hasGlassEffect && layoutStyle.position == null ? { position: "relative" as const } : {}),
    ...(hasGlassEffect && layoutStyle.borderRadius != null && !glassHasClipPath
      ? { overflow: "hidden" as const }
      : {}),
    ...nonGlassEffectStyle,
  };

  const interactionProps = hasInteractions
    ? {
        onClick: interactions?.onClick ? handleClick : undefined,
        onPointerEnter: interactions?.onHoverEnter ? handlePointerEnter : undefined,
        onPointerLeave: interactions?.onHoverLeave ? handlePointerLeave : undefined,
        onPointerDown: interactions?.onPointerDown ? handlePointerDown : undefined,
        onPointerUp: interactions?.onPointerUp ? handlePointerUp : undefined,
        onDoubleClick: interactions?.onDoubleClick ? handleDoubleClick : undefined,
        style: {
          ...baseFigureStyle,
          cursor: interactions?.cursor ?? (interactions?.onClick ? "pointer" : undefined),
        } as CSSProperties,
      }
    : {
        style: baseFigureStyle,
      };

  // Merge base class + state-style class + responsive-style class + any className from figureProps.
  // figureProps is spread after, so we exclude its className to avoid overriding the merged value.
  const { className: figureClassName, ...restFigureProps } = figureProps ?? {};
  const wrapperClassName = ["shrink-0 m-0", stateStyleClass, responsiveStyleClass, figureClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={surfaceRef} className={wrapperClassName} {...interactionProps} {...restFigureProps}>
      {!glassInForeground && (
        <SectionGlassEffect effects={surfaceEffects} sectionRef={surfaceRef} variant="auto" />
      )}
      <div style={innerStyle}>{children}</div>
      {glassInForeground && (
        <SectionGlassEffect effects={surfaceEffects} sectionRef={surfaceRef} variant="auto" />
      )}
    </div>
  );
}
