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
import { SectionRenderer } from "@pb/runtime-react/renderers";
import { sectionSchema } from "@pb/contracts";
import {
  buildLayoutColumnsSection,
  getDefaultLayoutColumnsDraft,
  type LayoutColumnsDraft,
} from "./layout-columns-dev-state";
import { LayoutColumnsControlsPanel } from "./LayoutColumnsControlsPanel";

export function LayoutColumnsDevClient() {
  const [draft, setDraft] = useState<LayoutColumnsDraft>(getDefaultLayoutColumnsDraft);
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  const [copied, setCopied] = useState(false);
  const { handoffPanelVisible, toggleHandoffPanel } = useLayoutHandoffPanelVisibility();

  const section = useMemo(() => buildLayoutColumnsSection(draft), [draft]);
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
    setDraft(getDefaultLayoutColumnsDraft());
    setCopied(false);
  };

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetSection} onTotalReset={resetSection} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title="Layout · Columns"
        showSessionBadge
        description="Configure section-column grid defaults: column count, mode (fixed vs auto), gap, and responsive column control. Validate with a live preview and copy the resulting section JSON."
        affects="sectionColumn grid layouts — column count, mode, and gap inside all content grid blocks"
        actions={
          <LayoutHandoffPanelToggle visible={handoffPanelVisible} onToggle={toggleHandoffPanel} />
        }
        meta={
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Phase 5 · Grid layouts
          </p>
        }
      />

      <div
        className={`grid grid-cols-1 gap-8 md:items-start ${
          handoffPanelVisible ? "md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)]" : ""
        }`}
      >
        <div className="space-y-6">
          <LayoutColumnsControlsPanel draft={draft} setDraft={setDraft} />

          <LayoutRendererPreviewCard
            previewBreakpoint={previewBreakpoint}
            setPreviewBreakpoint={setPreviewBreakpoint}
            previewBodyClassName="min-h-[30rem]"
          >
            {parsed.success ? (
              <SectionRenderer section={parsed.data} isFirstSection />
            ) : (
              <p className="text-xs text-destructive">
                {parsed.error.issues[0]?.message ?? "Invalid section JSON"}
              </p>
            )}
          </LayoutRendererPreviewCard>
          <LayoutAdvancedPanel
            meta={{
              routeName: "Layout · Columns",
              styleSlice: "sectionColumn (draft — not persisted to session)",
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
                Copy this section block into a page definition. Values reflect the current control
                state.
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
