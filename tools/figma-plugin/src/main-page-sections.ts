import { isFrameNode } from "@figma-plugin/helpers";
import type { ConversionContext } from "./types/figma-plugin";
import { exportImageFillAsset, extractSectionFillPayload } from "./converters/fills";
import { detectExportTarget } from "./main-frame-detect";

function getVisibleChildren(frame: FrameNode): readonly SceneNode[] {
  const children = (frame as unknown as { children?: readonly SceneNode[] }).children;
  if (!Array.isArray(children)) return [];
  return children.filter((child) => child.visible !== false);
}

function getVisibleChildFrames(frame: FrameNode): FrameNode[] {
  return getVisibleChildren(frame).filter((child): child is FrameNode => isFrameNode(child));
}

function sortFramesByCanvasOrder(frames: FrameNode[]): FrameNode[] {
  return [...frames].sort((a, b) => {
    if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > 2) return (a.y ?? 0) - (b.y ?? 0);
    return (a.x ?? 0) - (b.x ?? 0);
  });
}

function isExplicitSectionFrame(frame: FrameNode): boolean {
  return detectExportTarget(frame).type === "preset";
}

export function findExplicitPageSections(frame: FrameNode): FrameNode[] {
  const directFrames = getVisibleChildFrames(frame);
  const directExplicit = directFrames.filter(isExplicitSectionFrame);
  if (directExplicit.length > 0) return sortFramesByCanvasOrder(directExplicit);

  // Common authoring pattern: one inner wrapper frame that contains all Section/* children.
  if (directFrames.length !== 1) return [];
  const wrapperFrames = getVisibleChildFrames(directFrames[0]);
  const wrapperExplicit = wrapperFrames.filter(isExplicitSectionFrame);
  if (wrapperExplicit.length === 0) return [];

  return sortFramesByCanvasOrder(wrapperExplicit);
}

export function inferPageSectionsFromDirectChildren(frame: FrameNode): FrameNode[] {
  const visibleChildren = getVisibleChildren(frame);
  const directFrames = getVisibleChildFrames(frame);
  if (directFrames.length < 2) return [];

  const frameRatio =
    visibleChildren.length === 0 ? 0 : directFrames.length / visibleChildren.length;
  if (frameRatio < 0.6) return [];

  return sortFramesByCanvasOrder(directFrames);
}

export async function extractPageBackgroundDefinition(
  frame: FrameNode,
  ctx: ConversionContext
): Promise<Record<string, unknown> | null> {
  const rawFills = (frame as unknown as { fills?: unknown }).fills;
  const fills = Array.isArray(rawFills) ? (rawFills as Paint[]) : [];
  const fillPayload = extractSectionFillPayload(fills, {
    width: frame.width,
    height: frame.height,
  });
  const bgImage = await exportImageFillAsset(frame, ctx);

  if (bgImage) return { type: "backgroundImage", image: bgImage };
  if (Array.isArray(fillPayload?.layers) && fillPayload.layers.length > 0) {
    return { type: "backgroundVariable", layers: fillPayload.layers };
  }
  if (typeof fillPayload?.fill === "string" && fillPayload.fill.trim().length > 0) {
    return { type: "backgroundVariable", layers: [{ fill: fillPayload.fill }] };
  }
  return null;
}

export function applyPageBackgroundDefinition(args: {
  pageRecord: unknown;
  pageKey: string;
  pageTitle: string;
  definition: Record<string, unknown>;
}): Record<string, unknown> {
  const { pageRecord, pageKey, pageTitle, definition } = args;
  const rec =
    pageRecord && typeof pageRecord === "object" ? (pageRecord as Record<string, unknown>) : {};
  const definitions =
    rec.definitions && typeof rec.definitions === "object" && !Array.isArray(rec.definitions)
      ? { ...(rec.definitions as Record<string, unknown>) }
      : {};
  const sectionOrder = Array.isArray(rec.sectionOrder)
    ? rec.sectionOrder.filter((value): value is string => typeof value === "string")
    : [];

  if (typeof rec.bgKey === "string" && rec.bgKey.trim().length > 0) {
    return {
      slug: typeof rec.slug === "string" && rec.slug.trim() ? rec.slug : pageKey,
      title: typeof rec.title === "string" && rec.title.trim() ? rec.title : pageTitle,
      sectionOrder,
      definitions,
      bgKey: rec.bgKey,
      ...(rec.preset && typeof rec.preset === "object" && !Array.isArray(rec.preset)
        ? { preset: rec.preset }
        : {}),
    };
  }

  const bgKey = getUniqueBgKey("bg", definitions);
  definitions[bgKey] = definition;
  return {
    slug: typeof rec.slug === "string" && rec.slug.trim() ? rec.slug : pageKey,
    title: typeof rec.title === "string" && rec.title.trim() ? rec.title : pageTitle,
    sectionOrder,
    definitions,
    bgKey,
    ...(rec.preset && typeof rec.preset === "object" && !Array.isArray(rec.preset)
      ? { preset: rec.preset }
      : {}),
  };
}

function getUniqueBgKey(baseKey: string, definitions: Record<string, unknown>): string {
  if (!(baseKey in definitions)) return baseKey;
  let i = 2;
  while (`${baseKey}-${i}` in definitions) i += 1;
  return `${baseKey}-${i}`;
}
