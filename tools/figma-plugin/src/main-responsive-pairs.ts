/**
 * Responsive pair detection: groups frames into normal frames,
 * desktop artboards, and mobile artboards; validates pairs.
 */

import type { ExportTarget, FrameIssue } from "./types/figma-plugin";
import { detectExportTarget } from "./main-frame-detect";

export interface ResponsivePairResult {
  normalFrames: FrameNode[];
  desktopFramesByKey: Map<string, FrameNode>;
  mobileFramesByKey: Map<string, FrameNode>;
  pairedKeys: Set<string>;
  tempCtxWarnings: string[];
}

/**
 * Splits a sorted frame list into normal frames, desktop/mobile artboard maps,
 * and a set of validated responsive pair keys.
 */
export function detectResponsivePairs(
  frames: FrameNode[],
  targetOverrides: Record<string, string>
): ResponsivePairResult {
  const desktopFramesByKey = new Map<string, FrameNode>();
  const mobileFramesByKey = new Map<string, FrameNode>();
  const normalFrames: FrameNode[] = [];
  const tempCtxWarnings: string[] = [];

  for (const frame of frames) {
    const override = targetOverrides[frame.id];
    // Only auto-detect responsive roles — user overrides are never treated as pairs
    if (!override) {
      const t = detectExportTarget(frame);
      if ((t as ExportTarget & { responsiveRole?: string }).responsiveRole === "desktop") {
        addResponsiveFrameWithCollisionHandling(
          desktopFramesByKey,
          t.key,
          frame,
          "desktop",
          tempCtxWarnings
        );
        continue;
      }
      if ((t as ExportTarget & { responsiveRole?: string }).responsiveRole === "mobile") {
        addResponsiveFrameWithCollisionHandling(
          mobileFramesByKey,
          t.key,
          frame,
          "mobile",
          tempCtxWarnings
        );
        continue;
      }
    }
    normalFrames.push(frame);
  }

  // Validate pairs — warn and skip unpaired frames
  const pairedKeys = new Set<string>();

  for (const key of desktopFramesByKey.keys()) {
    if (mobileFramesByKey.has(key)) {
      pairedKeys.add(key);
    } else {
      const frame = desktopFramesByKey.get(key);
      if (frame) {
        tempCtxWarnings.push(
          `[error] [responsive] Frame "${frame.name}" has Section[Desktop]/ prefix but no matching Section[Mobile]/${key} counterpart — skipped`
        );
      }
    }
  }
  for (const key of mobileFramesByKey.keys()) {
    if (!desktopFramesByKey.has(key)) {
      const frame = mobileFramesByKey.get(key);
      if (frame) {
        tempCtxWarnings.push(
          `[error] [responsive] Frame "${frame.name}" has Section[Mobile]/ prefix but no matching Section[Desktop]/${key} counterpart — skipped`
        );
      }
    }
  }

  return { normalFrames, desktopFramesByKey, mobileFramesByKey, pairedKeys, tempCtxWarnings };
}

function addResponsiveFrameWithCollisionHandling(
  framesByKey: Map<string, FrameNode>,
  key: string,
  frame: FrameNode,
  role: "desktop" | "mobile",
  warnings: string[]
): void {
  const existing = framesByKey.get(key);
  if (!existing) {
    framesByKey.set(key, frame);
    return;
  }
  warnings.push(
    `[error] [responsive] Duplicate Section[${role === "desktop" ? "Desktop" : "Mobile"}]/${key} frame key: keeping "${existing.name}" and ignoring "${frame.name}".`
  );
}

/**
 * When one half of a desktop/mobile pair is user-overridden out of responsive pairing,
 * the orphan frame often looks like an "unpaired" Section[Desktop]/[Mobile] — add clearer context.
 */
export function explainResponsiveOverrideOrphans(
  desktopFramesByKey: Map<string, FrameNode>,
  mobileFramesByKey: Map<string, FrameNode>,
  normalFrames: FrameNode[],
  targetOverrides: Record<string, string>
): string[] {
  const extra: string[] = [];

  for (const key of mobileFramesByKey.keys()) {
    if (desktopFramesByKey.has(key)) continue;
    const mobileFrame = mobileFramesByKey.get(key)!;
    const desktopTwin = normalFrames.find((f) => {
      const t = detectExportTarget(f);
      const role = (t as ExportTarget & { responsiveRole?: string }).responsiveRole;
      return role === "desktop" && t.key === key;
    });
    if (desktopTwin && targetOverrides[desktopTwin.id]) {
      extra.push(
        `[responsive] "${mobileFrame.name}" has no export pair: "${desktopTwin.name}" uses a UI target override (slug "${key}"). Set the same override on both desktop and mobile, or remove overrides so Section[Desktop]/ and Section[Mobile]/ auto-pair.`
      );
    }
  }

  for (const key of desktopFramesByKey.keys()) {
    if (mobileFramesByKey.has(key)) continue;
    const desktopFrame = desktopFramesByKey.get(key)!;
    const mobileTwin = normalFrames.find((f) => {
      const t = detectExportTarget(f);
      const role = (t as ExportTarget & { responsiveRole?: string }).responsiveRole;
      return role === "mobile" && t.key === key;
    });
    if (mobileTwin && targetOverrides[mobileTwin.id]) {
      extra.push(
        `[responsive] "${desktopFrame.name}" has no export pair: "${mobileTwin.name}" uses a UI target override (slug "${key}"). Set the same override on both desktop and mobile, or remove overrides so Section[Desktop]/ and Section[Mobile]/ auto-pair.`
      );
    }
  }

  return extra;
}

export interface PreviewItem {
  id: string;
  name: string;
  target: ExportTarget;
  issues: FrameIssue[];
  responsivePairKey?: string;
}
