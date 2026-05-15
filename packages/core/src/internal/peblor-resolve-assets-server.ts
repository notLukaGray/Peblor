import { getSignedCdnUrl, validateAssetKey } from "../lib/cdn-asset-server";
import { normalizeImageTransformParams } from "../lib/cdn-image-params";
import { buildProxyUrl, needsProxyUrl } from "../lib/proxy-url";
import { resolveBgBlockUrls } from "./peblor-blocks";
import type { bgBlock, PeblorDefinitionBlock, SectionBlock } from "@pb/contracts";
import type { GetSignedImageUrlFn } from "./peblor-resolved-assets";
import { getBunnyImageParams } from "./peblor-resolved-assets";
import {
  collectPeblorAssetRefs,
  injectResolvedUrlsIntoPage,
  injectResolvedUrlsIntoBgBlock,
} from "./peblor-resolved-assets";
import type { BackgroundTransitionEffect } from "@pb/contracts";
import { createMemoizedComputeContainerWidthPx } from "./server/peblor-container-width-server";
import { splitTopLevelCommaList } from "../lib/shared-utils";
import { walkBgBlock } from "./resolved-assets/peblor-asset-tree-walk";

const BG_TYPES_FOR_DEFINITIONS = new Set([
  "backgroundVideo",
  "backgroundImage",
  "backgroundVariable",
  "backgroundPattern",
  "backgroundTransition",
]);

function isBgDefinition(block: unknown): block is bgBlock {
  return (
    block != null &&
    typeof block === "object" &&
    "type" in block &&
    BG_TYPES_FOR_DEFINITIONS.has((block as { type: string }).type)
  );
}

export function buildResolvedBgDefinitions(
  definitions: Record<string, PeblorDefinitionBlock> | undefined,
  assetBase: string
): Record<string, bgBlock> {
  const out: Record<string, bgBlock> = {};
  if (!definitions) return out;
  for (const [key, block] of Object.entries(definitions)) {
    if (isBgDefinition(block)) out[key] = resolveBgBlockUrls(block, assetBase);
  }
  return out;
}

export function buildRawBgDefinitions(
  definitions: Record<string, PeblorDefinitionBlock> | undefined
): Record<string, bgBlock> {
  const out: Record<string, bgBlock> = {};
  if (!definitions) return out;
  for (const [key, block] of Object.entries(definitions)) {
    if (isBgDefinition(block)) out[key] = walkBgBlock(block, () => {});
  }
  return out;
}

function buildProxyUrlMapServer(refs: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const ref of refs) {
    if (ref && needsProxyUrl(ref)) m.set(ref, buildProxyUrl(ref));
  }
  return m;
}

function shouldResolveViaResponsiveImageProxy(
  obj: Record<string, unknown>,
  assetKey: string
): boolean {
  void obj;
  void assetKey;
  // Images now always resolve directly to signed Bunny URLs.
  return false;
}

function isPercentDimension(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      /^\s*\d+(?:\.\d+)?\s*%\s*$/.test(value) ||
      (/^\s*(?:calc|min|max|clamp)\(/.test(value) && value.includes("%"))
    );
  }
  if (Array.isArray(value)) {
    return value.some((entry) => typeof entry === "string" && isPercentDimension(entry));
  }
  return false;
}

function shouldUseFillHeightImageProxy(obj: Record<string, unknown>): boolean {
  return isPercentDimension(obj.height);
}

function shouldUseFillWidthImageProxy(obj: Record<string, unknown>): boolean {
  return isPercentDimension(obj.width) && obj.height === "hug";
}

function buildFillHeightImageProxyParams(
  obj: Record<string, unknown>,
  params: ReturnType<typeof getBunnyImageParams>,
  viewportWidthPx?: number,
  containerWidthPx?: number
): Record<string, string> {
  const sizesWidthPx = estimateWidthFromSizes(obj.sizes, viewportWidthPx);
  const estimatedBaseCandidates = [containerWidthPx, sizesWidthPx, params.width].filter(
    (value): value is number => value != null && Number.isFinite(value) && value >= 0
  );
  const estimatedBase =
    estimatedBaseCandidates.length > 0 ? Math.min(...estimatedBaseCandidates) : params.width;
  const estimatedWidth = Math.round(estimatedBase * 1.25);
  return {
    width: String(Math.max(128, Math.min(estimatedWidth, params.width))),
    quality: String(params.quality),
  };
}

