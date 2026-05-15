/**
 * Per-frame and responsive-pair conversion loops.
 * Each function takes a pre-built context and result, mutates result in place.
 */

import type { ConversionContext, ExportResult, ExportTarget } from "./types/figma-plugin";
import { convertFrameToSection } from "./converters";
import { mergeResponsiveSections } from "./converters/responsive-merge";
import { detectExportTarget, parseTargetOverride } from "./main-frame-detect";
import { applyFrameToResult } from "./main-export-helpers";
import { parseAnnotations, stripAnnotations } from "./converters/annotations-parse";
import { EXPORT_DROP_REASON, getOrCreateExportParity, recordUpstreamDrop } from "./export-parity";
import {
  applyPageBackgroundDefinition,
  extractPageBackgroundDefinition,
  findExplicitPageSections,
  inferPageSectionsFromDirectChildren,
} from "./main-page-sections";

export async function convertNormalFrames(
  normalFrames: FrameNode[],
  targetOverrides: Record<string, string>,
  annotationOverrides: Record<string, Record<string, string>>,
  cdnPrefixOverrides: Record<string, string>,
  ctx: ConversionContext,
  result: ExportResult
): Promise<void> {
  for (const frame of normalFrames) {
    figma.ui.postMessage({ type: "progress", message: `Converting frame "${frame.name}"…` });
    ctx.cdnPrefix = cdnPrefixOverrides[frame.id] ?? "";

    const override = targetOverrides[frame.id];
    const target = override ? parseTargetOverride(override, frame) : detectExportTarget(frame);

    if (target.type === "skip") {
      getOrCreateExportParity(ctx);
      recordUpstreamDrop(ctx, EXPORT_DROP_REASON.EXPORT_TARGET_SKIP);
      ctx.warnings.push(`[info] "${frame.name}" — skipped by user`);
      continue;
    }

    const frameAnnotationOverrides = annotationOverrides[frame.id];
    const hasFrameAnnotationOverrides = hasMeaningfulAnnotationOverrides(frameAnnotationOverrides);
    if (target.type === "page") {
      const explicitSections = findExplicitPageSections(frame);
      if (explicitSections.length > 0) {
        if (hasFrameAnnotationOverrides) {
          ctx.warnings.push(
            `[info] "${frame.name}" has frame-level annotation overrides, but explicit Section/* child splitting takes precedence.`
          );
        }
        await applyDetectedPageSections(frame, explicitSections, target, "explicit", ctx, result);
        continue;
      }

      if (!hasFrameAnnotationOverrides) {
        const inferredSections = inferPageSectionsFromDirectChildren(frame);
        if (inferredSections.length > 0) {
          await applyDetectedPageSections(frame, inferredSections, target, "inferred", ctx, result);
          continue;
        }
      }
    }

    await convertSingleFrameToTarget(
      frame,
      target,
      hasFrameAnnotationOverrides ? frameAnnotationOverrides : undefined,
      ctx,
      result
    );
  }
}

export async function convertResponsivePairs(
  pairedKeys: Set<string>,
  desktopFramesByKey: Map<string, FrameNode>,
  mobileFramesByKey: Map<string, FrameNode>,
  cdnPrefixOverrides: Record<string, string>,
  ctx: ConversionContext,
  result: ExportResult
): Promise<void> {
  for (const key of pairedKeys) {
    const mobileFrame = mobileFramesByKey.get(key)!;
    const desktopFrame = desktopFramesByKey.get(key)!;
    const baselineUsedIds = new Set(ctx.usedIds);
    const mobileCtx = clonePairConversionContext(ctx, baselineUsedIds);
    const desktopCtx = clonePairConversionContext(ctx, baselineUsedIds);

    figma.ui.postMessage({ type: "progress", message: `Converting responsive pair "${key}"…` });
    ctx.cdnPrefix = cdnPrefixOverrides[desktopFrame.id] ?? cdnPrefixOverrides[mobileFrame.id] ?? "";
    mobileCtx.cdnPrefix = ctx.cdnPrefix;
    desktopCtx.cdnPrefix = ctx.cdnPrefix;

    let mobileSection: unknown;
    let desktopSection: unknown;

    try {
      surfaceDescription(mobileFrame, ctx);
      mobileSection = await convertFrameToSection(mobileFrame, mobileCtx);
    } catch (err) {
      ctx.warnings.push(`[error] "${mobileFrame.name}": Failed to convert mobile — ${String(err)}`);
      continue;
    }

    try {
      surfaceDescription(desktopFrame, ctx);
      desktopSection = await convertFrameToSection(desktopFrame, desktopCtx);
    } catch (err) {
      ctx.warnings.push(
        `[error] "${desktopFrame.name}": Failed to convert desktop — ${String(err)}`
      );
      continue;
    }

    const merged = mergeResponsiveSections(
      mobileSection as Record<string, unknown>,
      desktopSection as Record<string, unknown>
    );

    ctx.warnings.push(`[info] Merged responsive pair "${key}" (mobile + desktop)`);
    reserveUsedIds(ctx.usedIds, mobileCtx.usedIds);
    reserveUsedIds(ctx.usedIds, desktopCtx.usedIds);

    const desktopTarget = detectExportTarget(desktopFrame);
    const mergedTarget: ExportTarget = {
      type: desktopTarget.type,
      key: desktopTarget.key,
      label: desktopTarget.label,
    };

    applyFrameToResult(desktopFrame, mergedTarget, merged, result, ctx);
  }
}

