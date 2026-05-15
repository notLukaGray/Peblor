import type { SectionBlock } from "@pb/contracts/peblor/core/peblor-schemas";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import { buildPageDensityCssVars } from "@pb/contracts/peblor/core/page-density";
import type { PeblorPageWrapperProps } from "../PeblorPage";
import { analyzeBlockCapabilities, type BlockCapabilityNode } from "../analyze/block-capabilities";
import { pageForcedThemeInlineScript } from "../page-forced-theme-inline-script";
import { PeblorServerRenderer } from "./PeblorServerRenderer";
import { ClientPageRuntimeIsland } from "../client-islands/ClientPageRuntimeIsland";

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
  mainClassName = "relative w-full min-h-screen",
  mainStyle = {
    paddingTop: "calc(var(--nav-height, 64px) + env(safe-area-inset-top, 0px))",
    paddingBottom: "48px",
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
    <main className={mainClassName} style={mergedMainStyle} data-pb-density={density}>
      <article className={articleClassName} aria-label={page.title} data-liquid-snapshot-root="">
        <h1 className="sr-only">{page.title}</h1>
        <PeblorServerRenderer
          resolvedBg={resolvedBg}
          resolvedSections={resolvedSections}
          bgDefinitions={bgDefinitions}
          transitions={
            page.transitions as
              | BackgroundTransitionEffect
              | BackgroundTransitionEffect[]
              | undefined
          }
          serverIsMobile={serverIsMobile}
          sectionAnalysis={analysis.tree.children.filter(
            (c): c is BlockCapabilityNode => c.kind === "section"
          )}
        />
      </article>
    </main>
  );
  const common = (
    <>
      {forcedTheme ? (
        <>
          <script dangerouslySetInnerHTML={{ __html: pageForcedThemeInlineScript(forcedTheme) }} />
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
            id?: string;
          };
          const fixedPosition = overlay.fixedPosition ?? "top";
          const wrapperStyle: React.CSSProperties = {
            ...densityVars,
            position: "fixed",
            left: 0,
            right: 0,
            zIndex: overlay.zIndex ?? (fixedPosition === "top" ? 100 : 50),
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

  if (
    analysis.usesPageRuntime ||
    analysis.hasClientBlocks ||
    analysis.hasMixedBlocks ||
    forcedTheme
  ) {
    return (
      <ClientPageRuntimeIsland
        forcedTheme={forcedTheme}
        serverIsMobile={serverIsMobile}
        scroll={page.scroll}
      >
        {output}
      </ClientPageRuntimeIsland>
    );
  }

  return output;
}
