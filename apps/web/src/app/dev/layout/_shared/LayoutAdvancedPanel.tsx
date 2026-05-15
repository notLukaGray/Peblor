"use client";

import { useState } from "react";

export type LayoutAdvancedMeta = {
  /** Route name, e.g. "Layout · Pages" */
  routeName: string;
  /** Short description of the underlying style slice, e.g. "zIndexLayers + opacityScale" */
  styleSlice: string;
  /** Whether the current session has been modified from defaults */
  isDefault?: boolean;
  /** Raw JSON of the current slice for quick diagnostics */
  sliceJson?: string;
};

/**
 * Collapsible advanced/diagnostics panel for layout dev routes.
 *
 * Shows the underlying style slice name, renderer path note, and the live
 * JSON snapshot of the current slice values. Mirrors the plan requirement:
 * "Advanced opened: raw layer map and renderer-path details appear."
 */
export function LayoutAdvancedPanel({ meta }: { meta: LayoutAdvancedMeta }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-lg border border-border bg-card/20"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Advanced · Debug
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/50">{open ? "▲" : "▼"}</span>
      </summary>

      <div className="space-y-4 px-4 pb-4">
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
            Runtime metadata
          </p>
          <MetaRow label="Route" value={meta.routeName} />
          <MetaRow label="Style slice" value={meta.styleSlice} mono />
          {meta.isDefault != null ? (
            <MetaRow label="Session modified" value={meta.isDefault ? "no" : "yes"} />
          ) : null}
        </div>

        <div className="rounded bg-muted/30 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
          Values are resolved from the workbench session{" "}
          <code className="font-mono">workbench-session-v2</code> via{" "}
          <code className="font-mono">patchWorkbenchStyle</code>. Changes here sync to all open
          workbench tabs via <code className="font-mono">WORKBENCH_SESSION_CHANGED_EVENT</code>.
        </div>

        {meta.sliceJson ? (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Current slice (live)
            </p>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-3 font-mono text-[10px] leading-relaxed text-foreground">
              {meta.sliceJson}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[10px]">
      <span className="shrink-0 text-muted-foreground/70">{label}</span>
      <span className={`text-right text-foreground/80 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
