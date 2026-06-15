"use client";

import { useState } from "react";

export type ElementAdvancedMeta = {
  /** Active variant key, e.g. `"display"` */
  activeVariant: string;
  /** Human-readable variant label, e.g. `"Display"` */
  variantLabel: string;
  /** Element schema type, e.g. `"elementHeading"` */
  schemaType: string;
  /** Whether the controller has finished hydrating from localStorage */
  hydrated: boolean;
  /** Whether the active variant is a custom (non-seeded) variant */
  isCustomVariant: boolean;
  /**
   * The raw active block JSON — call JSON.stringify on the resolved block and pass
   * it in here so this panel can show it without needing to recompute.
   */
  rawBlockJson?: string;
};

/**
 * Collapsible advanced/debug panel shown in every element sidebar.
 * Surfaces runtime metadata, schema type, and the raw active block JSON so
 * authors can verify what is actually being passed to the renderer.
 *
 * Per plan requirement: "Advanced opened: raw/guided fidelity controls, runtime
 * metadata, and schema payload appear."
 */
export function ElementAdvancedPanel({
  meta,
  schemaDocs,
}: {
  meta: ElementAdvancedMeta;
  /** Optional short note pointing to relevant schema files, e.g. `"element-content-schemas.ts"`. */
  schemaDocs?: string;
}) {
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
        {/* Runtime metadata table */}
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
            Runtime metadata
          </p>
          <MetaRow label="Schema type" value={meta.schemaType} mono />
          <MetaRow label="Active variant" value={meta.activeVariant} mono />
          <MetaRow label="Variant label" value={meta.variantLabel} />
          <MetaRow label="Custom variant" value={meta.isCustomVariant ? "yes" : "no"} />
          <MetaRow
            label="Hydrated"
            value={meta.hydrated ? "yes" : "loading…"}
            highlight={!meta.hydrated}
          />
          {schemaDocs ? <MetaRow label="Schema file" value={schemaDocs} mono /> : null}
        </div>

        {/* Renderer path note */}
        <div className="rounded bg-muted/30 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
          Renders through <code className="font-mono">ElementRenderer</code> →{" "}
          <code className="font-mono">{meta.schemaType}</code>. Fidelity mode and scenario selection
          are in the preview header above. Raw block payload is below.
        </div>

        {/* Raw block JSON */}
        {meta.rawBlockJson ? (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Active block (raw)
            </p>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-3 font-mono text-[10px] leading-relaxed text-foreground">
              {meta.rawBlockJson}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[10px]">
      <span className="shrink-0 text-muted-foreground/70">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono" : ""} ${highlight ? "text-amber-400" : "text-foreground/80"}`}
      >
        {value}
      </span>
    </div>
  );
}