function buildFillWidthImageProxyParams(
  obj: Record<string, unknown>,
  params: ReturnType<typeof getBunnyImageParams>,
  viewportWidthPx?: number,
  containerWidthPx?: number
): Record<string, string> {
  const sizesWidthPx = estimateWidthFromSizes(obj.sizes, viewportWidthPx);
  const estimatedBaseCandidates = [containerWidthPx, sizesWidthPx, params.width].filter(
    (value): value is number => value != null && Number.isFinite(value) && value >= 0
  );
  const estimatedBase =
    estimatedBaseCandidates.length > 0 ? Math.min(...estimatedBaseCandidates) : params.width;
  const estimatedWidth = Math.round(estimatedBase * 1.25);
  return {
    width: String(Math.max(128, Math.min(estimatedWidth, params.width))),
    quality: String(params.quality),
  };
}

function buildResponsiveImageProxyParams(
  obj: Record<string, unknown>,
  assetKey: string,
  params: ReturnType<typeof getBunnyImageParams>,
  viewportWidthPx?: number,
  containerWidthPx?: number
): Record<string, string> {
  const proxyParams: Record<string, string> = {};
  if (params.class != null && params.class !== "") {
    proxyParams.class = params.class;
    return proxyParams;
  }
  if ((obj.type as string | undefined) === "elementImage" && assetKey === "src") {
    if (shouldUseFillHeightImageProxy(obj)) {
      Object.assign(
        proxyParams,
        buildFillHeightImageProxyParams(obj, params, viewportWidthPx, containerWidthPx)
      );
    } else if (shouldUseFillWidthImageProxy(obj)) {
      Object.assign(
        proxyParams,
        buildFillWidthImageProxyParams(obj, params, viewportWidthPx, containerWidthPx)
      );
    }
  }
  if (params.aspect_ratio) proxyParams.aspect_ratio = params.aspect_ratio;
  if (params.height != null) proxyParams.height = String(params.height);
  return normalizeImageTransformParams(proxyParams) ?? ({} as Record<string, string>);
}

function parseMediaLengthCandidate(candidate: string): { media: string; slot: string } | undefined {
  const trimmed = candidate.trim();
  const mediaAndSlotMatch = trimmed.match(
    /^(.+?)\s+(min\(.+\)|max\(.+\)|calc\(.+\)|\d+(?:\.\d+)?(?:vw|px|rem)|0(?:\.0+)?)$/i
  );
  if (!mediaAndSlotMatch) return undefined;
  const media = mediaAndSlotMatch[1]?.trim();
  const slot = mediaAndSlotMatch[2]?.trim();
  if (!media || !slot) return undefined;
  return { media, slot };
}

function mediaConditionMatchesViewport(media: string, viewportPx?: number): boolean | undefined {
  if (viewportPx == null) return undefined;
  const trimmed = media.trim();
  if (!trimmed) return undefined;
  const clauseRegex = /\((max|min)-width\s*:\s*(\d+(?:\.\d+)?)\s*(px|rem|em)\)/gi;
  const mediaAlternatives = splitTopLevelCommaList(trimmed);
  let sawFalse = false;
  let sawUnresolved = false;
  for (const alternative of mediaAlternatives) {
    const branch = alternative.trim();
    if (!branch) continue;
    const clauseMatches = Array.from(branch.matchAll(clauseRegex));
    if (clauseMatches.length === 0) {
      sawUnresolved = true;
      continue;
    }
    const unsupported = branch
      .replace(clauseRegex, "")
      .replace(/\band\b/gi, "")
      .replace(/\bonly\b/gi, "")
      .replace(/\bnot\b/gi, "")
      .replace(/\ball\b/gi, "")
      .replace(/\bscreen\b/gi, "")
      .replace(/\s+/g, "");
    if (unsupported.length > 0) {
      sawUnresolved = true;
      continue;
    }
    let allMatch = true;
    for (const match of clauseMatches) {
      const kind = match[1]?.toLowerCase();
      const rawValue = Number(match[2]);
      const unit = match[3]?.toLowerCase();
      if (!Number.isFinite(rawValue) || (unit !== "px" && unit !== "rem" && unit !== "em")) {
        allMatch = false;
        sawUnresolved = true;
        break;
      }
      const breakpointPx = unit === "px" ? rawValue : rawValue * 16;
      const matches =
        kind === "max"
          ? viewportPx <= breakpointPx
          : kind === "min"
            ? viewportPx >= breakpointPx
            : false;
      if (!matches) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) return true;
    sawFalse = true;
  }
  if (sawUnresolved) return undefined;
  if (sawFalse) return false;
  return undefined;
}

