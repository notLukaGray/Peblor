"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import type { ElementBlock } from "@pb/contracts/types";
import { getPbContentGuidelines } from "@pb/core/host";
import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import {
  scaleRadiusForDensity,
  scaleSpaceShorthandForDensity,
} from "@pb/contracts/peblor/core/page-density";
import {
  coalesceEmptyString,
  getElementLayoutStyle,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  peblorOverlapGapToCss,
  resolveFrameColumnGapCss,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
} from "@pb/core/layout";
import { useVideoControlContext } from "./ElementVideo/VideoControlContext";
import { useAudioControlContext } from "./ElementAudio/AudioControlContext";
import { useSlotDefaultWrapperStyle } from "@/peblor/elements/ElementModule/ModuleSlotContext";
import { useDimensionGestureContext } from "./Shared/DimensionGestureContext";
import { firePeblorAction } from "@/peblor/triggers";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { ElementModuleChildren } from "./ElementModule/ElementModuleChildren";
import {
  buildBorderGradientOverlayStyle,
  coerceSectionEffects,
  type BorderGradient,
} from "./ElementModule/element-module-style-utils";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { usePeblorThemeMode } from "@/peblor/theme/use-peblor-theme-mode";
import { resolveThemeStyleObject, resolveThemeValueDeep } from "@/peblor/theme/theme-string";

type Props = Extract<ElementBlock, { type: "elementGroup" }>;