async function applyDetectedPageSections(
  frame: FrameNode,
  sectionFrames: FrameNode[],
  target: ExportTarget,
  mode: "explicit" | "inferred",
  ctx: ConversionContext,
  result: ExportResult
): Promise<void> {
  const bgDefinition = await extractPageBackgroundDefinition(frame, ctx);
  const modeLabel =
    mode === "explicit" ? `used explicit Section/* frames to split into` : "inferred";
  if (bgDefinition) {
    result.pages[target.key] = applyPageBackgroundDefinition({
      pageRecord: result.pages[target.key],
      pageKey: target.key,
      pageTitle: target.label,
      definition: bgDefinition,
    });
    ctx.warnings.push(
      `[info] "${frame.name}" promoted parent frame fill to page background and ${modeLabel} ${sectionFrames.length} section frame(s).`
    );
  } else {
    ctx.warnings.push(
      `[info] "${frame.name}" ${modeLabel} ${sectionFrames.length} section frame(s).`
    );
  }

  for (const childFrame of sectionFrames) {
    await convertSingleFrameToTarget(childFrame, target, undefined, ctx, result);
  }
}

async function convertSingleFrameToTarget(
  frame: FrameNode,
  target: ExportTarget,
  frameAnnotationOverrides: Record<string, string> | undefined,
  ctx: ConversionContext,
  result: ExportResult
): Promise<void> {
  if (frameAnnotationOverrides) {
    const originalName = frame.name;
    (frame as unknown as { name: string }).name = buildMergedAnnotationName(
      originalName,
      frameAnnotationOverrides
    );
    try {
      surfaceDescription(frame, ctx);
      const section = await convertFrameToSection(frame, ctx);
      (frame as unknown as { name: string }).name = originalName;
      applyFrameToResult(frame, target, section, result, ctx);
    } catch (err) {
      (frame as unknown as { name: string }).name = originalName;
      ctx.warnings.push(`[error] "${frame.name}": Failed to convert — ${String(err)}`);
    }
    return;
  }

  surfaceDescription(frame, ctx);
  try {
    const section = await convertFrameToSection(frame, ctx);
    applyFrameToResult(frame, target, section, result, ctx);
  } catch (err) {
    ctx.warnings.push(`[error] "${frame.name}": Failed to convert — ${String(err)}`);
  }
}

function clonePairConversionContext(
  ctx: ConversionContext,
  usedIds: Set<string>
): ConversionContext {
  return {
    ...ctx,
    usedIds: new Set(usedIds),
  };
}

function reserveUsedIds(target: Set<string>, source: Set<string>): void {
  for (const id of source) target.add(id);
}

export function surfaceDescription(frame: FrameNode, ctx: ConversionContext): void {
  const nodeWithDesc = frame as FrameNode & { description?: string };
  if (nodeWithDesc.description?.trim()) {
    ctx.warnings.push(`[docs] "${frame.name}": ${nodeWithDesc.description.trim()}`);
  }
}

function buildMergedAnnotationName(
  originalName: string,
  annotationOverrides: Record<string, string>
): string {
  const baseName = stripAnnotations(originalName || "untitled");
  const existingAnnotations = parseAnnotations(originalName || "");
  const mergedAnnotations: Record<string, string> = {
    ...existingAnnotations,
    ...annotationOverrides,
  };
  const pairs = Object.entries(mergedAnnotations).filter(([key]) => key.trim().length > 0);
  if (pairs.length === 0) return baseName;

  pairs.sort(([a], [b]) => a.localeCompare(b));
  const annotationString = pairs.map(([key, value]) => `${key}=${value}`).join(", ");
  return `${baseName} [pb: ${annotationString}]`;
}

function hasMeaningfulAnnotationOverrides(
  annotationOverrides: Record<string, string> | undefined
): boolean {
  if (!annotationOverrides) return false;
  return Object.keys(annotationOverrides).length > 0;
}
