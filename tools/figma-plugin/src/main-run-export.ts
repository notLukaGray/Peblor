/**
 * Core export orchestration: frame collection, preview dispatch,
 * context setup, conversion, and result dispatch to the UI thread.
 */

import type {
  ConversionContext,
  ExportArtifact,
  ExportResult,
  ExportScope,
} from "./types/figma-plugin";
import { detectExportTarget, getPrefixDiagnostics, parseTargetOverride } from "./main-frame-detect";
import {
  detectResponsivePairs,
  explainResponsiveOverrideOrphans,
  type PreviewItem,
} from "./main-responsive-pairs";
import { collectContentSplitWarnings } from "./content-split-guards";
import { convertNormalFrames, convertResponsivePairs } from "./main-frame-convert";
import { stripAnnotations } from "./converters/annotations-parse";
import { topLevelFrames, isFrameNode } from "@figma-plugin/helpers";
import {
  buildExportTrace,
  countElementsInResult,
  formatFrameIssueWarning,
  getIssueSeverity,
  quickScanFrame,
} from "./main-export-helpers";
import {
  buildParityTraceSnapshot,
  createExportParityState,
  EXPORT_DROP_REASON,
  recomputeOutputParityFromExportResult,
  recordUpstreamDropOnParity,
} from "./export-parity";
import { buildSectionExportArtifact } from "./main-section-export-artifact";
import {
  peblorSchema,
  sectionBlockSchema,
  modalBuilderSchema,
  moduleBlockSchema,
  bgBlockSchema,
} from "@pb/contracts";

interface SelectionState {
  frames: FrameNode[];
  source: "selection" | "top-level-fallback";
  normalFrames: FrameNode[];
  desktopFramesByKey: Map<string, FrameNode>;
  mobileFramesByKey: Map<string, FrameNode>;
  pairedKeys: Set<string>;
  tempCtxWarnings: string[];
  previewItems: PreviewItem[];
}

interface FrameSelectionResult {
  frames: FrameNode[];
  source: "selection" | "top-level-fallback";
}

interface SelectionOptions {
  autoPresets?: boolean;
  scope?: ExportScope;
  frameId?: string;
  responsivePairKey?: string;
}

const WRAPPER_FRAME_MARKERS = new Set([
  "pb-wrapper",
  "pb:wrapper",
  "pb-export-wrapper",
  "pb-export-shell",
]);

function isMarkedWrapperFrame(frame: FrameNode): boolean {
  const normalizedName = stripAnnotations(frame.name || "")
    .trim()
    .toLowerCase();
  return WRAPPER_FRAME_MARKERS.has(normalizedName);
}

function getVisibleChildFrames(frame: FrameNode): FrameNode[] {
  return frame.children.filter(
    (child): child is FrameNode => isFrameNode(child) && child.visible !== false
  );
}

function pickWrappedExportFrame(frame: FrameNode): FrameNode {
  if (!isMarkedWrapperFrame(frame)) return frame;
  const childFrames = getVisibleChildFrames(frame);
  if (childFrames.length === 0) return frame;
  const pageChild = childFrames.find((child) => detectExportTarget(child).type === "page");
  if (pageChild) return pageChild;
  if (childFrames.length === 1) return childFrames[0];
  return frame;
}

export function resolveWrapperFrames(frames: FrameNode[]): FrameNode[] {
  const resolved = frames.map(pickWrappedExportFrame);
  const seen = new Set<string>();
  const unique: FrameNode[] = [];
  for (const frame of resolved) {
    if (seen.has(frame.id)) continue;
    seen.add(frame.id);
    unique.push(frame);
  }
  return unique;
}

function sortFrames(frames: FrameNode[]): void {
  // Sort top-to-bottom, left-to-right (2px threshold for row alignment)
  frames.sort((a, b) => {
    const ay = a.y ?? 0;
    const by_ = b.y ?? 0;
    if (Math.abs(ay - by_) > 2) return ay - by_;
    return (a.x ?? 0) - (b.x ?? 0);
  });
}

function getTopLevelFramesSafe(): FrameNode[] {
  try {
    return topLevelFrames(figma.currentPage).filter((frame) => frame.visible !== false);
  } catch {
    return figma.currentPage.children.filter(
      (node): node is FrameNode => isFrameNode(node) && node.visible !== false
    );
  }
}

