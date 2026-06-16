import type { TriggerAction, SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { globals } from "@pb/runtime-react/core/lib/globals";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import type { PeblorPageProps } from "@pb/core/resolve";
import { buildPageDensityCssVars } from "@pb/contracts/peblor/core/page-density";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { PeblorRenderer } from "@/peblor/hooks";
import { PageScrollProvider } from "@/peblor/section/position/page-scroll-provider";

const FigmaExportDiagnosticsBridge =
  process.env.NODE_ENV === "development"
    ? dynamic(() =>
        import("@/peblor/dev/FigmaExportDiagnosticsBridge").then((m) => ({
          default: m.FigmaExportDiagnosticsBridge,
        }))
      )
    : (null as unknown as ComponentType<{ diagnostics?: unknown }>);
import { PageForcedTheme, pageForcedThemeInlineScript } from "./PageForcedTheme";

export type PeblorPageWrapperProps = PeblorPageProps & {
  nonce?: string;
  mainClassName?: string;

  mainStyle?: React.CSSProperties;

  articleClassName?: string;
};

function stripFixedFields(section: SectionBlock): SectionBlock {
  const {
    fixed: _fixed,
    fixedPosition: _fixedPosition,
    fixedOffset: _fixedOffset,
    ...rest
  } = section as SectionBlock & {
    fixed?: unknown;
    fixedPosition?: unknown;
    fixedOffset?: unknown;
  };
  return rest as SectionBlock;
}

export function PeblorPage({
  page,
  resolvedBg,
  resolvedSections,
  bgDefinitions,
  serverIsMobile,
  overlaySections,
  nonce,
  mainClassName = "relative w-full min-h-screen",
  mainStyle = {
    paddingTop: `calc(var(--nav-height, ${globals.uiNavHeightFallbackPx}px) + env(safe-area-inset-top, 0px))`,
    paddingBottom: `${globals.uiPageBottomPaddingPx}px`,
    paddingLeft: "env(safe-area-inset-left, 0px)",
    paddingRight: "env(safe-area-inset-right, 0px)",
    backgroundColor: "var(--pb-secondary)",
  },
  articleClassName = "w-full",
}: PeblorPageWrapperProps) {
  const density = page.density ?? "balanced";
  const forcedTheme =
    page.forcedTheme === "light" || page.forcedTheme === "dark" ? page.forcedTheme : undefined;
  const densityVars = buildPageDensityCssVars(density) as React.CSSProperties;
  const mergedMainStyle: React.CSSProperties = {
    ...mainStyle,
    ...densityVars,
  };

  // Sort overlays: top-positioned (header) first, bottom-positioned (footer) last.
  const sortedOverlays = useMemo(
    () =>
      overlaySections
        ? [...overlaySections].sort((a, b) => {
            const aPos = (a as SectionBlock & { fixedPosition?: string }).fixedPosition ?? "top";
            const bPos = (b as SectionBlock & { fixedPosition?: string }).fixedPosition ?? "top";
            if (aPos === bPos) return 0;
            return aPos === "top" ? -1 : 1;
          })
        : [],
    [overlaySections]
  );
  const strippedOverlaySections = useMemo(
    () => sortedOverlays.map((section) => stripFixedFields(section)),
    [sortedOverlays]
  );

  const inner = (
    <div className={mainClassName} style={mergedMainStyle} data-pb-density={density}>
      <article className={articleClassName} aria-label={page.title} data-liquid-snapshot-root="">
        <h1 className="sr-only">{page.title}</h1>
        <PeblorRenderer
          resolvedBg={resolvedBg}
          resolvedSections={resolvedSections}
          onPageProgress={page.onPageProgress as TriggerAction | undefined}
          bgDefinitions={bgDefinitions}
          transitions={
            page.transitions as
              | BackgroundTransitionEffect
              | BackgroundTransitionEffect[]
              | undefined
          }
          serverIsMobile={serverIsMobile}
        />
      </article>
    </div>
  );

  const pageContent =
    page.scroll != null ? (
      <PageScrollProvider scroll={page.scroll}>{inner}</PageScrollProvider>
    ) : (
      inner
    );

  return (
    <>
      {forcedTheme ? (
        <>
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: pageForcedThemeInlineScript(forcedTheme) }}
          />
          <PageForcedTheme theme={forcedTheme} />
        </>
      ) : null}
      <FigmaExportDiagnosticsBridge diagnostics={page.figmaExportDiagnostics} />
      {sortedOverlays.map((section, i) => {
        const s = section as SectionBlock & {
          fixedPosition?: string;
          zIndex?: number;
          layer?: number;
          id?: string;
        };
        const fixedPosition = s.fixedPosition ?? "top";
        const resolvedZIndex = s.zIndex ?? s.layer ?? (fixedPosition === "top" ? 100 : 50);
        const wrapperStyle: React.CSSProperties = {
          ...densityVars,
          position: "fixed",
          left: 0,
          right: 0,
          zIndex: resolvedZIndex,
          pointerEvents: "none",
          ...(fixedPosition === "bottom" ? { bottom: 0 } : { top: 0 }),
        };
        return (
          <div key={s.id ?? `overlay-${i}`} style={wrapperStyle}>
            <div style={{ pointerEvents: "auto" }}>
              <PeblorRenderer
                resolvedBg={null}
                resolvedSections={[strippedOverlaySections[i] as SectionBlock]}
                serverIsMobile={serverIsMobile}
              />
            </div>
          </div>
        );
      })}
      {pageContent}
    </>
  );
}
