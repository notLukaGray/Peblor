"use client";

import { useState, type ReactNode } from "react";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import {
  WORKBENCH_PREVIEW_VIEWPORTS,
  WorkbenchPreviewProvider,
  type WorkbenchPreviewBreakpoint,
} from "@/app/dev/workbench/workbench-preview-context";

type Props = {
  header: ReactNode;
  variantPicker: ReactNode;
  preview: ReactNode;
  settings: ReactNode;
  sidebar: ReactNode;
  onReset?: () => void;
  showGlobalBreakpointSelector?: boolean;
};

export function ElementDevWorkspace({
  header,
  variantPicker,
  preview,
  settings,
  sidebar,
  onReset,
  showGlobalBreakpointSelector = true,
}: Props) {
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={onReset} onTotalReset={onReset} />}
    >
      {header}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)] md:items-start">
        <div className="space-y-6">
          {variantPicker}
          <section className="rounded-lg border border-border bg-card/20 p-4">
            {showGlobalBreakpointSelector ? (
              <div className="mb-3 flex justify-end">
                <label className="inline-flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono uppercase tracking-wide">Viewport</span>
                  <select
                    value={previewBreakpoint}
                    onChange={(event) =>
                      setPreviewBreakpoint(event.target.value as WorkbenchPreviewBreakpoint)
                    }
                    className="rounded border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="desktop">desktop</option>
                    <option value="tablet">tablet</option>
                    <option value="mobile">mobile</option>
                  </select>
                </label>
              </div>
            ) : null}
            <WorkbenchPreviewProvider breakpoint={previewBreakpoint}>
              <div
                className="mx-auto w-full"
                style={{
                  maxWidth: `${WORKBENCH_PREVIEW_VIEWPORTS[previewBreakpoint].canvasWidthPx}px`,
                }}
              >
                {preview}
              </div>
            </WorkbenchPreviewProvider>
          </section>
          {settings}
        </div>
        {sidebar}
      </div>
    </DevWorkbenchPageShell>
  );
}
