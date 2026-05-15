import type { StyleToolSeeds } from "@/app/theme/pb-style-suggest";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import type { PageDensity } from "@pb/contracts";

type Props = {
  seeds: StyleToolSeeds;
  previewDensity: PageDensity;
  previewBreakpoint: WorkbenchPreviewBreakpoint;
  onSeedsChange: (patch: Partial<StyleToolSeeds>) => void;
  onPreviewDensityChange: (density: PageDensity) => void;
  onPreviewBreakpointChange: (breakpoint: WorkbenchPreviewBreakpoint) => void;
};

export function StyleGlobalSeedsPanel({
  seeds,
  previewDensity,
  previewBreakpoint,
  onSeedsChange,
  onPreviewDensityChange,
  onPreviewBreakpointChange,
}: Props) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Global seeds
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Alignment
          </span>
          <select
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={seeds.alignment}
            onChange={(e) =>
              onSeedsChange({ alignment: e.target.value as StyleToolSeeds["alignment"] })
            }
          >
            <option value="start">Start / left stack</option>
            <option value="center">Center</option>
            <option value="end">End / right</option>
          </select>
          <p className="text-[10px] text-muted-foreground">
            Sets the overall default alignment mood for content.
          </p>
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Spacing base (rem)
          </span>
          <input
            type="number"
            step={0.125}
            min={0.125}
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={seeds.spacingBaseRem}
            onChange={(e) => onSeedsChange({ spacingBaseRem: Number(e.target.value) || 0.125 })}
          />
          <p className="text-[10px] text-muted-foreground">
            Base rhythm used across defaults (paragraphs, gaps, and button spacing).
          </p>
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Radius base (rem)
          </span>
          <input
            type="number"
            step={0.125}
            min={0}
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={seeds.radiusBaseRem}
            onChange={(e) => onSeedsChange({ radiusBaseRem: Number(e.target.value) || 0 })}
          />
          <p className="text-[10px] text-muted-foreground">
            Shared rounding baseline for frames, code blocks, and button chrome.
          </p>
        </label>
        <div className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Infer frame gap from spacing
          </span>
          <label className="inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-[11px] text-foreground">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={seeds.useDefaultFrameGap}
              onChange={(e) => onSeedsChange({ useDefaultFrameGap: e.target.checked })}
            />
            Use `2 × spacing base` when frames do not set a gap
          </label>
          <p className="text-[10px] text-muted-foreground">
            Turn off if your team prefers every frame to define its own spacing.
          </p>
        </div>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Page density preview
          </span>
          <select
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={previewDensity}
            onChange={(e) => onPreviewDensityChange(e.target.value as PageDensity)}
          >
            <option value="comfortable">Comfortable</option>
            <option value="balanced">Balanced</option>
            <option value="compact">Compact</option>
          </select>
          <p className="text-[10px] text-muted-foreground">
            Density scales layout spacing defaults and radius, not rich-text margins.
          </p>
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Preview viewport
          </span>
          <select
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={previewBreakpoint}
            onChange={(e) =>
              onPreviewBreakpointChange(e.target.value as WorkbenchPreviewBreakpoint)
            }
          >
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
          <p className="text-[10px] text-muted-foreground">
            Uses workbench breakpoint context for preview rendering.
          </p>
        </label>
      </div>
    </section>
  );
}
