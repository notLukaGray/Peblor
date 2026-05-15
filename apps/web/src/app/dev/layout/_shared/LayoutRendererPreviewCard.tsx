"use client";

import type { ReactNode } from "react";
import { LayoutViewportSelect } from "@/app/dev/layout/_shared/layout-control-fields";
import { PreviewProvenanceBadge } from "@/app/dev/workbench/PreviewProvenanceBadge";
import {
  WORKBENCH_PREVIEW_VIEWPORTS,
  WorkbenchPreviewProvider,
  type WorkbenchPreviewBreakpoint,
} from "@/app/dev/workbench/workbench-preview-context";
import type { PreviewFidelityMode } from "@/app/dev/workbench/preview-fidelity";

type Props = {
  title?: string;
  mode?: PreviewFidelityMode;
  previewBreakpoint: WorkbenchPreviewBreakpoint;
  setPreviewBreakpoint: (next: WorkbenchPreviewBreakpoint) => void;
  children: ReactNode;
  note?: ReactNode;
  previewBodyClassName?: string;
};

export function LayoutRendererPreviewCard({
  title = "Preview",
  mode = "raw",
  previewBreakpoint,
  setPreviewBreakpoint,
  children,
  note,
  previewBodyClassName,
}: Props) {
  const previewBodyClasses = [
    "rounded border border-dashed border-border/70 p-3 flex min-h-0 w-full min-w-0 flex-col",
    previewBodyClassName,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <PreviewProvenanceBadge mode={mode} />
          <LayoutViewportSelect value={previewBreakpoint} onChange={setPreviewBreakpoint} />
        </div>
      </div>

      <WorkbenchPreviewProvider breakpoint={previewBreakpoint}>
        <div
          className="mx-auto w-full"
          style={{ maxWidth: `${WORKBENCH_PREVIEW_VIEWPORTS[previewBreakpoint].canvasWidthPx}px` }}
        >
          <div className={previewBodyClasses}>{children}</div>
        </div>
      </WorkbenchPreviewProvider>

      {note ? <div className="text-[10px] text-muted-foreground">{note}</div> : null}
    </section>
  );
}