function parseSizesLengthToPx(value: string, viewportPx?: number): number | undefined {
  const s = value.trim();
  if (!s) return undefined;
  if (/^0(?:\.0+)?$/.test(s)) return 0;

  const minMatch = s.match(/^min\((.*)\)$/i);
  if (minMatch) {
    const parts = splitTopLevelCommaList(minMatch[1]!);
    if (parts.length < 2) return undefined;
    const values = parts
      .map((part) => parseSizesLengthToPx(part, viewportPx))
      .filter((part): part is number => part != null);
    if (values.length !== parts.length) return undefined;
    return Math.min(...values);
  }

  const maxMatch = s.match(/^max\((.*)\)$/i);
  if (maxMatch) {
    const parts = splitTopLevelCommaList(maxMatch[1]!);
    if (parts.length < 2) return undefined;
    const values = parts
      .map((part) => parseSizesLengthToPx(part, viewportPx))
      .filter((part): part is number => part != null);
    if (values.length !== parts.length) return undefined;
    return Math.max(...values);
  }

  const calcVwMinusMatch = s.match(
    /^calc\(\s*(\d+(?:\.\d+)?)\s*vw\s*-\s*(\d+(?:\.\d+)?)\s*(px|rem)\s*\)$/i
  );
  if (calcVwMinusMatch) {
    if (viewportPx == null) return undefined;
    const vwPct = Number(calcVwMinusMatch[1]);
    const subtract = Number(calcVwMinusMatch[2]);
    const unit = calcVwMinusMatch[3]?.toLowerCase();
    const subtractPx = unit === "rem" ? subtract * 16 : subtract;
    return Math.round(Math.max(0, (vwPct / 100) * viewportPx - subtractPx));
  }

  const vwMatch = s.match(/^(\d+(?:\.\d+)?)\s*vw$/i);
  if (vwMatch) {
    if (viewportPx == null) return undefined;
    return Math.round((Number(vwMatch[1]) / 100) * viewportPx);
  }

  const pxMatch = s.match(/^(\d+(?:\.\d+)?)\s*px$/i);
  if (pxMatch) return Math.round(Number(pxMatch[1]));

  const remMatch = s.match(/^(\d+(?:\.\d+)?)\s*rem$/i);
  if (remMatch) return Math.round(Number(remMatch[1]) * 16);

  return undefined;
}

function estimateWidthFromSizes(sizes: unknown, viewportPx?: number): number | undefined {
  if (typeof sizes !== "string") return undefined;
  const trimmed = sizes.trim();
  if (!trimmed) return undefined;

  const candidates = splitTopLevelCommaList(trimmed);
  if (candidates.length === 0) return undefined;

  let selected = candidates.at(-1) ?? "";
  let sawUnresolvedMedia = false;
  for (const candidate of candidates) {
    const parsed = parseMediaLengthCandidate(candidate);
    if (!parsed) continue;
    const matches = mediaConditionMatchesViewport(parsed.media, viewportPx);
    if (matches === true) {
      selected = parsed.slot;
      break;
    }
    if (matches == null) sawUnresolvedMedia = true;
  }

  const selectedWidth = parseSizesLengthToPx(selected, viewportPx);
  if (selectedWidth != null) return selectedWidth;

  if (sawUnresolvedMedia) {
    let widestResolvable = 0;
    for (const candidate of candidates) {
      const parsed = parseMediaLengthCandidate(candidate);
      const slot = parsed?.slot ?? candidate;
      const width = parseSizesLengthToPx(slot, viewportPx);
      if (width != null && width > widestResolvable) {
        widestResolvable = width;
      }
    }
    if (widestResolvable > 0) {
      return widestResolvable;
    }
  }

  return undefined;
}