export function ElementModuleGroup({
  section,
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  display = "flex",
  flexDirection,
  alignItems,
  justifyContent,
  gap,
  rowGap,
  columnGap,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  flexWrap,
  flex,
  overflow,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  align,
  figmaConstraints,
  borderRadius,
  wrapperStyle: groupWrapperStyle,
  borderGradient,
  effects,
  layoutChildren,
  interactions,
}: Props & {
  overflow?: string;
  layoutChildren?: boolean;
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  interactions?: {
    onClick?: unknown;
    onHoverEnter?: unknown;
    onHoverLeave?: unknown;
    onPointerDown?: unknown;
    onPointerUp?: unknown;
    onDoubleClick?: unknown;
    cursor?: string;
  };
}) {
  const pbContentGuidelines = getPbContentGuidelines();
  const { isMobile } = useDeviceType();
  const themeMode = usePeblorThemeMode();
  const videoCtx = useVideoControlContext();
  const audioCtx = useAudioControlContext();
  const slotDefaultWrapper = useSlotDefaultWrapperStyle();
  const groupRef = useRef<HTMLDivElement>(null);
  const resolvedGroupWrapperStyle = resolveThemeStyleObject(
    groupWrapperStyle as Record<string, unknown> | undefined,
    themeMode
  ) as CSSProperties | undefined;
  const resolvedBorderGradient = resolveThemeValueDeep(borderGradient, themeMode) as
    | BorderGradient
    | undefined;
  const groupEffects = useMemo(
    () => coerceSectionEffects(resolveThemeValueDeep(effects, themeMode)),
    [effects, themeMode]
  );
  const hasGlassEffect = (groupEffects ?? []).some((effect) => effect.type === "glass");
  // When inside a dimension gesture, all nested elementGroups fill their parent
  // so the visual layer grows with the animated container.
  const inDimensionGesture = useDimensionGestureContext();
  const resolvedWidth = inDimensionGesture ? "100%" : width;
  const resolvedHeight = inDimensionGesture ? "100%" : height;
  const definitions = (section?.definitions ?? {}) as Record<string, unknown>;
  const order = reconcileElementOrderWithDefinitions(section?.elementOrder, definitions);
  const idCounts = new Map<string, number>();
  const rawBlocks = order
    .map((key): ElementBlock | null => {
      const el = definitions[key] as unknown;
      if (
        !el ||
        typeof el !== "object" ||
        !("type" in el) ||
        (el as { type?: string }).type === "cssGradient"
      )
        return null;
      const candidate = el as ElementBlock & { id?: unknown };
      const baseId =
        typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : key;
      const nextCount = (idCounts.get(baseId) ?? 0) + 1;
      idCounts.set(baseId, nextCount);
      const uniqueId = nextCount === 1 ? baseId : `${baseId}__${nextCount}`;
      return { ...candidate, id: uniqueId } as ElementBlock;
    })
    .filter((x): x is ElementBlock => x != null);
  const blocks = useMemo(() => {
    if (videoCtx) {
      return rawBlocks.filter((b) =>
        videoCtx.resolveShowWhen((b as ElementBlock & { showWhen?: string }).showWhen)
      );
    }
    if (audioCtx) {
      return rawBlocks.filter((b) =>
        audioCtx.resolveShowWhen((b as ElementBlock & { showWhen?: string }).showWhen)
      );
    }
    return rawBlocks;
  }, [rawBlocks, videoCtx, audioCtx]);

  const getActionHandler = useMemo(
    () => (action: string | undefined, payload?: number) =>
      videoCtx?.getActionHandler(action, payload) ?? audioCtx?.getActionHandler(action, payload),
    [videoCtx, audioCtx]
  );

  const layoutStyle = getElementLayoutStyle(
    {
      width: resolvedWidth,
      height: resolvedHeight,
      borderRadius,
      constraints: {
        ...(minWidth != null ? { minWidth: String(minWidth) } : {}),
        ...(minHeight != null ? { minHeight: String(minHeight) } : {}),
        ...(maxWidth != null ? { maxWidth: String(maxWidth) } : {}),
        ...(maxHeight != null ? { maxHeight: String(maxHeight) } : {}),
      },
      align,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      figmaConstraints,
    },
    isMobile
  );
  const resolvedFlexDirectionValue = resolveResponsiveValue(flexDirection, isMobile);
  const resolvedAlignItemsValue = resolveResponsiveValue(alignItems, isMobile);
  const resolvedJustifyContentValue = resolveResponsiveValue(justifyContent, isMobile);
  const resolvedGapValue = resolveResponsiveValue(gap, isMobile);
  const resolvedPaddingValue = resolveResponsiveValue(padding, isMobile);
  const resolvedPaddingTop = resolveResponsiveValue(paddingTop, isMobile);
  const resolvedPaddingRight = resolveResponsiveValue(paddingRight, isMobile);
  const resolvedPaddingBottom = resolveResponsiveValue(paddingBottom, isMobile);
  const resolvedPaddingLeft = resolveResponsiveValue(paddingLeft, isMobile);
  const resolvedFlexValue = resolveResponsiveValue(flex, isMobile);

  const resolvedFlexDirection =
    (coalesceEmptyString(resolvedFlexDirectionValue) as
      | CSSProperties["flexDirection"]
      | undefined) ?? pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(resolvedAlignItemsValue) ?? pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(flexWrap) as CSSProperties["flexWrap"] | undefined) ??
    pbContentGuidelines.frameFlexWrapDefault;

  const layoutRadius = layoutStyle.borderRadius;
  const effectiveBorderRadius =
    layoutRadius != null && String(layoutRadius).trim() !== ""
      ? layoutRadius
      : scaleRadiusForDensity(pbContentGuidelines.frameBorderRadiusDefault);

  const hasBorderGradient =
    resolvedBorderGradient != null &&
    typeof resolvedBorderGradient === "object" &&
    typeof resolvedBorderGradient.stroke === "string" &&
    (typeof resolvedBorderGradient.width === "string" ||
      typeof resolvedBorderGradient.width === "number");

  const resolvedFlexGap = resolveFrameGapCss(resolvedGapValue);
  const resolvedRowGap = resolveFrameRowGapCss(
    rowGap === undefined || rowGap === null ? rowGap : String(rowGap)
  );
  const resolvedColGap = resolveFrameColumnGapCss(
    columnGap === undefined || columnGap === null ? columnGap : String(columnGap)
  );
  const overlapGap = peblorOverlapGapToCss(resolvedGapValue);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(resolvedJustifyContentValue) ??
        pbContentGuidelines.frameJustifyContentDefault
    ) as CSSProperties["justifyContent"] | undefined,
    resolvedGapValue
  );
  const hasExplicitPadding =
    padding != null ||
    paddingTop != null ||
    paddingRight != null ||
    paddingBottom != null ||
    paddingLeft != null;
  const framePaddingFallback = !hasExplicitPadding
    ? { padding: scaleSpaceShorthandForDensity(pbContentGuidelines.framePaddingDefault) }
    : {};

  const groupStyleBase: CSSProperties = {
    ...layoutStyle,
    borderRadius: effectiveBorderRadius,
    display: (display as CSSProperties["display"]) ?? "flex",
    flexDirection: resolvedFlexDirection,
    // Inside a dimension gesture, override alignItems to stretch so child wrappers
    // get a defined width (cross-axis fills the container) rather than shrinking to
    // content. Without this, width:100% on nested elements resolves to content-width.
    alignItems: inDimensionGesture ? "stretch" : resolvedAlignItems,
    ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
    ...(resolvedFlexGap != null ? { gap: resolvedFlexGap } : {}),
    ...(resolvedRowGap != null ? { rowGap: resolvedRowGap } : {}),
    ...(resolvedColGap != null ? { columnGap: resolvedColGap } : {}),
    ...(resolvedPaddingValue != null ? { padding: resolvedPaddingValue } : {}),
    ...(resolvedPaddingTop != null ? { paddingTop: resolvedPaddingTop } : {}),
    ...(resolvedPaddingRight != null ? { paddingRight: resolvedPaddingRight } : {}),
    ...(resolvedPaddingBottom != null ? { paddingBottom: resolvedPaddingBottom } : {}),
    ...(resolvedPaddingLeft != null ? { paddingLeft: resolvedPaddingLeft } : {}),
    ...framePaddingFallback,
    flexWrap: resolvedFlexWrap,
    ...(resolvedFlexValue ? { flex: resolvedFlexValue } : {}),
    overflow: (overflow ?? (layoutChildren ? "visible" : "hidden")) as CSSProperties["overflow"],
    ...(resolvedGroupWrapperStyle as CSSProperties),
  };
  const groupStyle: CSSProperties =
    (hasBorderGradient || hasGlassEffect) && groupStyleBase.position == null
      ? { ...groupStyleBase, position: "relative" }
      : groupStyleBase;

  const hasInteractions = !!(
    interactions?.onClick ||
    interactions?.onHoverEnter ||
    interactions?.onHoverLeave ||
    interactions?.onPointerDown ||
    interactions?.onPointerUp ||
    interactions?.onDoubleClick
  );

  return (
    <div
      ref={groupRef}
      style={{
        ...groupStyle,
        ...(interactions?.cursor ? { cursor: interactions.cursor } : {}),
      }}
      className={resolvedFlexValue ? undefined : "shrink-0"}
      onClick={
        interactions?.onClick
          ? () => firePeblorAction(interactions.onClick as never, "trigger")
          : undefined
      }
      onPointerEnter={
        interactions?.onHoverEnter
          ? () => firePeblorAction(interactions.onHoverEnter as never, "trigger")
          : undefined
      }
      onPointerLeave={
        interactions?.onHoverLeave
          ? () => firePeblorAction(interactions.onHoverLeave as never, "trigger")
          : undefined
      }
      onPointerDown={
        interactions?.onPointerDown
          ? () => firePeblorAction(interactions.onPointerDown as never, "trigger")
          : undefined
      }
      onPointerUp={
        interactions?.onPointerUp
          ? () => firePeblorAction(interactions.onPointerUp as never, "trigger")
          : undefined
      }
      onDoubleClick={
        interactions?.onDoubleClick
          ? () => firePeblorAction(interactions.onDoubleClick as never, "trigger")
          : undefined
      }
      tabIndex={hasInteractions ? 0 : undefined}
    >
      <SectionGlassEffect effects={groupEffects} sectionRef={groupRef} variant="auto" />
      {hasBorderGradient ? (
        <div
          aria-hidden
          style={buildBorderGradientOverlayStyle(
            resolvedBorderGradient as BorderGradient,
            groupStyle.borderRadius
          )}
        />
      ) : null}
      <ElementModuleChildren
        blocks={blocks}
        overlapGap={overlapGap}
        flexDirection={resolvedFlexDirection}
        parentAlignItems={resolvedAlignItems}
        inDimensionGesture={inDimensionGesture}
        isMobile={isMobile}
        layoutChildren={layoutChildren}
        slotDefaultWrapper={slotDefaultWrapper}
        getActionHandler={getActionHandler}
      />
    </div>
  );
}
