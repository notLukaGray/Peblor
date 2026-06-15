"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { LayoutNumberField, LayoutTextField } from "@/app/dev/layout/_shared/layout-control-fields";
import { LayoutRendererPreviewCard } from "@/app/dev/layout/_shared/LayoutRendererPreviewCard";
import { buildSectionMarginPreviewSections } from "@/app/dev/layout/_shared/layout-preview-fixtures";
import { LayoutSectionContentWidthFramePreview } from "@/app/dev/layout/sections/LayoutSectionContentWidthFramePreview";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import { SectionRenderer } from "@pb/runtime-react/renderers";

export type LayoutSectionsSlices = Pick<
  StyleToolPersistedV3,
  "breakpoints" | "contentWidths" | "sectionMarginScale" | "sectionMarginScaleLocks"
>;

const CONTENT_WIDTH_KEYS = ["narrow", "standard", "wide", "full"] as const;
const SECTION_MARGIN_KEYS = ["none", "xs", "sm", "md", "lg", "xl"] as const;
const CONTENT_WIDTH_PRESET_RAILS = [
  {
    id: "cinematic",
    label: "Cinematic rail",
    values: {
      narrow: "min(90vw, 900px)",
      standard: "min(90vw, 1200px)",
      wide: "min(92vw, 1400px)",
      full: "100%",
    },
  },
  {
    id: "compact",
    label: "Compact rail",
    values: {
      narrow: "min(75vw, 720px)",
      standard: "min(75vw, 1024px)",
      wide: "min(85vw, 1200px)",
      full: "100%",
    },
  },
] as const;

type SetSlices = Dispatch<SetStateAction<LayoutSectionsSlices>>;
export function toNonNegativeInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

export function ContentWidthPresetsPanel({
  slices,
  setSlices,
}: {
  slices: LayoutSectionsSlices;
  setSlices: SetSlices;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Content width presets
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONTENT_WIDTH_KEYS.map((key) => (
          <LayoutTextField
            key={key}
            label={key}
            value={slices.contentWidths[key]}
            onChange={(event) =>
              setSlices((prev) => ({
                ...prev,
                contentWidths: { ...prev.contentWidths, [key]: event.target.value },
              }))
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {CONTENT_WIDTH_PRESET_RAILS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() =>
              setSlices((prev) => ({
                ...prev,
                contentWidths: {
                  ...prev.contentWidths,
                  ...preset.values,
                },
              }))
            }
            className="rounded border border-border px-2.5 py-1 text-[10px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Presets use dynamic rails so widths scale with viewport instead of fixed Tailwind-like
        maxes.
      </p>
    </section>
  );
}
export function SectionMarginScalePanel({
  slices,
  setSlices,
}: {
  slices: LayoutSectionsSlices;
  setSlices: SetSlices;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Section margin scale
      </p>
      <div className="overflow-x-auto rounded border border-border/80">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                Step
              </th>
              <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                Value
              </th>
              <th className="px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                Lock
              </th>
            </tr>
          </thead>
          <tbody>
            {SECTION_MARGIN_KEYS.map((key) => {
              const locked = slices.sectionMarginScaleLocks[key];
              return (
                <tr key={key} className="border-b border-border/80 last:border-b-0">
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{key}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      disabled={!locked}
                      className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-foreground disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={slices.sectionMarginScale[key]}
                      onChange={(e) =>
                        setSlices((prev) => ({
                          ...prev,
                          sectionMarginScale: { ...prev.sectionMarginScale, [key]: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={locked}
                        onChange={() =>
                          setSlices((prev) => ({
                            ...prev,
                            sectionMarginScaleLocks: {
                              ...prev.sectionMarginScaleLocks,
                              [key]: !prev.sectionMarginScaleLocks[key],
                            },
                          }))
                        }
                      />
                      Pin
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function BreakpointThresholdsPanel({
  slices,
  setSlices,
}: {
  slices: LayoutSectionsSlices;
  setSlices: SetSlices;
}) {
  const mobileMax = slices.breakpoints.mobile;
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        Breakpoint threshold
      </p>
      <div className="grid gap-3 sm:grid-cols-1">
        <LayoutNumberField
          label="Mobile max (px)"
          min={0}
          value={mobileMax}
          onChange={(event) =>
            setSlices((prev) => ({
              ...prev,
              breakpoints: {
                mobile: toNonNegativeInt(event.target.value, prev.breakpoints.mobile),
                desktop: toNonNegativeInt(event.target.value, prev.breakpoints.mobile) + 1,
              },
            }))
          }
        />
      </div>
      <p className="text-[10px] text-muted-foreground">
        Single flip point: ≤{mobileMax}px → mobile, ≥{mobileMax + 1}px → desktop. The runtime stores
        both values but desktop is always mobile&nbsp;+&nbsp;1 — only this number matters.
      </p>
    </section>
  );
}
export function SectionPreviewPanel({
  slices,
  previewBreakpoint,
  setPreviewBreakpoint,
}: {
  slices: LayoutSectionsSlices;
  previewBreakpoint: WorkbenchPreviewBreakpoint;
  setPreviewBreakpoint: (next: WorkbenchPreviewBreakpoint) => void;
}) {
  const marginPreviewSections = useMemo(() => buildSectionMarginPreviewSections(), []);
  return (
    <LayoutRendererPreviewCard
      title="Section preview"
      previewBreakpoint={previewBreakpoint}
      setPreviewBreakpoint={setPreviewBreakpoint}
      previewBodyClassName="min-h-[34rem]"
      note={
        <>
          Content width uses a <strong className="font-normal">frame-local</strong> preview (not{" "}
          <code className="font-mono">SectionRenderer</code>) so{" "}
          <code className="font-mono">vw</code> tokens match this card. Margin rhythm still renders
          through <code className="font-mono">SectionRenderer</code>.
        </>
      }
    >
      <div className="space-y-3">
        <LayoutSectionContentWidthFramePreview contentWidths={slices.contentWidths} />
        <div className="rounded border border-border/60 p-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Section margin rhythm
          </p>
          <div className="space-y-1">
            {marginPreviewSections.map((section, index) => (
              <SectionRenderer key={section.id ?? index} section={section} isFirstSection={false} />
            ))}
          </div>
        </div>
      </div>
    </LayoutRendererPreviewCard>
  );
}
