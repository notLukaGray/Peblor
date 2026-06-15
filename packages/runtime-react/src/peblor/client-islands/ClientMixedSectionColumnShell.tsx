"use client";

import { Suspense, useMemo } from "react";
import type { ComponentType, CSSProperties } from "react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  buildSectionBaseStyle,
  type BuildSectionBaseStyleInput,
} from "@/peblor/utils/section-base-style-utils";
import { getColumnFlexStyles } from "@pb/core/layout";
import { gridTemplateFromFlexStyles } from "@/peblor/section/SectionColumnGrid/section-column-grid-rendering";
import type { MixedSectionColumnIslandProps } from "./MixedSectionColumnIsland";
import { globals } from "@pb/runtime-react/core/lib/globals";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import type { ResponsiveValueOf } from "@pb/contracts/peblor/core/peblor-schemas/responsive-value-schemas";

const MixedIsland = dynamic(() =>
  import("./MixedSectionColumnIsland").then(
    (mod) => mod.MixedSectionColumnIsland as ComponentType<MixedSectionColumnIslandProps>
  )
) as ComponentType<MixedSectionColumnIslandProps>;

type Props = MixedSectionColumnIslandProps & {
  hydrationPriority?: "critical" | "approaching" | "idle";
};

/** Resolve a responsive value for the desktop breakpoint (SSR default). */
function desktop<T>(value: ResponsiveValueOf<T> | undefined): T | undefined {
  return resolveResponsiveValue(value, false);
}

/**
 * Compute the same base layout style that MixedSectionColumnIsland produces
 * via useSectionBaseStyles. Visual-only properties (fill, layers, glass effects,
 * box-shadow, backdrop-filter) are deferred to the island so the shell style is
 * layout-only — no colour or decoration that could cause a visible flash.
 */
