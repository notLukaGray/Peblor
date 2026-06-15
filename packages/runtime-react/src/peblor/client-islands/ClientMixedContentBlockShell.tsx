"use client";

import { Suspense, useMemo } from "react";
import type { ComponentType, CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { ResponsiveValueOf } from "@pb/contracts/peblor/core/peblor-schemas/responsive-value-schemas";
import {
  buildSectionBaseStyle,
  type BuildSectionBaseStyleInput,
} from "@/peblor/utils/section-base-style-utils";
import {
  buildSectionContentWrapperStyle,
  sectionHeightCanStretchContent,
} from "@/peblor/section/SectionContentBlock/section-content-block-content-wrapper-style";
import {
  coalesceEmptyString,
  normalizeFlexAlignItemsValue,
  normalizeFlexJustifyContentValue,
  peblorJustifyContentForGap,
  resolveFrameGapCss,
  resolveFrameRowGapCss,
  resolveFrameColumnGapCss,
} from "@pb/core/layout";
import { getPbContentGuidelines } from "@pb/core/host";
import type { MixedSectionContentBlockIslandProps } from "./MixedSectionContentBlockIsland";
import { globals } from "@pb/runtime-react/core/lib/globals";

const MixedIsland = dynamic(() =>
  import("./MixedSectionContentBlockIsland").then(
    (mod) =>
      mod.MixedSectionContentBlockIsland as ComponentType<MixedSectionContentBlockIslandProps>
  )
) as ComponentType<MixedSectionContentBlockIslandProps>;

type Props = MixedSectionContentBlockIslandProps & {
  hydrationPriority?: "critical" | "approaching" | "idle";
};

/** Resolve a responsive value for the desktop breakpoint (SSR default). */
function desktop<T>(value: ResponsiveValueOf<T> | undefined): T | undefined {
  return resolveResponsiveValue(value, false);
}

/**
 * Compute the same base layout style that the MixedSectionContentBlockIsland
 * produces via useSectionBaseStyles → buildSectionBaseStyle. Everything that can
 * be rendered as HTML is rendered as HTML; only interactive features (sticky,
 * scroll effects, glass, motion) are deferred to the client island.
 */
function buildShellStyle(props: MixedSectionContentBlockIslandProps): CSSProperties {
  const isMobile = false;

  const input: BuildSectionBaseStyleInput = {
    width: desktop(props.width),
    height: desktop(props.height),
    minWidth: desktop(props.minWidth),
    maxWidth: desktop(props.maxWidth),
    minHeight: desktop(props.minHeight),
    maxHeight: desktop(props.maxHeight),
    align: desktop(props.selfAlign as BuildSectionBaseStyleInput["align"]),
    borderRadius: desktop(props.borderRadius),
    border: desktop(props.border) as BuildSectionBaseStyleInput["border"],
    resolvedOverflow: props.fixed ? "visible" : desktop(props.scroll),
    resolvedOverflowX: resolveResponsiveValue(props.scrollX, isMobile) as string | undefined,
    resolvedOverflowY: resolveResponsiveValue(props.scrollY, isMobile) as string | undefined,
    zIndex: props.layer as number | undefined,
    padding: desktop(props.padding),
    paddingTop: desktop(props.paddingTop),
    paddingRight: desktop(props.paddingRight),
    paddingBottom: desktop(props.paddingBottom),
    paddingLeft: desktop(props.paddingLeft),
    margin: desktop(props.margin),
    marginTop: desktop(props.marginTop),
    marginRight: desktop(props.marginRight),
    marginBottom: desktop(props.marginBottom),
    marginLeft: desktop(props.marginLeft),
    sectionGap: desktop(props.sectionGap),
    cursor: desktop(props.cursor) as BuildSectionBaseStyleInput["cursor"],
    aspectRatio: desktop(props.aspectRatio) as BuildSectionBaseStyleInput["aspectRatio"],
    opacity: desktop(props.opacity) as BuildSectionBaseStyleInput["opacity"],
    pointerEvents: desktop(props.interaction) as BuildSectionBaseStyleInput["pointerEvents"],
    userSelect: desktop(props.selectable) as BuildSectionBaseStyleInput["userSelect"],
    willChange: desktop(props.willChange) as BuildSectionBaseStyleInput["willChange"],
    resolvedPosition: desktop(props.position) as BuildSectionBaseStyleInput["resolvedPosition"],
    top: desktop(props.top),
    right: desktop(props.right),
    bottom: desktop(props.bottom),
    left: desktop(props.left),
    inset: desktop(props.inset),
    initialX: desktop(props.initialX),
    initialY: desktop(props.initialY),
    // Visual-only — deferred to the island, not needed for layout stability
    boxShadow: undefined,
    filter: undefined,
    backdropFilter: undefined,
    clipPath: undefined,
    resolvedEffects: undefined,
    resolvedFill: undefined,
    wrapperStyle: undefined,
    layers: undefined,
  };

  return buildSectionBaseStyle(input);
}

/**
 * Compute the content wrapper style — mirrors MixedSectionContentBlockIsland's
 * contentWrapperStyle but resolved for the desktop breakpoint (SSR default).
 *
 * This div wraps the element children inside the section and carries all
 * flex / gap layout so the shell and island produce identical DOM structure.
 * Hydration then becomes a style patch rather than a full DOM remount.
 */
function buildShellContentWrapperStyle(props: MixedSectionContentBlockIslandProps): CSSProperties {
  const pbContentGuidelines = getPbContentGuidelines();

  const resolvedContentWidth = desktop(props.contentWidth);
  const resolvedContentHeight = desktop(props.contentHeight);
  const resolvedFlexDirection =
    (coalesceEmptyString(desktop(props.flow)) as CSSProperties["flexDirection"] | undefined) ??
    pbContentGuidelines.frameFlexDirectionDefault;
  const resolvedAlignItems = normalizeFlexAlignItemsValue(
    coalesceEmptyString(desktop(props.align)) ?? pbContentGuidelines.frameAlignItemsDefault
  );
  const resolvedFlexWrap =
    (coalesceEmptyString(desktop(props.wrap)) as CSSProperties["flexWrap"] | undefined) ??
    pbContentGuidelines.frameFlexWrapDefault;

  const rawGap = coalesceEmptyString(desktop(props.gap));
  const rawRowGap = coalesceEmptyString(desktop(props.rowGap));
  const rawColumnGap = coalesceEmptyString(desktop(props.columnGap));
  const resolvedGap = resolveFrameGapCss(rawGap);
  const resolvedRowGap = resolveFrameRowGapCss(rawRowGap);
  const resolvedColumnGap = resolveFrameColumnGapCss(rawColumnGap);
  const resolvedJustifyContent = peblorJustifyContentForGap(
    normalizeFlexJustifyContentValue(
      coalesceEmptyString(desktop(props.distribute)) ??
        pbContentGuidelines.frameJustifyContentDefault
    ) as CSSProperties["justifyContent"] | undefined,
    rawGap
  );

  return {
    ...buildSectionContentWrapperStyle({
      resolvedContentWidth,
      resolvedContentHeight,
      // layers are not rendered in the shell so contentBackground is never needed
      sectionHasExplicitHeight: sectionHeightCanStretchContent(desktop(props.height)),
      elementCount: props.elementCount,
      contentBackground: undefined,
    }),
    display: "flex",
    flexDirection: resolvedFlexDirection,
    alignItems: resolvedAlignItems,
    flexWrap: resolvedFlexWrap,
    ...(resolvedJustifyContent ? { justifyContent: resolvedJustifyContent } : {}),
    ...(resolvedGap != null ? { gap: resolvedGap } : {}),
    ...(resolvedRowGap != null ? { rowGap: resolvedRowGap } : {}),
    ...(resolvedColumnGap != null ? { columnGap: resolvedColumnGap } : {}),
  };
}

export function ClientMixedContentBlockShell({ hydrationPriority = "idle", ...props }: Props) {
  const [shouldHydrate, setShouldHydrate] = useState(hydrationPriority === "critical");
  const hydratedRef = useRef(hydrationPriority === "critical");
  const ref = useRef<HTMLElement>(null);

  const {
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    selfAlign,
    borderRadius,
    border,
    scroll,
    scrollX,
    scrollY,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    margin,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    sectionGap,
    cursor,
    aspectRatio,
    opacity,
    interaction,
    selectable,
    willChange,
    position,
    fixed,
    top,
    right,
    bottom,
    left,
    inset,
    initialX,
    initialY,
    layer,
    contentWidth,
    contentHeight,
    flow,
    align,
    wrap,
    gap,
    rowGap,
    columnGap,
    distribute,
    elementCount,
    id,
    ariaLabel,
    children,
  } = props;

  const OVERFLOW_CLASS: Record<string, string> = {
    visible: "overflow-visible",
    auto: "overflow-auto",
    scroll: "overflow-scroll",
  };

  /** Resolve overflow once; used for both the style object and the Tailwind class. */
  const resolvedShellOverflow = fixed ? "visible" : (desktop(scroll) ?? "hidden");
  const shellOverflowClass = OVERFLOW_CLASS[resolvedShellOverflow] ?? "overflow-hidden";

  const shellStyle = useMemo(
    () =>
      buildShellStyle({
        width,
        height,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        selfAlign,
        borderRadius,
        border,
        scroll,
        scrollX,
        scrollY,
        padding,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        margin,
        marginTop,
        marginRight,
        marginBottom,
        marginLeft,
        sectionGap,
        cursor,
        aspectRatio,
        opacity,
        interaction,
        selectable,
        willChange,
        position,
        fixed,
        top,
        right,
        bottom,
        left,
        inset,
        initialX,
        initialY,
        layer,
      } as MixedSectionContentBlockIslandProps),
    [
      width,
      height,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      selfAlign,
      borderRadius,
      border,
      scroll,
      scrollX,
      scrollY,
      padding,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      margin,
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
      sectionGap,
      cursor,
      aspectRatio,
      opacity,
      interaction,
      selectable,
      willChange,
      position,
      fixed,
      top,
      right,
      bottom,
      left,
      inset,
      initialX,
      initialY,
      layer,
    ]
  );
  const contentWrapperStyle = useMemo(
    () =>
      buildShellContentWrapperStyle({
        contentWidth,
        contentHeight,
        flow,
        align,
        wrap,
        gap,
        rowGap,
        columnGap,
        distribute,
        height,
        elementCount,
      } as MixedSectionContentBlockIslandProps),
    [
      contentWidth,
      contentHeight,
      flow,
      align,
      wrap,
      gap,
      rowGap,
      columnGap,
      distribute,
      height,
      elementCount,
    ]
  );

  useEffect(() => {
    if (hydratedRef.current) return;

    const rootMargin = hydrationPriority === "approaching" ? "150%" : "50%";

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          hydratedRef.current = true;
          setShouldHydrate(true);
          io.disconnect();
        }
      },
      { rootMargin: `${rootMargin} 0px` }
    );

    if (ref.current) io.observe(ref.current);

    const timeoutId = setTimeout(() => {
      hydratedRef.current = true;
      setShouldHydrate(true);
    }, 4000);

    return () => {
      io.disconnect();
      clearTimeout(timeoutId);
    };
  }, [hydrationPriority]);

  const resolvedAriaLabel = desktop(ariaLabel) ?? id ?? globals.stringsAriaLabelContentBlock;

  const shellFallback = (
    <section
      ref={ref}
      id={id}
      className={`relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0 ${shellOverflowClass}`}
      style={shellStyle}
      aria-label={resolvedAriaLabel}
      data-section-type="contentBlock"
      data-elements-count={elementCount}
    >
      <div className="relative z-[var(--pb-z-raised)] min-h-0" style={contentWrapperStyle}>
        {children}
      </div>
    </section>
  );

  if (!shouldHydrate) {
    // Shell: matches the DOM structure of MixedSectionContentBlockIsland so
    // hydration patches styles rather than remounting nodes (no structural CLS).
    return shellFallback;
  }

  // Suspense fallback keeps children visible while the dynamic island module loads,
  // preventing a content flash when shouldHydrate first becomes true.
  return (
    <Suspense fallback={shellFallback}>
      <MixedIsland {...props} />
    </Suspense>
  );
}
