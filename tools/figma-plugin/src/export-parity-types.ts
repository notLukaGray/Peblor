/**
 * Shared parity metric shapes (no runtime deps — safe to import from `types/figma-plugin`).
 */

export interface ExportParityTally {
  converted: number;
  fallback: number;
  fallbackReasons: Record<string, number>;
}

export interface ExportParityDropLedger {
  dropped: number;
  dropReasons: Record<string, number>;
}

export interface ExportParityState {
  output: ExportParityTally;
  converter: ExportParityDropLedger;
  upstream: ExportParityDropLedger;
}

export interface ParityTraceSnapshot {
  converted: number;
  fallback: number;
  dropped: number;
  fallbackReasons: Record<string, number>;
  dropReasons: Record<string, number>;
}
