"use client";

import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import {
  StyleFoundationSlicesPanel,
  type StyleFoundationSlices,
} from "./style-foundation-slices-panel";
import { StyleGlobalSeedsPanel } from "./style-global-seeds-panel";
import { StyleGuidelineSections } from "./style-guideline-sections";
import { StyleHandoffPanel } from "./style-handoff-panel";
import { useStyleDevController } from "./style-dev-controller";
import { renderStyleScopeDescription } from "./style-scope-description";
import type { StyleDevScope } from "./style-dev-config";

export type { StyleFoundationSlices };

export function StyleDevClient({ scope = "foundations" }: { scope?: StyleDevScope }) {
  const {
    allUnlocked,
    copyExport,
    exportCopied,
    exportText,
    foundationSlices,
    guidelines,
    locks,
    onFieldEdit,
    onFoundationSlicesChange,
    onSeedsChange,
    previewBreakpoint,
    previewDensity,
    previewVars,
    proposed,
    resetStyleTool,
    resetVisibleSection,
    seeds,
    setPreviewBreakpoint,
    setPreviewDensity,
    toggleLock,
    view,
    visibleKeys,
    visibleSections,
  } = useStyleDevController(scope);

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetVisibleSection} onTotalReset={resetStyleTool} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Style"
        title={view.title}
        description={renderStyleScopeDescription(scope)}
        meta={
          <>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {view.kicker}
            </p>
            {visibleKeys.length > 0 && allUnlocked ? (
              <p className="mt-2 text-amber-700 dark:text-amber-400">
                Full-fluid: every row follows seeds. Lock any token to pin it.
              </p>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)] md:items-start">
        <div className="space-y-6">
          {view.showGlobalSeeds ? (
            <StyleGlobalSeedsPanel
              seeds={seeds}
              previewDensity={previewDensity}
              previewBreakpoint={previewBreakpoint}
              onSeedsChange={onSeedsChange}
              onPreviewDensityChange={setPreviewDensity}
              onPreviewBreakpointChange={setPreviewBreakpoint}
            />
          ) : null}
          {view.showGlobalSeeds ? (
            <StyleFoundationSlicesPanel
              seeds={seeds}
              foundationSlices={foundationSlices}
              onSeedsChange={onSeedsChange}
              onFoundationSlicesChange={onFoundationSlicesChange}
            />
          ) : null}
          <StyleGuidelineSections
            visibleSections={visibleSections}
            locks={locks}
            guidelines={guidelines}
            proposed={proposed}
            onFieldEdit={onFieldEdit}
            toggleLock={toggleLock}
            previewVars={previewVars}
            previewDensity={previewDensity}
            previewBreakpoint={previewBreakpoint}
          />
        </div>

        <div className="md:sticky md:top-8">
          <StyleHandoffPanel
            exportText={exportText}
            exportCopied={exportCopied}
            onCopy={copyExport}
          />
        </div>
      </div>
    </DevWorkbenchPageShell>
  );
}