function getSelectedFrames(): FrameSelectionResult {
  const selection = figma.currentPage.selection;
  const selectedFrames = selection.filter((n): n is FrameNode => isFrameNode(n));
  if (selectedFrames.length > 0) {
    const frames = resolveWrapperFrames(selectedFrames);
    sortFrames(frames);
    return { frames, source: "selection" };
  }
  if (selection.length > 0) {
    return { frames: [], source: "selection" };
  }

  const topLevel = getTopLevelFramesSafe();
  const frames = resolveWrapperFrames(topLevel);
  sortFrames(frames);
  return { frames, source: "top-level-fallback" };
}

function getResponsivePairKey(frame: FrameNode): string | null {
  const target = detectExportTarget(frame);
  if (target.responsiveRole === "desktop" || target.responsiveRole === "mobile") {
    return target.key;
  }
  return null;
}

function applyScopeToFrames(frames: FrameNode[], options?: SelectionOptions): FrameNode[] {
  if ((options?.scope ?? "all-selected") !== "single-frame") return frames;

  if (options?.responsivePairKey) {
    const responsiveFrames = frames.filter(
      (frame) => getResponsivePairKey(frame) === options.responsivePairKey
    );
    return resolveWrapperFrames(responsiveFrames);
  }

  if (options?.frameId) {
    return frames.filter((frame) => frame.id === options.frameId);
  }

  return [];
}

function buildSelectionState(
  targetOverrides: Record<string, string>,
  options?: SelectionOptions
): SelectionState | null {
  const selectionResult = getSelectedFrames();
  if (selectionResult.frames.length === 0) {
    return null;
  }
  const frames = applyScopeToFrames(selectionResult.frames, options);
  if (frames.length === 0) return null;

  const { normalFrames, desktopFramesByKey, mobileFramesByKey, pairedKeys, tempCtxWarnings } =
    detectResponsivePairs(frames, targetOverrides);
  tempCtxWarnings.push(
    ...explainResponsiveOverrideOrphans(
      desktopFramesByKey,
      mobileFramesByKey,
      normalFrames,
      targetOverrides
    )
  );
  if (
    selectionResult.source === "top-level-fallback" &&
    (options?.scope ?? "all-selected") === "all-selected"
  ) {
    tempCtxWarnings.push(
      `[info] [frame-selection] No explicit frame selection — exporting all visible top-level frames on the current page.`
    );
  }
  const previewItems: PreviewItem[] = [];

  for (const frame of normalFrames) {
    const override = targetOverrides[frame.id];
    const t = override ? parseTargetOverride(override, frame) : detectExportTarget(frame);
    const issues = [
      ...getPrefixDiagnostics(frame).map((message) => ({
        severity: "warn" as const,
        category: "prefix",
        message,
      })),
      ...quickScanFrame(frame, { suppressStructure: options?.autoPresets }),
    ];
    tempCtxWarnings.push(...issues.map((issue) => formatFrameIssueWarning(frame.name, issue)));
    previewItems.push({ id: frame.id, name: frame.name, target: t, issues });
  }

  for (const key of pairedKeys) {
    const dFrame = desktopFramesByKey.get(key)!;
    const mFrame = mobileFramesByKey.get(key)!;
    const dTarget = detectExportTarget(dFrame);
    const mIssues = [
      ...getPrefixDiagnostics(mFrame).map((message) => ({
        severity: "warn" as const,
        category: "prefix",
        message,
      })),
      ...quickScanFrame(mFrame, { suppressStructure: options?.autoPresets }),
    ];
    const dIssues = [
      ...getPrefixDiagnostics(dFrame).map((message) => ({
        severity: "warn" as const,
        category: "prefix",
        message,
      })),
      ...quickScanFrame(dFrame, { suppressStructure: options?.autoPresets }),
    ];
    previewItems.push({
      id: dFrame.id,
      name: `${dTarget.label} [desktop+mobile]`,
      target: { type: dTarget.type, key: dTarget.key, label: dTarget.label },
      issues: [...mIssues, ...dIssues],
      responsivePairKey: key,
    });
    tempCtxWarnings.push(...mIssues.map((issue) => formatFrameIssueWarning(mFrame.name, issue)));
    tempCtxWarnings.push(...dIssues.map((issue) => formatFrameIssueWarning(dFrame.name, issue)));
  }

  return {
    frames,
    source: selectionResult.source,
    normalFrames,
    desktopFramesByKey,
    mobileFramesByKey,
    pairedKeys,
    tempCtxWarnings,
    previewItems,
  };
}

