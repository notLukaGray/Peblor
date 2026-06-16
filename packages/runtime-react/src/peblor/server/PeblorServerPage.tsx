import type { SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import { globals } from "@pb/runtime-react/core/lib/globals";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import { buildPageDensityCssVars } from "@pb/contracts/peblor/core/page-density";
import type { PeblorPageWrapperProps } from "../PeblorPage";
import {
  analyzeBlockCapabilities,
  assignSectionHydrationPriorities,
  type BlockCapabilityNode,
} from "../analyze/block-capabilities";
import { analyzeSectionOnlyCapabilities } from "../analyze/section-only-capabilities";
import { pageForcedThemeInlineScript } from "../page-forced-theme-inline-script";
import { PeblorServerRenderer } from "./PeblorServerRenderer";
import { ClientPageRuntimeIsland } from "../client-islands/ClientPageRuntimeIsland";
import { ClientBackgroundIsland } from "../client-islands/ClientBackgroundIsland";
import { PageModalsIsland } from "../client-islands/PageModalsIsland";

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

export async function PeblorServerPage({
  page,
  resolvedBg,
  resolvedSections,
  bgDefinitions,
  serverIsMobile,
  overlaySections,
  resolvedModals,
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
  const analysis = analyzeBlockCapabilities({
    resolvedBg,
    resolvedSections,
    overlaySections,
    transitions: page.transitions as
      | BackgroundTransitionEffect
      | BackgroundTransitionEffect[]
      | undefined,
    scroll: page.scroll,
  });

  const renderMode = (page as Record<string, unknown>).renderMode as string | undefined;
  const isBackgroundIslandMode = renderMode === "background-island";

  // In background-island mode, re-analyze sections without background propagation.
  // This prevents the background from forcing all sections to client classification.
  const sectionAnalysis = isBackgroundIslandMode
    ? analyzeSectionOnlyCapabilities({
        resolvedBg: null,
        resolvedSections,
        overlaySections,
      })
    : analysis;

  const density = page.density ?? "balanced";
  const forcedTheme =
    page.forcedTheme === "light" || page.forcedTheme === "dark" ? page.forcedTheme : undefined;
  const FigmaExportDiagnosticsBridge =
    process.env.NODE_ENV === "development"
      ? (await import("../dev/FigmaExportDiagnosticsBridge")).FigmaExportDiagnosticsBridge
      : null;
  const densityVars = buildPageDensityCssVars(density) as React.CSSProperties;
  const mergedMainStyle: React.CSSProperties = {
    ...mainStyle,
    ...densityVars,
  };
  const sortedOverlays = overlaySections
    ? [...overlaySections].sort((a, b) => {
        const aPos = (a as SectionBlock & { fixedPosition?: string }).fixedPosition ?? "top";
        const bPos = (b as SectionBlock & { fixedPosition?: string }).fixedPosition ?? "top";
        if (aPos === bPos) return 0;
        return aPos === "top" ? -1 : 1;
      })
    : [];
  const strippedOverlaySections = sortedOverlays.map((section) => stripFixedFields(section));
  const inner = (
    <div className={mainClassName} style={mergedMainStyle} data-pb-density={density}>
      {/* Background island — mounts independently, covers full page */}
      {isBackgroundIslandMode && resolvedBg ? (
        <ClientBackgroundIsland
          bg={resolvedBg}
          bgDefinitions={bgDefinitions}
          transitions={
            page.transitions as
              | BackgroundTransitionEffect
              | BackgroundTransitionEffect[]
              | undefined
          }
        />
      ) : null}
      <article className={articleClassName} aria-label={page.title} data-liquid-snapshot-root="">
        <h1 className="sr-only">{page.title}</h1>
        <PeblorServerRenderer
          // In background-island mode pass null bg — sections don't own the background
          resolvedBg={isBackgroundIslandMode ? null : resolvedBg}
          resolvedSections={resolvedSections}
          bgDefinitions={bgDefinitions}
          transitions={
            isBackgroundIslandMode
              ? undefined
              : (page.transitions as
                  | BackgroundTransitionEffect
                  | BackgroundTransitionEffect[]
                  | undefined)
          }
          serverIsMobile={serverIsMobile}
          sectionAnalysis={assignSectionHydrationPriorities(
            sectionAnalysis.tree.children.filter(
              (c): c is BlockCapabilityNode => c.kind === "section"
            )
          )}
        />
      </article>
    </div>
  );
  const common = (
    <>
      {forcedTheme ? (
        <>
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: pageForcedThemeInlineScript(forcedTheme) }}
          />
        </>
      ) : null}
      {FigmaExportDiagnosticsBridge ? (
        <FigmaExportDiagnosticsBridge diagnostics={page.figmaExportDiagnostics} />
      ) : null}
    </>
  );

  const output =
    sortedOverlays.length === 0 ? (
      <>
        {common}
        {inner}
      </>
    ) : (
      <>
        {common}
        {sortedOverlays.map((section, i) => {
          const overlay = section as SectionBlock & {
            fixedPosition?: string;
            zIndex?: number;
            layer?: number;
            id?: string;
          };
          const fixedPosition = overlay.fixedPosition ?? "top";
          const wrapperStyle: React.CSSProperties = {
            ...densityVars,
            position: "fixed",
            left: 0,
            right: 0,
            zIndex: overlay.zIndex ?? overlay.layer ?? (fixedPosition === "top" ? 100 : 50),
            pointerEvents: "none",
            ...(fixedPosition === "bottom" ? { bottom: 0 } : { top: 0 }),
          };
          return (
            <div key={overlay.id ?? `overlay-${i}`} style={wrapperStyle}>
              <div style={{ pointerEvents: "auto" }}>
                <PeblorServerRenderer
                  resolvedBg={null}
                  resolvedSections={[strippedOverlaySections[i] as SectionBlock]}
                  serverIsMobile={serverIsMobile}
                />
              </div>
            </div>
          );
        })}
        {inner}
      </>
    );

  const modalsEl =
    resolvedModals && resolvedModals.length > 0 ? (
      <PageModalsIsland modals={resolvedModals} serverIsMobile={serverIsMobile} />
    ) : null;

  // In background-island mode, the wrap decision is based on section analysis alone
  // (the background is independently isolated in its own island).
  const effectiveAnalysis = isBackgroundIslandMode ? sectionAnalysis : analysis;

  // Pure static page: no client blocks, no mixed blocks, no page runtime, no
  // forced theme. Render entirely as server components — zero client JS.
  if (
    !effectiveAnalysis.usesPageRuntime &&
    !effectiveAnalysis.hasClientBlocks &&
    !effectiveAnalysis.hasMixedBlocks &&
    !forcedTheme
  ) {
    if (modalsEl) {
      return (
        <>
          {output}
          {modalsEl}
        </>
      );
    }
    return output;
  }

  // Page has client/mixed/runtime content. Wrap in ClientPageRuntimeIsland to
  // provide ServerBreakpointProvider, PageScrollProvider (scroll only), and
  // PeblorRuntimeEffects (triggers/actions only). Static sections remain
  // server-rendered — they're passed as children through the client boundary
  // but are not hydrated (React preserves server HTML for static children).
  return (
    <ClientPageRuntimeIsland
      forcedTheme={forcedTheme}
      serverIsMobile={serverIsMobile}
      scroll={page.scroll}
      needsRuntimeEffects={effectiveAnalysis.hasClientBlocks || effectiveAnalysis.usesPageRuntime}
      needsBreakpointProvider={
        serverIsMobile !== undefined &&
        (effectiveAnalysis.hasClientBlocks || effectiveAnalysis.hasMixedBlocks)
      }
    >
      {output}
      {modalsEl}
    </ClientPageRuntimeIsland>
  );
}
