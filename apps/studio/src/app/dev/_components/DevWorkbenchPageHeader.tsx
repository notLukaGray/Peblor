import type { ReactNode } from "react";
import { WorkbenchSessionBadge } from "@/app/dev/workbench/WorkbenchSessionBadge";

export type DevWorkbenchPageHeaderProps = {
  /** Top label, mono caps (e.g. `Dev · Elements`). */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /**
   * Short description of what this route affects at runtime (e.g.
   * `"elementHeading blocks across all sections"`). Rendered as a labelled
   * chip row below the description for quick orientation.
   */
  affects?: ReactNode;
  /** When true, renders a live WorkbenchSessionBadge in the eyebrow row. */
  showSessionBadge?: boolean;
  /** Optional header actions (toggles, contextual controls). */
  actions?: ReactNode;
  /** Smaller secondary block (notes, warnings) under the main description. */
  meta?: ReactNode;
};

const DEFAULT_EYEBROW = "Dev · Workbench";

/**
 * Page title stack used across element dev tools (reference: body element).
 * Keep descriptions at `text-sm`; use `meta` for `text-[11px]` auxiliary copy.
 */
export function DevWorkbenchPageHeader({
  eyebrow = DEFAULT_EYEBROW,
  title,
  description,
  affects,
  showSessionBadge = false,
  actions,
  meta,
}: DevWorkbenchPageHeaderProps) {
  return (
    <header className="space-y-2 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
          {showSessionBadge ? <WorkbenchSessionBadge /> : null}
        </div>
        {actions}
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description ? (
        <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground/90 [&_code]:font-mono [&_code]:text-[13px]">
          {description}
        </div>
      ) : null}
      {affects ? (
        <p className="flex flex-wrap items-baseline gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono uppercase tracking-wide opacity-60">Affects</span>
          <span className="font-mono text-foreground/70">{affects}</span>
        </p>
      ) : null}
      {meta ? (
        <div className="max-w-3xl text-[11px] leading-relaxed text-muted-foreground [&_code]:font-mono [&_code]:text-[0.95em] [&_strong]:font-semibold [&_strong]:text-foreground/90">
          {meta}
        </div>
      ) : null}
    </header>
  );
}