function postNoSelectionError(): void {
  figma.ui.postMessage({ type: "error", message: "Please select at least one Frame to export." });
}

export function refreshPreview(
  targetOverrides: Record<string, string>,
  autoPresets?: boolean
): void {
  const state = buildSelectionState(targetOverrides, { autoPresets });
  if (!state) {
    postNoSelectionError();
    return;
  }

  figma.ui.postMessage({ type: "preview", items: state.previewItems });
}

function hasGlassEffectInResult(result: ExportResult): boolean {
  const search = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(search);
    if (value !== null && typeof value === "object") {
      const rec = value as Record<string, unknown>;
      if (rec.type === "glass") return true;
      return Object.values(rec).some(search);
    }
    return false;
  };
  return (
    search(result.pages) ||
    search(result.presets) ||
    search(result.modals) ||
    search(result.modules)
  );
}

function appendContractsValidationDiagnostics(
  result: ExportResult,
  warnings: string[],
  errors: string[]
): void {
  for (const [slug, page] of Object.entries(result.pages)) {
    const parsed = peblorSchema.safeParse(page);
    if (parsed.success) continue;
    errors.push(`[error] [contracts] Page "${slug}" failed @pb/contracts validation.`);
    const firstIssue = parsed.error.issues[0];
    if (firstIssue) {
      const issuePath =
        firstIssue.path.length > 0
          ? firstIssue.path.map((segment) => String(segment)).join(".")
          : "$";
      warnings.push(`[warn] [contracts] ${slug} ${issuePath}: ${firstIssue.message}`);
    }
  }
  for (const [key, preset] of Object.entries(result.presets)) {
    const parsed = sectionBlockSchema.safeParse(preset);
    if (parsed.success) continue;
    errors.push(`[error] [contracts] Preset "${key}" failed @pb/contracts section validation.`);
    const firstIssue = parsed.error.issues[0];
    if (firstIssue) {
      warnings.push(`[warn] [contracts] preset ${key}: ${firstIssue.message}`);
    }
  }
  for (const [key, modal] of Object.entries(result.modals)) {
    const parsed = modalBuilderSchema.safeParse(modal);
    if (parsed.success) continue;
    errors.push(`[error] [contracts] Modal "${key}" failed @pb/contracts validation.`);
    const firstIssue = parsed.error.issues[0];
    if (firstIssue) {
      warnings.push(`[warn] [contracts] modal ${key}: ${firstIssue.message}`);
    }
  }
  for (const [key, module] of Object.entries(result.modules)) {
    const parsed = moduleBlockSchema.safeParse(module);
    if (parsed.success) continue;
    errors.push(`[error] [contracts] Module "${key}" failed @pb/contracts validation.`);
    const firstIssue = parsed.error.issues[0];
    if (firstIssue) {
      warnings.push(`[warn] [contracts] module ${key}: ${firstIssue.message}`);
    }
  }
  if (result.globals.backgrounds) {
    for (const [key, bg] of Object.entries(result.globals.backgrounds)) {
      const parsed = bgBlockSchema.safeParse(bg);
      if (parsed.success) continue;
      errors.push(
        `[error] [contracts] Global background "${key}" failed @pb/contracts validation.`
      );
      const firstIssue = parsed.error.issues[0];
      if (firstIssue) {
        warnings.push(`[warn] [contracts] global bg ${key}: ${firstIssue.message}`);
      }
    }
  }
}

