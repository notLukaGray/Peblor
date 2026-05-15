"use client";

import { useMemo, useState } from "react";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { LayoutAdvancedPanel } from "@/app/dev/layout/_shared/LayoutAdvancedPanel";
import {
  LayoutHandoffPanelToggle,
  useLayoutHandoffPanelVisibility,
} from "@/app/dev/layout/_shared/layout-handoff-panel";
import { LayoutRendererPreviewCard } from "@/app/dev/layout/_shared/LayoutRendererPreviewCard";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import { sectionSchema } from "@pb/contracts";
import { SectionRenderer } from "@pb/runtime-react/renderers";
import { LayoutScrollControlsPanel } from "./LayoutScrollControlsPanel";
import {
  buildLayoutScrollSection,
  getDefaultLayoutScrollDraft,
  type LayoutScrollDraft,
} from "./layout-scroll-dev-state";

export function LayoutScrollDevClient() {
  const [draft, setDraft] = useState<LayoutScrollDraft>(getDefaultLayoutScrollDraft);
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  const [copied, setCopied] = useState(false);
  const { handoffPanelVisible, toggleHandoffPanel } = useLayoutHandoffPanelVisibility();

  const section = useMemo(() => buildLayoutScrollSection(draft), [draft]);
  const parsed = useMemo(() => sectionSchema.safeParse(section), [section]);
  const exportJson = useMemo(() => JSON.stringify(section, null, 2), [section]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures.
    }
  };

  const resetSection = () => {
    setDraft(getDefaultLayoutScrollDraft());
    setCopied(false);
  };

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetSection} onTotalReset={resetSection} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title="Layout · Scroll"
        showSessionBadge
        description="Configure scroll-container direction and sizing, then validate overflow with a chunky card preview. Copy the resulting section JSON for handoff."
        affects="scrollContainer sections — scroll direction, sizing, and layout alignment for horizontally or vertically scrolling regions"
        actions={
          <LayoutHandoffPanelToggle visible={handoffPanelVisible} onToggle={toggleHandoffPanel} />
        }
        meta={
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Phase 5 · Scroll containers
          </p>
        }
      />

      <div
        className={`grid grid-cols-1 gap-8 md:items-start ${
          handoffPanelVisible ? "md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)]" : ""
        }`}
      >
        <div className="space-y-6">
          <LayoutScrollControlsPanel draft={draft} setDraft={setDraft} />

          <LayoutRendererPreviewCard
            previewBreakpoint={previewBreakpoint}
            setPreviewBreakpoint={setPreviewBreakpoint}
            previewBodyClassName="overflow-hidden h-[min(36rem,78svh)]"
          >
            {parsed.success ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden [&>section]:flex [&>section]:min-h-0 [&>section]:flex-1 [&>section]:flex-col [&>section]:overflow-hidden">
                <SectionRenderer section={parsed.data} isFirstSection />
              </div>
            ) : (
              <p className="text-xs text-destructive">
                {parsed.error.issues[0]?.message ?? "Invalid section JSON"}
              </p>
            )}
          </LayoutRendererPreviewCard>
          <LayoutAdvancedPanel
            meta={{
              routeName: "Layout · Scroll",
              styleSlice: "scrollContainer (draft — not persisted to session)",
              sliceJson: exportJson,
            }}
          />
        </div>

        {handoffPanelVisible ? (
          <div className="space-y-6 md:sticky md:top-8">
            <section className="rounded-lg border border-border bg-card/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Handoff JSON
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Copy this section block into a page definition to seed scroll-container behavior.
              </p>
              <pre className="mt-3 max-h-[28rem] overflow-auto rounded border border-border/70 bg-background px-3 py-2 text-[10px] leading-relaxed text-foreground">
                {exportJson}
              </pre>
              <button
                type="button"
                onClick={copyExport}
                className="mt-3 rounded border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </DevWorkbenchPageShell>
  );
}
