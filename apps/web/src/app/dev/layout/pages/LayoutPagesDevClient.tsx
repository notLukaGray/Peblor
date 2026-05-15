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
import { LayoutRendererPreviewCard } from "@/app/dev/layout/_shared/LayoutRendererPreviewCard";
import { LayoutNumberField } from "@/app/dev/layout/_shared/layout-control-fields";
import {
  getDefaultStyleToolPersistedV3,
  type StyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence";
import {
  getWorkbenchSession,
  patchWorkbenchStyle,
  WORKBENCH_SESSION_CHANGED_EVENT,
  WORKBENCH_SESSION_STORAGE_KEY,
} from "@/app/dev/workbench/workbench-session";
import type { WorkbenchPreviewBreakpoint } from "@/app/dev/workbench/workbench-preview-context";
import { clampUnitOpacity } from "@/app/theme/pb-opacity-tokens";
import { LayoutPagesZDepthPreview } from "./LayoutPagesZDepthPreview";

type LayoutPagesSlices = Pick<StyleToolPersistedV3, "zIndexLayers" | "opacityScale">;

const Z_INDEX_KEYS = ["base", "raised", "overlay", "modal", "toast", "tooltip", "max"] as const;
const OPACITY_KEYS = ["muted", "dimmed", "subtle", "strong", "full"] as const;
const PAGE_LAYER_SWATCHES = [
  {
    key: "base",
    label: "Base",
    fill: "var(--secondary)",
    color: "var(--secondary-foreground)",
    opacityKey: "muted" as const,
  },
  {
    key: "raised",
    label: "Raised",
    fill: "var(--accent)",
    color: "var(--accent-foreground)",
    opacityKey: "dimmed" as const,
  },
  {
    key: "overlay",
    label: "Overlay",
    fill: "var(--primary)",
    color: "var(--primary-foreground)",
    opacityKey: "strong" as const,
  },
  {
    key: "modal",
    label: "Modal",
    fill: "var(--muted)",
    color: "var(--foreground)",
    opacityKey: "full" as const,
  },
] as const;

function pickLayoutSlices(style: StyleToolPersistedV3): LayoutPagesSlices {
  return {
    zIndexLayers: style.zIndexLayers,
    opacityScale: style.opacityScale,
  };
}

function toFiniteInt(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
}

export function LayoutPagesDevClient() {
  const [slices, setSlices] = useState<LayoutPagesSlices>(() =>
    pickLayoutSlices(getWorkbenchSession().style)
  );
  const [previewBreakpoint, setPreviewBreakpoint] = useState<WorkbenchPreviewBreakpoint>("desktop");
  const { handoffPanelVisible, toggleHandoffPanel } = useLayoutHandoffPanelVisibility();

  useEffect(() => {
    const session = getWorkbenchSession();
    patchWorkbenchStyle({ ...session.style, ...slices });
  }, [slices]);

  useEffect(() => {
    const syncFromSession = () => setSlices(pickLayoutSlices(getWorkbenchSession().style));
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

  const resetSection = () => {
    const defaults = getDefaultStyleToolPersistedV3();
    setSlices(pickLayoutSlices(defaults));
  };

  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetSection} onTotalReset={resetSection} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Layout"
        title="Layout · Pages"
        showSessionBadge
        description="Set predictable z-index rail ordering for base, raised, overlay, modal, toast, and tooltip layers. Tune opacity scale and validate stacking in representational context."
        affects="z-index layer rails and opacity scale — controls overlay stacking hierarchy across all interactive surfaces"
        actions={
          <LayoutHandoffPanelToggle visible={handoffPanelVisible} onToggle={toggleHandoffPanel} />
        }
        meta={
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Phase 5 · Page layers
          </p>
        }
      />

      <div
        className={`grid grid-cols-1 gap-8 md:items-start ${
          handoffPanelVisible ? "md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)]" : ""
        }`}
      >
        <div className="space-y-6">
          <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Z-index layers
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {Z_INDEX_KEYS.map((key) => (
                <LayoutNumberField
                  key={key}
                  label={key}
                  step={1}
                  value={slices.zIndexLayers[key]}
                  onChange={(event) =>
                    setSlices((prev) => ({
                      ...prev,
                      zIndexLayers: {
                        ...prev.zIndexLayers,
                        [key]: toFiniteInt(event.target.value, prev.zIndexLayers[key]),
                      },
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Opacity scale
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {OPACITY_KEYS.map((key) => (
                <LayoutNumberField
                  key={key}
                  label={key}
                  min={0}
                  max={1}
                  step={0.01}
                  value={slices.opacityScale[key]}
                  onChange={(event) =>
                    setSlices((prev) => ({
                      ...prev,
                      opacityScale: {
                        ...prev.opacityScale,
                        [key]: clampUnitOpacity(Number(event.target.value)),
                      },
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <LayoutAdvancedPanel
            meta={{
              routeName: "Layout · Pages",
              styleSlice: "zIndexLayers + opacityScale",
              sliceJson: JSON.stringify(slices, null, 2),
            }}
          />
          <LayoutRendererPreviewCard
            title="Layering preview"
            previewBreakpoint={previewBreakpoint}
            setPreviewBreakpoint={setPreviewBreakpoint}
            previewBodyClassName="min-h-[40rem]"
            note={
              <>
                Stacked <strong className="font-normal">cards</strong> mirror your z-index / opacity
                rails — not pixel-identical to production{" "}
                <code className="font-mono">PeblorRenderer</code> positioning, which is optimized
                for full-page canvases.
              </>
            }
          >
            <div className="mb-2 grid gap-2 rounded border border-border/60 p-2 sm:grid-cols-2">
              {PAGE_LAYER_SWATCHES.map((layer) => (
                <div
                  key={layer.key}
                  className="flex items-center justify-between rounded border border-border/60 px-2 py-1 text-[10px]"
                  style={{ background: layer.fill, color: layer.color }}
                >
                  <span className="font-mono uppercase tracking-wide">
                    {`${layer.label} (z${slices.zIndexLayers[layer.key]})`}
                  </span>
                  <span className="font-mono">
                    {`opacity ${layer.opacityKey} ${slices.opacityScale[layer.opacityKey].toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative min-h-[36rem] overflow-auto rounded border border-border/60">
              <LayoutPagesZDepthPreview slices={slices} />
            </div>
          </LayoutRendererPreviewCard>
        </div>

        {handoffPanelVisible ? (
          <div className="space-y-6 md:sticky md:top-8">
            <section className="rounded-lg border border-border bg-card/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Handoff notes
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Use these tokens to keep page overlays (dialogs, toasts, tooltips, background
                layers) on a predictable stacking rail.
              </p>
            </section>
          </div>
        ) : null}
      </div>
    </DevWorkbenchPageShell>
  );
}