export async function runExport(
  targetOverrides: Record<string, string>,
  annotationOverrides: Record<string, Record<string, string>>,
  cdnPrefixOverrides: Record<string, string>,
  mode: "copy" | "copy-merged" | "zip" = "zip",
  autoPresets = false,
  scope: ExportScope = "all-selected",
  frameId?: string,
  artifact: ExportArtifact = "full",
  responsivePairKey?: string
): Promise<void> {
  const state = buildSelectionState(targetOverrides, {
    autoPresets,
    scope,
    frameId,
    responsivePairKey,
  });
  if (!state) {
    postNoSelectionError();
    return;
  }

  if (artifact === "section" && state.previewItems.length !== 1) {
    figma.ui.postMessage({
      type: "error",
      message:
        'Section artifact export requires exactly one preview row. Use "Copy section" on a frame row.',
    });
    return;
  }

  figma.ui.postMessage({
    type: "progress",
    message: `Found ${state.frames.length} frame(s) to export…`,
  });
  figma.ui.postMessage({ type: "preview", items: state.previewItems });
  figma.ui.postMessage({
    type: "progress",
    message: `Converting ${state.frames.length} frame(s)…`,
  });

  const exportParity = createExportParityState();
  for (const key of state.desktopFramesByKey.keys()) {
    if (!state.pairedKeys.has(key)) {
      recordUpstreamDropOnParity(exportParity, EXPORT_DROP_REASON.RESPONSIVE_ORPHAN_FRAME);
    }
  }
  for (const key of state.mobileFramesByKey.keys()) {
    if (!state.pairedKeys.has(key)) {
      recordUpstreamDropOnParity(exportParity, EXPORT_DROP_REASON.RESPONSIVE_ORPHAN_FRAME);
    }
  }

  const ctx: ConversionContext & { errors: string[]; info: string[] } = {
    assets: [],
    warnings: [...state.tempCtxWarnings],
    errors: [],
    info: [],
    exportParity,
    autoPresets,
    usedPresetKeys: new Set(
      state.previewItems
        .map((item) => item.target)
        .filter((t) => t.type === "preset")
        .map((t) => t.key)
    ),
    assetCounter: 0,
    usedIds: new Set(),
    usedAssetKeys: new Set(),
    cdnPrefix: "",
    skipAssets: mode === "copy" || mode === "copy-merged",
  };

  for (const frame of state.frames) {
    const name = (frame.name || "").toLowerCase();
    if (name.startsWith("bg-") || name === "background") {
      ctx.warnings.push(
        `[bgBlock] Frame "${frame.name}" looks like a background — consider authoring as a bgBlock manually.`
      );
    }
  }

  const result: ExportResult = {
    pages: {},
    presets: {},
    modals: {},
    modules: {},
    globals: {},
    assets: ctx.assets,
    warnings: ctx.warnings,
    elementCount: 0,
  };

  await convertNormalFrames(
    state.normalFrames,
    targetOverrides,
    annotationOverrides,
    cdnPrefixOverrides,
    ctx,
    result
  );
  await convertResponsivePairs(
    state.pairedKeys,
    state.desktopFramesByKey,
    state.mobileFramesByKey,
    cdnPrefixOverrides,
    ctx,
    result
  );
  appendContractsValidationDiagnostics(result, ctx.warnings, ctx.errors);

  result.elementCount = countElementsInResult(result);
  recomputeOutputParityFromExportResult(exportParity, result);
  ctx.warnings.push(...collectContentSplitWarnings(result));

  // One-time info note when any glass effect is present — glass renders differently
  // in Figma (shader-based) vs the web (SVG displacement filter). Push once per export.
  if (hasGlassEffectInResult(result)) {
    ctx.warnings.push(
      "[info] Glass effect detected: glass may appear differently in Figma vs the web renderer. " +
        "Physics-based refraction (bezel shape, displacement, specular) is approximated — verify visually in the browser."
    );
  }

  for (const w of ctx.warnings) {
    const sev = getIssueSeverity(w);
    if (sev === "error") ctx.errors.push(w);
    else if (sev === "info") ctx.info.push(w);
  }

  result.trace = buildExportTrace(
    state.previewItems.map((item) => ({ id: item.id, name: item.name, issues: item.issues })),
    ctx.warnings,
    ctx.exportParity !== undefined ? buildParityTraceSnapshot(ctx.exportParity) : undefined
  );

  const sectionArtifact =
    artifact === "section" ? buildSectionExportArtifact(result, state.previewItems[0]) : undefined;
  if (artifact === "section" && !sectionArtifact) {
    figma.ui.postMessage({
      type: "error",
      message:
        "Could not build section artifact from export output. Ensure a single frame row is selected.",
    });
    return;
  }

  const warningCount = ctx.warnings.filter(
    (w) => !w.startsWith("[error]") && !w.startsWith("[info]") && !w.startsWith("[docs]")
  ).length;

  figma.ui.postMessage({
    type: "result",
    payload: result,
    errorCount: ctx.errors.length,
    warningCount,
    infoCount: ctx.info.length,
    errors: ctx.errors,
    mode,
    artifact,
    ...(sectionArtifact ? { sectionArtifact } : {}),
  });
}
