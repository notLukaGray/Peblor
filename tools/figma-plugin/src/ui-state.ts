/**
 * Per-frame UI override state backed by localStorage.
 * Tracks target type overrides, annotation overrides, and CDN prefix overrides.
 */

import type { ExportTarget, FrameIssue } from "./types/figma-plugin";

/** Currently previewed frame list item. */
export interface FramePreviewItem {
  id: string;
  name: string;
  target: ExportTarget;
  issues: FrameIssue[];
  /** Set when this item represents a merged desktop+mobile responsive pair. */
  responsivePairKey?: string;
}

// ---------------------------------------------------------------------------
// Storage safety
// ---------------------------------------------------------------------------

const memoryStorage = new Map<string, string>();

// Pre-detect whether localStorage is accessible (it throws in data: URL contexts).
const _lsAvailable = (() => {
  try {
    window.localStorage.getItem("__probe__");
    return true;
  } catch {
    return false;
  }
})();

function storageGet(key: string): string | null {
  if (!_lsAvailable) return memoryStorage.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

function storageSet(key: string, value: string): void {
  if (!_lsAvailable) {
    memoryStorage.set(key, value);
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStorage.set(key, value);
  }
}

function storageRemove(key: string): void {
  if (!_lsAvailable) {
    memoryStorage.delete(key);
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    memoryStorage.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Target type overrides
// ---------------------------------------------------------------------------

export function getTargetOverride(frameId: string): string | null {
  return storageGet(`pb_target_${frameId}`);
}

export function setTargetOverride(frameId: string, value: string): void {
  if (value === "auto") {
    storageRemove(`pb_target_${frameId}`);
  } else {
    storageSet(`pb_target_${frameId}`, value);
  }
}

// ---------------------------------------------------------------------------
// Global export options
// ---------------------------------------------------------------------------

const AUTO_PRESET_KEY = "pb_auto_presets";

export function getAutoPresetSetting(): boolean {
  return storageGet(AUTO_PRESET_KEY) === "true";
}

export function setAutoPresetSetting(value: boolean): void {
  storageSet(AUTO_PRESET_KEY, value ? "true" : "false");
}

// ---------------------------------------------------------------------------
// Annotation overrides
// ---------------------------------------------------------------------------

export function getAnnotationOverrides(frameId: string): Record<string, string> {
  const raw = storageGet(`pb_ann_${frameId}`);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function setAnnotationOverride(frameId: string, key: string, value: string): void {
  const current = getAnnotationOverrides(frameId);
  if (value === "" || value === "false" || value === "visible") {
    delete current[key];
  } else {
    current[key] = value;
  }
  if (Object.keys(current).length === 0) {
    storageRemove(`pb_ann_${frameId}`);
  } else {
    storageSet(`pb_ann_${frameId}`, JSON.stringify(current));
  }
}

// ---------------------------------------------------------------------------
// CDN prefix overrides
// ---------------------------------------------------------------------------

export function getCdnPrefixOverride(frameId: string): string {
  return storageGet(`pb_cdn_${frameId}`) ?? "";
}

export function setCdnPrefixOverride(frameId: string, value: string): void {
  if (value) {
    storageSet(`pb_cdn_${frameId}`, value);
  } else {
    storageRemove(`pb_cdn_${frameId}`);
  }
}

// ---------------------------------------------------------------------------
// Override collection for export dispatch
// ---------------------------------------------------------------------------

export function collectOverrides(currentFrames: FramePreviewItem[]): {
  targetOverrides: Record<string, string>;
  annotationOverrides: Record<string, Record<string, string>>;
  cdnPrefixOverrides: Record<string, string>;
} {
  const targetOverrides: Record<string, string> = {};
  const annotationOverrides: Record<string, Record<string, string>> = {};
  const cdnPrefixOverrides: Record<string, string> = {};

  for (const frame of currentFrames) {
    const targetOverride = getTargetOverride(frame.id);
    if (targetOverride && targetOverride !== "auto") {
      targetOverrides[frame.id] = targetOverride;
    }
    const annOverrides = getAnnotationOverrides(frame.id);
    if (Object.keys(annOverrides).length > 0) {
      annotationOverrides[frame.id] = annOverrides;
    }
    const cdnPrefix = getCdnPrefixOverride(frame.id);
    if (cdnPrefix) {
      cdnPrefixOverrides[frame.id] = cdnPrefix;
    }
  }

  return { targetOverrides, annotationOverrides, cdnPrefixOverrides };
}
