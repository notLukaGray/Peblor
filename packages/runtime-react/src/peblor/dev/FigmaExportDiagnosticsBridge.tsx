"use client";

import { useEffect } from "react";
import type { FigmaExportDiagnosticsPageField } from "@pb/contracts/types";

type FigmaExportDiagnosticsBridgeProps = {
  diagnostics?: FigmaExportDiagnosticsPageField;
};

/**
 * Wires runtime pages into the same diagnostics store used by `/playground` JSON paste.
 * This keeps the PB dev overlay's Figma tab populated on normal routes too.
 */
export function FigmaExportDiagnosticsBridge({ diagnostics }: FigmaExportDiagnosticsBridgeProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let cancelled = false;
    const root = diagnostics ? { figmaExportDiagnostics: diagnostics } : null;
    void import("@/peblor/dev/figma-export-diagnostics-store").then(
      ({ useFigmaExportDiagnosticsStore }) => {
        if (cancelled) return;
        useFigmaExportDiagnosticsStore.getState().ingestPlaygroundPageRoot(root);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [diagnostics]);

  return null;
}
