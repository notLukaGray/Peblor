import type { PeblorPage } from "./peblor";
import type { ParsedExportTargetKind } from "../../../figma-bridge/src/export-target-parse";
import type { ExportParityState, ParityTraceSnapshot } from "../export-parity-types";

export interface AssetEntry {
  /** Relative path inside the ZIP, e.g. "assets/image-hero.png" */
  filename: string;
  data: Uint8Array;
}

export interface GlobalsOutput {
  buttons?: Record<string, unknown>;
  backgrounds?: Record<string, unknown>;
  elements?: Record<string, unknown>;
}

export interface ExportResult {
  /** All page exports. key = slug, value = PeblorPage */
  pages: Record<string, unknown>;
  /** All section preset exports. key = slug, value = section block */
  presets: Record<string, unknown>;
  /** All modal exports. key = slug, value = modal definition */
  modals: Record<string, unknown>;
  /** All module exports. key = slug, value = element block or module */
  modules: Record<string, unknown>;
  /** Global element registry — accumulated across all exports in this session */
  globals: GlobalsOutput;
  /** Exported binary assets (images, SVGs) */
  assets: AssetEntry[];
  /** Non-fatal warnings */
  warnings: string[];
  /** Machine-readable export trace mirrored into export-trace.json. */
  trace?: ExportTrace;
  /** Total element count across all pages */
  elementCount: number;
}

export type ExportTargetType = ParsedExportTargetKind | "skip";
export type ExportMode = "copy" | "copy-merged" | "zip";
export type ExportScope = "all-selected" | "single-frame";
export type ExportArtifact = "full" | "section";

export interface ExportTarget {
  type: ExportTargetType;
  key: string;
  /** Display label shown in UI */
  label: string;
  /**
   * Set to "desktop" or "mobile" when the frame is part of a responsive pair
   * (Section[Desktop]/* or Section[Mobile]/* naming convention).
   * Absent for all single-artboard frames.
   */
  responsiveRole?: "desktop" | "mobile";
}

export interface SectionExportArtifact {
  version: 1;
  frame: { id: string; name: string };
  target: { type: ExportTargetType; key: string; label: string };
  sectionId: string;
  section: Record<string, unknown>;
  indexPatch: {
    slug: string;
    title: string;
    sectionOrder: string[];
    definitions: Record<string, unknown>;
  };
  paths: {
    index: string;
    section: string;
  };
  /**
   * Non-breaking hint for optionally promoting section background fields
   * (fill/layers/bgImage) into page-level background definitions.
   */
  backgroundCandidate?: {
    reason: "section-bgimage" | "section-layers" | "section-fill";
    bgKey: string;
    definition: Record<string, unknown>;
  };
}

export interface ConversionContext {
  assets: AssetEntry[];
  warnings: string[];
  /**
   * Cumulative parity metrics for this export session (optional until first use).
   * Populated by converters and merged into `ExportResult.trace.counts.parity`.
   */
  exportParity?: ExportParityState;
  /** When true, auto-promote repeated sibling structures into presets. */
  autoPresets?: boolean;
  /** Tracks generated preset keys to avoid collisions. */
  usedPresetKeys?: Set<string>;
  /** Incremented each time a new asset is registered; used for unique filenames. */
  assetCounter: number;
  /** Tracks element IDs already used in this export to enforce uniqueness. */
  usedIds: Set<string>;
  /** Tracks asset keys already used in this export to prevent filename collisions. */
  usedAssetKeys: Set<string>;
  /** CDN path prefix prepended to all generated asset keys (e.g. "work/my-project/"). */
  cdnPrefix: string;
  /**
   * When true, skip all binary asset exports (image/video rasterisation).
   * CDN keys are still derived from node names so the JSON is complete.
   * Used by the "Copy JSON" flow to avoid the slow figma.getImageByHash /
   * exportAsync round-trips.
   */
  skipAssets?: boolean;
}

export interface FrameIssue {
  severity: "error" | "warn" | "info";
  category?: string;
  message: string;
}

export interface ExportTraceIssue {
  frameId: string;
  frameName: string;
  severity: FrameIssue["severity"];
  category: string;
  message: string;
}

export interface ExportTrace {
  counts: {
    severity: Record<FrameIssue["severity"], number>;
    category: Record<string, number>;
    /**
     * Element parity: `converted`/`fallback` from recursive output scan; `dropped` =
     * converter losses + upstream routing (skip/orphan frames). Reason maps use stable codes.
     */
    parity?: ParityTraceSnapshot;
  };
  frames: Array<{
    id: string;
    name: string;
    issues: ExportTraceIssue[];
  }>;
}

/** Message sent from main thread to UI thread. */
export type MainToUIMessage =
  | {
      type: "result";
      payload: ExportResult;
      errorCount: number;
      warningCount: number;
      infoCount: number;
      errors: string[];
      mode: ExportMode;
      artifact?: ExportArtifact;
      sectionArtifact?: SectionExportArtifact;
    }
  | { type: "error"; message: string }
  | { type: "progress"; message: string }
  | {
      type: "preview";
      items: Array<{
        id: string;
        name: string;
        target: ExportTarget;
        issues: FrameIssue[];
        /** Present when this item is one half of a responsive pair. */
        responsivePairKey?: string;
      }>;
    };

/** Message sent from UI thread to main thread. */
export type UIToMainMessage =
  | {
      type: "export";
      /** "copy" — full ExportResult JSON. "copy-merged" — one page doc (or `pages` wrapper) for pb-dev. "zip" — assets (default). */
      mode?: ExportMode;
      /** "full" keeps current behavior. "section" emits a single section artifact JSON payload. */
      artifact?: ExportArtifact;
      /** "all-selected" (default) exports the current selection/top-level fallback; "single-frame" exports one preview row. */
      scope?: ExportScope;
      /** Required with scope="single-frame" unless responsivePairKey is provided. */
      frameId?: string;
      /** Optional responsive pair key from preview row; when set with scope="single-frame", exports that merged pair. */
      responsivePairKey?: string;
      targetOverrides?: Record<string, string>;
      annotationOverrides?: Record<string, Record<string, string>>;
      cdnPrefixOverrides?: Record<string, string>;
      autoPresets?: boolean;
    }
  | {
      type: "refresh-preview";
      targetOverrides: Record<string, string>;
      autoPresets?: boolean;
    }
  | { type: "close" };

// Keep PeblorPage re-export for any code that imported it via this module
export type { PeblorPage };
