"use client";

import { useEffect, useState } from "react";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { LayoutAdvancedPanel } from "@/app/dev/layout/_shared/LayoutAdvancedPanel";
import {
  LayoutHandoffPanelToggle,
  useLayoutHandoffPanelVisibility,
} from "@/app/dev/layout/_shared/layout-handoff-panel";
import { getDefaultStyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import { mergeWorkbenchSessionWithDefaults } from "@/app/dev/workbench/workbench-defaults";
import {
  getWorkbenchSession,
  patchWorkbenchStyle,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import {
  BreakpointThresholdsPanel,
  ContentWidthPresetsPanel,
  SectionMarginScalePanel,
  SectionPreviewPanel,
  type LayoutSectionsSlices,
} from "./LayoutSectionsPanels";

function pickLayoutSlices(
  style: ReturnType<typeof getWorkbenchSession>["style"]
): LayoutSectionsSlices {
  return {
    breakpoints: style.breakpoints,
    contentWidths: style.contentWidths,
    sectionMarginScale: style.sectionMarginScale,
    sectionMarginScaleLocks: style.sectionMarginScaleLocks,
  };
}

function readSlicesFromSession(): LayoutSectionsSlices {
  return pickLayoutSlices(getWorkbenchSession().style);
}

/**
 * Produce a hydration-safe initial state by merging defaults without reading localStorage.
 *
 * Why this is necessary:
 * - During SSR, `getWorkbenchSession()` reads from localStorage which doesn't exist
 *   on the server. This would cause a "window is not defined" error.
 * - During hydration, the client immediately calls `getWorkbenchSession()` in a
 *   useEffect (line 54), which picks up the actual localStorage value. The initial
 *   state from this function is quickly replaced.
 * - Without this, the SSR-rendered HTML would not match the first client render,
 *   causing a React hydration mismatch warning.
 *
 * This is the standard Next.js pattern for "state that depends on localStorage":
 * 1. SSR renders with defaults (no localStorage).
 * 2. Client hydrates with same defaults (no mismatch).
 * 3. useEffect runs, reads localStorage, and updates state.
 */
function getHydrationSafeSlices(): LayoutSectionsSlices {
  return pickLayoutSlices(mergeWorkbenchSessionWithDefaults({ v: 2 }).style);
}

export function LayoutSectionsDevClient() {
  const [slices, setSlices] = useState<LayoutSectionsSlices>(getHydrationSafeSlices);
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  const { handoffPanelVisible, toggleHandoffPanel } = useLayoutHandoffPanelVisibility();

  useEffect(() => {
    const session = getWorkbenchSession();
    patchWorkbenchStyle({ ...session.style, ...slices });
  }, [slices]);

  useEffect(() => {
    const syncFromSession = () => setSlices(readSlicesFromSession());
    syncFromSession();
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORKBENCH_SESSION_STORAGE_KEY) syncFromSession();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncFromSession);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(WORKBENCH_SESSION_CHANGED_EVENT, syncFromSession);
    };
  }, []);

  const resetSection = () => setSlices(pickLayoutSlices(getDefaultStyleToolPersistedV3()));

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetSection} onTotalReset={resetSection} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title="Layout · Sections"
        showSessionBadge
        description="Tune content width presets, section spacing scale, and responsive breakpoint thresholds — the horizontal rhythm and vertical cadence of every page."
        affects="section content width, margin scale, and responsive breakpoints — the structural skeleton every page is built on"
        actions={
          <LayoutHandoffPanelToggle visible={handoffPanelVisible} onToggle={toggleHandoffPanel} />
        }
        meta={
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Phase 5 · Section base foundations
          </p>
        }
      />

      <div
        className={`grid grid-cols-1 gap-8 md:items-start ${
          handoffPanelVisible ? "md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)]" : ""
        }`}
      >
        <div className="space-y-6">
          <ContentWidthPresetsPanel slices={slices} setSlices={setSlices} />
          <SectionMarginScalePanel slices={slices} setSlices={setSlices} />
          <BreakpointThresholdsPanel slices={slices} setSlices={setSlices} />
          <SectionPreviewPanel
            slices={slices}
            previewBreakpoint={previewBreakpoint}
            setPreviewBreakpoint={setPreviewBreakpoint}
          />
          <LayoutAdvancedPanel
            meta={{
              routeName: "Layout · Sections",
              styleSlice: "breakpoints + contentWidths + sectionMarginScale",
              sliceJson: JSON.stringify(slices, null, 2),
            }}
          />
        </div>

        {handoffPanelVisible ? (
          <div className="space-y-6 md:sticky md:top-8">
            <section className="rounded-lg border border-border bg-card/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Handoff notes
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                These controls update workbench style slices used by peblor foundation CSS: section
                margins, width presets, and breakpoints.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </DevWorkbenchPageShell>
  );
}
