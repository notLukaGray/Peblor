import type { CSSProperties, ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";
import {
  getElementLayoutStyle,
  getElementTransformStyle,
  type ElementLayoutTransformOptions,
} from "@pb/core/layout";
import { firePeblorAction } from "@/peblor/triggers";
import type {
  PeblorAction,
  ElementLayout,
  SectionEffect,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeStyleObject, resolveThemeValueDeep } from "@/peblor/theme/theme-string";
import { coerceSectionEffects } from "@/peblor/elements/ElementModule/element-module-style-utils";

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
}: Props) {
  const themeMode = usePeblorThemeMode();
  const surfaceRef = useRef<HTMLElement | null>(null);
  const resolvedLayout = useMemo(
    () => ({
      ...layout,
      wrapperStyle: resolveThemeStyleObject(
        layout.wrapperStyle as Record<string, unknown> | undefined,
        themeMode
      ),
      effects: resolveThemeValueDeep(layout.effects, themeMode),
    }),
    [layout, themeMode]
  );
  const surfaceEffects = useMemo(
    () => coerceSectionEffects(resolvedLayout.effects),
    [resolvedLayout.effects]
  );
  const hasGlassEffect = (surfaceEffects ?? []).some((effect) => effect.type === "glass");
  // When a glass effect has a clip-path (non-rectangular shape), skip overflow:hidden —
  // the SVG clipPath on the <figure> handles shape clipping instead.
  const glassHasClipPath = (surfaceEffects ?? []).some(
    (effect) => effect.type === "glass" && !!(effect as { clipPath?: string }).clipPath
  );
  const glassInForeground = hasGlassEffect && glassLayer === "foreground";
  const layoutStyle = getElementLayoutStyle(resolvedLayout as Partial<ElementLayout>);
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
      ? { position: "relative" as const, ...(glassInForeground ? {} : { zIndex: 1 }) }
      : {}),
    ...transformStyle,
  };

  const hasInteractions = !!(
    interactions?.onClick ||
    interactions?.onHoverEnter ||
    interactions?.onHoverLeave ||
    interactions?.onPointerDown ||
    interactions?.onPointerUp ||
    interactions?.onDoubleClick
  );

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

  return (
    <figure ref={surfaceRef} className="shrink-0 m-0" {...interactionProps} {...figureProps}>
      {!glassInForeground && (
        <SectionGlassEffect effects={surfaceEffects} sectionRef={surfaceRef} variant="auto" />
      )}
      <div style={innerStyle}>{children}</div>
      {glassInForeground && (
        <SectionGlassEffect effects={surfaceEffects} sectionRef={surfaceRef} variant="auto" />
      )}
    </figure>
  );
}
