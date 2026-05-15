"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  isFullyFluidPalette,
  type HarmonyFit,
  type M1ColorSeeds,
  type M1RowState,
  type M1ThemeMode,
} from "@/app/theme/palette-suggest";
import { type M1TokenId } from "@/app/theme/pb-color-tokens";
import { DevWorkbenchNav } from "@/app/dev/_components/DevWorkbenchNav";
import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";
import { DevWorkbenchPageShell } from "@/app/dev/_components/DevWorkbenchPageShell";
import { HarmonyIndicator, PreviewColumn } from "./color-tool-preview-helpers";
import { NativeColorSwatch } from "./color-tool-native-swatch";
import { ColorToolTokenTable } from "./color-tool-token-table";

type Props = {
  resetColorTool: () => void;
  editTheme: M1ThemeMode;
  setEditTheme: Dispatch<SetStateAction<M1ThemeMode>>;
  syncSeedsAcrossThemes: boolean;
  onSyncSeedsToggle: (checked: boolean) => void;
  harmonyFit: HarmonyFit;
  rows: Record<M1TokenId, M1RowState>;
  seeds: M1ColorSeeds;
  setSeed: (key: keyof M1ColorSeeds, value: string) => void;
  onShuffleSeeds: () => void;
  displayValue: (id: M1TokenId) => string;
  onValueInput: (id: M1TokenId, value: string) => void;
  onConfirmToggle: (id: M1TokenId, checked: boolean) => void;
  onRefresh: (id: M1TokenId) => void;
  onShuffleAll: () => void;
  resolved: Record<M1TokenId, string>;
  resolvedLight: Record<M1TokenId, string>;
  resolvedDark: Record<M1TokenId, string>;
  exportText: string;
  copyExportWithFlash: () => Promise<void>;
  exportCopied: boolean;
};

export function ColorToolWorkspace({
  resetColorTool,
  editTheme,
  setEditTheme,
  syncSeedsAcrossThemes,
  onSyncSeedsToggle,
  harmonyFit,
  rows,
  seeds,
  setSeed,
  displayValue,
  onValueInput,
  onConfirmToggle,
  onRefresh,
  onShuffleSeeds,
  onShuffleAll,
  resolved,
  resolvedLight,
  resolvedDark,
  exportText,
  copyExportWithFlash,
  exportCopied,
}: Props) {
  return (
    <DevWorkbenchPageShell
      nav={<DevWorkbenchNav onResetSection={resetColorTool} onTotalReset={resetColorTool} />}
    >
      <DevWorkbenchPageHeader
        eyebrow="Dev · Foundations"
        title="Colors"
        description={
          <>
            Tune <code>--pb-*</code> brand and link tokens for <strong>light</strong> and{" "}
            <strong>dark</strong>. With nothing locked, the palette tracks <strong>primary</strong>;
            lock rows for finer control. Refresh re-rolls an unlocked row. Runtime surfaces, text,
            status, charts, and sidebar tokens derive from these seeds. Copy into{" "}
            <code>src/app/theme/config.ts</code> (replace whole file).
          </>
        }
        meta={
          <>
            <span className="font-medium text-foreground/90">Note:</span>{" "}
            {isFullyFluidPalette(rows) ? (
              <>Full-fluid mode: secondary and accent seeds are paused until you lock a token.</>
            ) : (
              <>Partial locks: unlocked fills use their seed while confirmed values stay pinned.</>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Edit theme
          </span>
          <div className="flex gap-1">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded px-2 py-0.5 text-[11px] font-mono transition-colors ${editTheme === mode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setEditTheme(mode)}
              >
                {mode === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 font-mono text-[11px] text-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-border accent-foreground"
            checked={syncSeedsAcrossThemes}
            onChange={(e) => onSyncSeedsToggle(e.target.checked)}
          />
          <span>
            Sync seeds{" "}
            <span className="text-[10px] font-normal text-muted-foreground">
              (light &amp; dark share seed values)
            </span>
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(17.5rem,26.25rem)] md:items-start">
        <div className="space-y-6">
          <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="mb-0 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Global seeds · {editTheme}
              </p>
              <div className="flex items-center gap-2">
                <HarmonyIndicator fit={harmonyFit} />
                <button
                  type="button"
                  className="rounded border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  title="Pick a new random primary + accent pair"
                  onClick={onShuffleSeeds}
                >
                  Shuffle
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Primary
              </span>
              <span className="flex items-center gap-2">
                <NativeColorSwatch
                  cssValue={seeds.primary}
                  onPickHex={(hex) => setSeed("primary", hex)}
                  size="lg"
                  ariaLabel={`Primary picker (${editTheme})`}
                />
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={seeds.primary}
                  onChange={(e) => setSeed("primary", e.target.value)}
                />
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Accent
              </span>
              <span className="flex items-center gap-2">
                <NativeColorSwatch
                  cssValue={seeds.accent}
                  onPickHex={(hex) => setSeed("accent", hex)}
                  size="md"
                  ariaLabel={`Accent picker (${editTheme})`}
                />
                <input
                  type="text"
                  className="min-w-0 flex-1 rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={seeds.accent}
                  onChange={(e) => setSeed("accent", e.target.value)}
                />
              </span>
            </div>
          </section>

          <ColorToolTokenTable
            rows={rows}
            resolved={resolved}
            editTheme={editTheme}
            displayValue={displayValue}
            onValueInput={onValueInput}
            onConfirmToggle={onConfirmToggle}
            onRefresh={onRefresh}
            onShuffleAll={onShuffleAll}
          />

          <section className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Light and dark together. Hover buttons, body copy, or link for WCAG contrast
                details.
              </p>
            </div>
            <div className="grid gap-3 overflow-visible sm:grid-cols-2">
              <PreviewColumn label="Light (resolved)" v={resolvedLight} />
              <PreviewColumn label="Dark (resolved)" v={resolvedDark} />
            </div>
          </section>
        </div>

        <div className="md:sticky md:top-8">
          <div className="space-y-3 rounded-lg border border-border bg-card/20 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Code to paste
            </p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Replace <code className="font-mono text-[0.95em]">src/app/theme/config.ts</code>{" "}
              entirely.
            </p>
            <pre className="max-h-96 overflow-x-auto overflow-y-auto whitespace-pre-wrap rounded bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground">
              {exportText}
            </pre>
            <button
              type="button"
              onClick={() => void copyExportWithFlash()}
              className="w-full rounded border border-border px-3 py-2 text-sm font-mono text-foreground transition-colors hover:bg-muted"
            >
              {exportCopied ? "Copied!" : "Copy code"}
            </button>
          </div>
        </div>
      </div>
    </DevWorkbenchPageShell>
  );
}