function buildColumnShellSectionStyle(props: MixedSectionColumnIslandProps): CSSProperties {
  const input: BuildSectionBaseStyleInput = {
    width: desktop(props.width),
    height: desktop(props.height),
    minWidth: desktop(props.minWidth),
    maxWidth: desktop(props.maxWidth),
    minHeight: desktop(props.minHeight),
    maxHeight: desktop(props.maxHeight),
    align: desktop(props.selfAlign as BuildSectionBaseStyleInput["align"]),
    borderRadius: desktop(props.borderRadius),
    border: desktop(props.border),
    resolvedOverflow: desktop(props.scroll),
    resolvedOverflowX: desktop(props.scrollX),
    resolvedOverflowY: desktop(props.scrollY),
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
    // Visual-only — deferred to the island
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
 * Compute the inner grid wrapper style — layout-only, without gridTemplateColumns.
 * Responsive gridTemplateColumns is handled by buildShellResponsiveCss so it works
 * at both breakpoints before the island hydrates.
 */
function buildColumnGridStyle(props: MixedSectionColumnIslandProps): CSSProperties {
  const resolvedColumnGap =
    (desktop(props.columnGaps as unknown as string | [string, string]) as string | undefined) ??
    "1rem";
  return {
    position: "relative",
    zIndex: globals.zIndexColumnGrid,
    display: "grid",
    // gridTemplateColumns intentionally omitted — see buildShellResponsiveCss
    gap: resolvedColumnGap,
    width: "100%",
  };
}

/** Resolve grid-template-columns for a given breakpoint (isMobile flag). */
function resolveShellGridTemplate(props: MixedSectionColumnIslandProps, isMobile: boolean): string {
  const resolvedColumns =
    (resolveResponsiveValue(props.columns as unknown as number | [number, number], isMobile) as
      | number
      | undefined) ?? 1;
  const resolvedColumnWidths = resolveResponsiveValue(
    props.columnWidths as unknown as unknown[] | [unknown[], unknown[]],
    isMobile
  );
  const columnFlexStyles = getColumnFlexStyles(
    resolvedColumnWidths as Parameters<typeof getColumnFlexStyles>[0],
    resolvedColumns
  );
  return gridTemplateFromFlexStyles(columnFlexStyles, { forCssGrid: true });
}

/**
 * Build responsive CSS for the shell's pre-hydration grid.
 *
 * - Mobile base: grid-template-columns at the mobile value
 * - Desktop @media: grid-template-columns at the desktop value (when different)
 * - columnAssignments: !important mobile reset so inline gridColumn values on
 *   column wrapper divs (from MixedServerSectionColumn) don't create implicit
 *   phantom columns in the narrower grid.
 *
 * Returns null when id is absent (no scoping possible; caller falls back to inline).
 */
function buildShellResponsiveCss(
  props: MixedSectionColumnIslandProps,
  bpPx: number
): string | null {
  if (!props.id) return null;
  const mobileTpl = resolveShellGridTemplate(props, true);
  const desktopTpl = resolveShellGridTemplate(props, false);
  const gridSel = `#${props.id}>[data-pb-grid]`;
  let css = `${gridSel}{grid-template-columns:${mobileTpl}}`;
  if (mobileTpl !== desktopTpl) {
    css += `@media(min-width:${bpPx}px){${gridSel}{grid-template-columns:${desktopTpl}}}`;
  }
  // MixedServerSectionColumn bakes gridColumn inline on column wrappers for gap-safe
  // desktop placement. Reset on mobile so the narrower grid doesn't grow implicit columns.
  if (props.columnAssignments != null) {
    css += `@media(max-width:${bpPx - 1}px){${gridSel}>[data-pb-col]{grid-column:auto!important}}`;
  }
  return css;
}

export function ClientMixedSectionColumnShell({ hydrationPriority = "idle", ...props }: Props) {
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
    top,
    right,
    bottom,
    left,
    inset,
    initialX,
    initialY,
    layer,
    id,
    columns,
    columnWidths,
    columnGaps,
    columnAssignments,
    ariaLabel,
    children,
  } = props;

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

  const sectionStyle = useMemo(
    () =>
      buildColumnShellSectionStyle({
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
        top,
        right,
        bottom,
        left,
        inset,
        initialX,
        initialY,
        layer,
      } as MixedSectionColumnIslandProps),
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
  const bpPx = globals.uiBreakpointDesktopPx;
  const shellCss = useMemo(
    () =>
      buildShellResponsiveCss(
        { id, columns, columnWidths, columnAssignments } as MixedSectionColumnIslandProps,
        bpPx
      ),
    [id, columns, columnWidths, columnAssignments, bpPx]
  );
  // When no id (rare), bake desktop gridTemplateColumns inline as fallback.
  const gridStyle: CSSProperties = useMemo(
    () => ({
      ...buildColumnGridStyle({ columnGaps } as MixedSectionColumnIslandProps),
      ...(shellCss == null
        ? {
            gridTemplateColumns: resolveShellGridTemplate(
              { id, columns, columnWidths } as MixedSectionColumnIslandProps,
              false
            ),
          }
        : {}),
    }),
    [shellCss, columnGaps, id, columns, columnWidths]
  );
  const resolvedAriaLabel = desktop(ariaLabel) ?? id ?? globals.stringsAriaLabelColumnLayout;

  const shellFallback = (
    <section
      ref={ref}
      id={id}
      className="relative z-[var(--pb-z-raised)] flex shrink-0 flex-col min-h-0"
      style={sectionStyle}
      aria-label={resolvedAriaLabel}
      data-section-type="sectionColumn"
    >
      {shellCss && (
        <style href={`pb-col-${id}`} precedence="low">
          {shellCss}
        </style>
      )}
      <div style={gridStyle} data-pb-grid="">
        {children}
      </div>
    </section>
  );

  if (!shouldHydrate) {
    // Shell: children visible and indexable before JS activates.
    // DOM structure matches MixedSectionColumnIsland so hydration patches styles, no CLS.
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
