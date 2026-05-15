/**
 * Dev-only surface for Figma export parity / diagnostics (optional `figmaExportDiagnostics` on page JSON).
 */

import { create } from "zustand";
import type { z } from "zod";
import { figmaExportDiagnosticsPageFieldSchema } from "@pb/contracts/peblor/core/peblor-schemas";
import { computeFallbackStatsFromPageDefinitions } from "@/peblor/dev/compute-figma-fallback-walk";

export const figmaExportDiagnosticsV1Schema = figmaExportDiagnosticsPageFieldSchema;
export type FigmaExportDiagnosticsV1 = z.infer<typeof figmaExportDiagnosticsPageFieldSchema>;

type ScannedFallback = {
  fallbackElements: number;
  topFallbackReasons: Array<{ code: string; count: number }>;
};

type DevFigmaDiagnosticsState = {
  embedded: FigmaExportDiagnosticsV1 | null;
  scannedFallback: ScannedFallback | null;
  ingestPlaygroundPageRoot: (root: Record<string, unknown> | null) => void;
  clear: () => void;
};

export const useFigmaExportDiagnosticsStore = create<DevFigmaDiagnosticsState>()((set) => ({
  embedded: null,
  scannedFallback: null,
  ingestPlaygroundPageRoot: (root) => {
    if (!root) {
      set({ embedded: null, scannedFallback: null });
      return;
    }
    const embedded = parseFigmaExportDiagnostics(root["figmaExportDiagnostics"]);
    const scan = computeFallbackStatsFromPageDefinitions(root);
    set({
      embedded,
      scannedFallback: {
        fallbackElements: scan.fallbackElements,
        topFallbackReasons: scan.topFallbackReasons,
      },
    });
  },
  clear: () => set({ embedded: null, scannedFallback: null }),
}));

export function parseFigmaExportDiagnostics(raw: unknown): FigmaExportDiagnosticsV1 | null {
  const r = figmaExportDiagnosticsV1Schema.safeParse(raw);
  return r.success ? r.data : null;
}
