"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useDeviceType } from "@pb/runtime-react/core/providers/device-type-provider";
import type { ElementBlock } from "@pb/contracts/types";
import { getPbContentGuidelines } from "@pb/core/host";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
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
  sectionEffectsToStyle,
} from "@pb/core/layout";
import { useVideoControlContext } from "./ElementVideo/VideoControlContext";
import { useAudioControlContext } from "./ElementAudio/AudioControlContext";
import { useSlotDefaultWrapperStyle } from "@/peblor/elements/ElementModule/ModuleSlotContext";
import { useDimensionGestureContext } from "./Shared/DimensionGestureContext";
import { firePeblorAction } from "@/peblor/triggers";
import { SectionGlassEffect } from "@/peblor/section/stack/SectionGlassEffect";
import { ElementModuleChildren } from "./ElementModule/ElementModuleChildren";
import { ReorderableElementList } from "@/peblor/section/SectionContentBlock/ReorderableElementList";
import { MotionFromJson } from "@/peblor/integrations/framer-motion/motion-from-json";
import { DisclosureProvider } from "./ElementModule/DisclosureContext";
import {
  buildBorderGradientOverlayStyle,
  type BorderGradient,
} from "./ElementModule/element-module-style-utils";
import { reconcileElementOrderWithDefinitions } from "@pb/core/modules";
import { lowerThemeStyleObject, lowerThemeValueDeep } from "@/peblor/theme/theme-string";
import {
  useElementEffects,
  hasElementInteractions,
} from "@/peblor/elements/Shared/use-element-effects";
import { globals } from "@pb/runtime-react/core/lib/globals";

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
  flow,
  align,
  distribute,
  gap,
  rowGap,
  columnGap,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  wrap,
  flex,
  overflow,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  selfAlign,
  fixed,
  figmaConstraints,
  borderRadius,
  wrapperStyle: groupWrapperStyle,
  borderGradient,
  effects,
  layoutChildren,
  interactions,
  disclosure,
  glassLayer = "background",
  reorderable,
  reorderAxis,
  reorderDragUnit,
  reorderDragBehavior,
  scrollStorageKey,
}: Props & {
  overflow?: string;
  layoutChildren?: boolean;
  glassLayer?: "background" | "foreground";
  reorderable?: boolean;
  reorderAxis?: "x" | "y";
  reorderDragUnit?: "frame" | "content";
  reorderDragBehavior?: "elasticSnap" | "free" | "none";
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
  disclosure?: {
    mode?: "tap" | "hover" | "tapOrHover";
    anchor?: "left" | "center" | "right";
    collapsedWidth?: string | number;
    expandedWidth?: string | number;
    collapsedHeight?: string | number;
    expandedHeight?: string | number;
    durationMs?: number;
    closeDelayMs?: number;
    initiallyOpen?: boolean;
    storageKey?: string;
    panelKeys?: string[];
    triggerKeys?: string[];
    collapsedStyle?: CSSProperties;
    expandedStyle?: CSSProperties;
  };
  scrollStorageKey?: string;
}) {
  const pbContentGuidelines = getPbContentGuidelines();
  const { isMobile } = useDeviceType();
  const videoCtx = useVideoControlContext();
  const audioCtx = useAudioControlContext();
  const slotDefaultWrapper = useSlotDefaultWrapperStyle();
  const groupRef = useRef<HTMLDivElement>(null);
  const [disclosureOpen, setDisclosureOpen] = useState(() => !!disclosure?.initiallyOpen);
  const [userOverride, setUserOverride] = useState(false);
  const closeDisclosureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Read stored disclosure state during render (not in an effect) so no
  // setState-in-effect occurs. After the user interacts, userOverride takes
  // precedence over the stored value. During SSR typeof window is undefined
  // so the stored value is null and initiallyOpen is used.
  const storedDisclosureValue =
    typeof window !== "undefined" && !userOverride && disclosure?.storageKey
      ? window.localStorage.getItem(disclosure.storageKey)
      : null;
  const disclosureHydrated =
    !disclosure?.storageKey || storedDisclosureValue !== null || userOverride;
  const isOpen = userOverride
    ? disclosureOpen
    : storedDisclosureValue === "open"
      ? true
      : storedDisclosureValue === "closed"
        ? false
        : disclosureOpen;
  const disclosureOpenForRender = disclosureHydrated ? isOpen : !!disclosure?.initiallyOpen;
  const resolvedGroupWrapperStyle = lowerThemeStyleObject(
    groupWrapperStyle as Record<string, unknown> | undefined
  ) as CSSProperties | undefined;
  const resolvedBorderGradient = lowerThemeValueDeep(borderGradient) as BorderGradient | undefined;
  const { resolvedEffects: groupEffects, hasGlassEffect } = useElementEffects(effects);
  const effectCssStyle = useMemo(
    () => sectionEffectsToStyle((groupEffects ?? []).filter((effect) => effect.type !== "glass")),
    [groupEffects]
  );
  const glassInForeground = hasGlassEffect && glassLayer === "foreground";
  const contentStackingStyle: CSSProperties | undefined =
    hasGlassEffect && !glassInForeground
      ? { position: "relative", zIndex: globals.zIndexRaised }
      : undefined;
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
    const disclosurePanelKeys = new Set(disclosure?.panelKeys ?? []);
    const visibleBlocks =
      disclosure && !disclosureOpenForRender && disclosurePanelKeys.size > 0
        ? rawBlocks.filter((b) => {
            const id = (b as ElementBlock & { id?: string }).id;
            return !id || !disclosurePanelKeys.has(id);
          })
        : rawBlocks;
    if (videoCtx) {
      return visibleBlocks.filter((b) =>
        videoCtx.resolveShowWhen((b as ElementBlock & { showWhen?: string }).showWhen)
      );
    }
    if (audioCtx) {
      return visibleBlocks.filter((b) =>
        audioCtx.resolveShowWhen((b as ElementBlock & { showWhen?: string }).showWhen)
      );
    }
    return visibleBlocks;
  }, [rawBlocks, videoCtx, audioCtx, disclosure, disclosureOpenForRender]);

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
      selfAlign,
      fixed,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      figmaConstraints,
    },
    isMobile
  );
  const resolvedFlexDirectionValue = resolveResponsiveValue(flow, isMobile);
  const resolvedAlignItemsValue = resolveResponsiveValue(align, isMobile);
  const resolvedJustifyContentValue = resolveResponsiveValue(distribute, isMobile);
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
    (coalesceEmptyString(wrap) as CSSProperties["flexWrap"] | undefined) ??
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
  const disclosureMode = disclosure?.mode ?? "tap";
  const disclosureDurationMs = disclosure?.durationMs ?? 250;
  const disclosureTransformOrigin =
    disclosure?.anchor === "right"
      ? "right center"
      : disclosure?.anchor === "center"
        ? "center center"
        : "left center";
  const disclosureStyle: CSSProperties | undefined = disclosure
    ? {
        overflow: "hidden",
        transformOrigin: disclosureTransformOrigin,
      }
    : undefined;
  const disclosureAnimate = disclosure
    ? {
        ...(disclosureOpenForRender
          ? {
              ...(disclosure.expandedStyle ?? {}),
              ...(disclosure.expandedWidth != null ? { width: disclosure.expandedWidth } : {}),
              ...(disclosure.expandedHeight != null ? { height: disclosure.expandedHeight } : {}),
            }
          : {
              ...(disclosure.collapsedStyle ?? {}),
              ...(disclosure.collapsedWidth != null ? { width: disclosure.collapsedWidth } : {}),
              ...(disclosure.collapsedHeight != null ? { height: disclosure.collapsedHeight } : {}),
            }),
      }
    : undefined;
  const disclosureMotion = disclosure
    ? {
        initial: false,
        animate: disclosureAnimate,
        transition: disclosureHydrated
          ? { duration: disclosureDurationMs / 1000, ease: [0.25, 0.1, 0.25, 1] }
          : { duration: 0 },
      }
    : undefined;
  const groupStyle: CSSProperties = {
    ...groupStyleBase,
    ...((hasBorderGradient || hasGlassEffect) && groupStyleBase.position == null
      ? { position: "relative" }
      : {}),
    ...(effectCssStyle != null && Object.keys(effectCssStyle).length > 0 ? effectCssStyle : {}),
  };

  const clearDisclosureTimer = useCallback(() => {
    if (closeDisclosureTimerRef.current) {
      clearTimeout(closeDisclosureTimerRef.current);
      closeDisclosureTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const storageKey = disclosure?.storageKey;
    if (!storageKey || typeof window === "undefined" || !disclosureHydrated) return;
    window.localStorage.setItem(storageKey, isOpen ? "open" : "closed");
  }, [disclosure?.storageKey, isOpen, disclosureHydrated]);

  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!scrollStorageKey || typeof window === "undefined") return;
    const el = groupRef.current;
    if (!el) return;
    const saved = window.localStorage.getItem(scrollStorageKey);
    if (saved != null) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed) && parsed > 0) {
        requestAnimationFrame(() => {
          el.scrollTop = parsed;
        });
      }
    }
    const handleScroll = () => {
      if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
      scrollSaveTimerRef.current = setTimeout(() => {
        window.localStorage.setItem(scrollStorageKey, String(el.scrollTop));
      }, 100);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }
    };
  }, [scrollStorageKey]);

  useEffect(() => {
    return () => {
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
        scrollSaveTimerRef.current = null;
      }
    };
  }, []);

  const scheduleDisclosureClose = useCallback(() => {
    if (!disclosure) return;
    setUserOverride(true);
    clearDisclosureTimer();
    const delay = disclosure.closeDelayMs ?? 0;
    if (delay > 0) {
      closeDisclosureTimerRef.current = setTimeout(() => setDisclosureOpen(false), delay);
    } else {
      setDisclosureOpen(false);
    }
  }, [clearDisclosureTimer, disclosure]);

  const toggleDisclosure = useCallback(() => {
    setUserOverride(true);
    clearDisclosureTimer();
    setDisclosureOpen((open) => !open);
  }, [clearDisclosureTimer]);

  useEffect(() => clearDisclosureTimer, [clearDisclosureTimer]);

  const hasInteractions = hasElementInteractions(interactions);

  const rootStyle: CSSProperties = {
    ...groupStyle,
    ...(disclosureStyle ?? {}),
    ...(interactions?.cursor ? { cursor: interactions.cursor } : {}),
  };
  const rootClassName = [
    resolvedFlexValue ? undefined : "shrink-0",
    groupStyle.scrollbarWidth === "none" ? "scroll-container-hide-scrollbar" : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const hasDisclosureTriggers = (disclosure?.triggerKeys?.length ?? 0) > 0;
  const rootHandlers = {
    onClick:
      disclosure || interactions?.onClick
        ? (event: React.MouseEvent<HTMLElement>) => {
            const target = event.target as HTMLElement | null;
            const isFormControl = target?.closest("input, textarea, select, option") != null;
            if (
              disclosure &&
              !hasDisclosureTriggers &&
              !isFormControl &&
              (disclosureMode === "tap" || disclosureMode === "tapOrHover")
            ) {
              setUserOverride(true);
              clearDisclosureTimer();
              setDisclosureOpen((open) => !open);
            }
            if (interactions?.onClick) firePeblorAction(interactions.onClick as never, "trigger");
          }
        : undefined,
    onPointerEnter:
      disclosure || interactions?.onHoverEnter
        ? () => {
            if (disclosure && (disclosureMode === "hover" || disclosureMode === "tapOrHover")) {
              setUserOverride(true);
              clearDisclosureTimer();
              setDisclosureOpen(true);
            }
            if (interactions?.onHoverEnter)
              firePeblorAction(interactions.onHoverEnter as never, "trigger");
          }
        : undefined,
    onPointerLeave:
      disclosure || interactions?.onHoverLeave
        ? () => {
            if (disclosure && (disclosureMode === "hover" || disclosureMode === "tapOrHover")) {
              scheduleDisclosureClose();
            }
            if (interactions?.onHoverLeave)
              firePeblorAction(interactions.onHoverLeave as never, "trigger");
          }
        : undefined,
    onPointerDown: interactions?.onPointerDown
      ? () => firePeblorAction(interactions.onPointerDown as never, "trigger")
      : undefined,
    onPointerUp: interactions?.onPointerUp
      ? () => firePeblorAction(interactions.onPointerUp as never, "trigger")
      : undefined,
    onDoubleClick: interactions?.onDoubleClick
      ? () => firePeblorAction(interactions.onDoubleClick as never, "trigger")
      : undefined,
  };

  const childrenContent = reorderable ? (
    <ReorderableElementList
      elements={blocks}
      axis={reorderAxis ?? "y"}
      dragUnit={reorderDragUnit ?? "frame"}
      dragBehavior={reorderDragBehavior ?? "elasticSnap"}
      flexDirection={resolvedFlexDirection}
      flexWrap={resolvedFlexWrap}
      justifyContent={resolvedJustifyContent}
      gap={resolvedFlexGap}
    />
  ) : (
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
  );
  const childrenInner = (
    <>
      {!glassInForeground && (
        <SectionGlassEffect effects={groupEffects} sectionRef={groupRef} variant="auto" />
      )}
      {hasBorderGradient ? (
        <div
          aria-hidden
          style={buildBorderGradientOverlayStyle(
            resolvedBorderGradient as BorderGradient,
            groupStyle.borderRadius
          )}
        />
      ) : null}
      {contentStackingStyle ? (
        <div style={contentStackingStyle}>{childrenContent}</div>
      ) : (
        childrenContent
      )}
      {glassInForeground && (
        <SectionGlassEffect effects={groupEffects} sectionRef={groupRef} variant="auto" />
      )}
    </>
  );
  const children = disclosure ? (
    <DisclosureProvider
      value={{ triggerKeys: new Set(disclosure.triggerKeys ?? []), toggle: toggleDisclosure }}
    >
      {childrenInner}
    </DisclosureProvider>
  ) : (
    childrenInner
  );

  if (disclosure && disclosureMotion) {
    return (
      <MotionFromJson
        ref={groupRef}
        motion={disclosureMotion as never}
        useMotionAsIs
        style={rootStyle}
        className={rootClassName}
        tabIndex={hasInteractions ? 0 : undefined}
        {...rootHandlers}
      >
        {children}
      </MotionFromJson>
    );
  }

  return (
    <div
      ref={groupRef}
      style={rootStyle}
      className={rootClassName}
      tabIndex={hasInteractions ? 0 : undefined}
      {...rootHandlers}
    >
      {children}
    </div>
  );
}