function collectAllRefs(
  resolvedBg: bgBlock | null,
  resolvedSections: SectionBlock[],
  bgDefinitionsRaw: Record<string, bgBlock>,
  transitionsArray: BackgroundTransitionEffect[]
): string[] {
  const refsSet = new Set<string>();
  for (const r of collectPeblorAssetRefs(resolvedBg, resolvedSections)) refsSet.add(r);
  for (const t of transitionsArray) {
    const fromBg = t.from && bgDefinitionsRaw[t.from] ? bgDefinitionsRaw[t.from] : null;
    const toBg = t.to && bgDefinitionsRaw[t.to] ? bgDefinitionsRaw[t.to] : null;
    if (fromBg) for (const r of collectPeblorAssetRefs(fromBg, [])) refsSet.add(r);
    if (toBg) for (const r of collectPeblorAssetRefs(toBg, [])) refsSet.add(r);
  }
  return Array.from(refsSet);
}

export type ResolvePeblorAssetsResult = {
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  bgDefinitions: Record<string, bgBlock>;
};

function buildGetSignedImageUrl(
  urlByRef: Map<string, string | null>,
  proxyUrlByRef: Map<string, string>,
  options: { isMobile?: boolean; viewportWidthPx?: number } | undefined,
  computeContainerWidthPxMemo: (
    section: SectionBlock,
    elementId: string | undefined,
    viewportWidthPx?: number
  ) => number | undefined
): GetSignedImageUrlFn {
  return (ref, obj, assetKey, elementContext) => {
    const valid = validateAssetKey(ref);
    if (!valid) return urlByRef.get(ref) ?? proxyUrlByRef.get(ref) ?? ref;
    const containerWidthPx =
      elementContext != null
        ? computeContainerWidthPxMemo(
            elementContext.section,
            elementContext.element.id,
            options?.viewportWidthPx
          )
        : undefined;
    const params = getBunnyImageParams(obj, assetKey, {
      isMobile: options?.isMobile,
      containerWidthPx,
    });
    if (shouldResolveViaResponsiveImageProxy(obj, assetKey)) {
      return buildProxyUrl(
        valid,
        buildResponsiveImageProxyParams(
          obj,
          assetKey,
          params,
          options?.viewportWidthPx,
          containerWidthPx
        )
      );
    }
    const extraParams: Record<string, unknown> = {};
    if (params.class != null && params.class !== "") {
      extraParams.class = params.class;
      if (params.format) extraParams.format = params.format;
    } else {
      extraParams.format = params.format;
      extraParams.quality = String(params.quality);
      extraParams.width = String(params.width);
      if (params.aspect_ratio) extraParams.aspect_ratio = params.aspect_ratio;
      if (params.height != null) extraParams.height = String(params.height);
    }
    return getSignedCdnUrl(valid, normalizeImageTransformParams(extraParams));
  };
}

export function resolvePeblorAssetsOnServer(
  resolvedBg: bgBlock | null,
  resolvedSections: SectionBlock[],
  bgDefinitionsRaw: Record<string, bgBlock>,
  transitionsArray: BackgroundTransitionEffect[],
  options?: { isMobile?: boolean; viewportWidthPx?: number }
): ResolvePeblorAssetsResult {
  const refs = collectAllRefs(resolvedBg, resolvedSections, bgDefinitionsRaw, transitionsArray);

  const urlByRef = new Map<string, string | null>();
  for (const ref of refs) {
    const valid = validateAssetKey(ref);
    if (valid) urlByRef.set(ref, getSignedCdnUrl(valid));
  }
  const proxyUrlByRef = buildProxyUrlMapServer(refs);

  const computeContainerWidthPxMemo = createMemoizedComputeContainerWidthPx();
  const getSignedImageUrl = buildGetSignedImageUrl(
    urlByRef,
    proxyUrlByRef,
    options,
    computeContainerWidthPxMemo
  );

  const injected = injectResolvedUrlsIntoPage(
    resolvedBg,
    resolvedSections,
    urlByRef,
    proxyUrlByRef,
    getSignedImageUrl
  );

  const bgDefinitions: Record<string, bgBlock> = {};
  for (const [key, block] of Object.entries(bgDefinitionsRaw)) {
    bgDefinitions[key] = injectResolvedUrlsIntoBgBlock(
      block,
      urlByRef,
      proxyUrlByRef,
      getSignedImageUrl
    );
  }

  return {
    resolvedBg: injected.resolvedBg,
    resolvedSections: injected.resolvedSections,
    bgDefinitions,
  };
}
