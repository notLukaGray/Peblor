import { validateAssetKey } from "../lib/cdn-asset-server";
import { normalizeImageTransformParams } from "../lib/cdn-image-params";
import { buildProxyUrl } from "../lib/proxy-url";
import { getCoreGlobals } from "../lib/globals";
import { resolveBgBlockUrls } from "./peblor-blocks";
import type { bgBlock, PeblorDefinitionBlock, SectionBlock } from "@pb/contracts";
import { BG_BLOCK_TYPE_STRINGS } from "@pb/contracts";
import { lowerThemeValueDeep } from "./theme-utils";
import type { ResolveImageAssetFn, ResolvedImageAsset } from "./peblor-resolved-assets";
import { getBunnyImageParams } from "./peblor-resolved-assets";
import {
  collectPeblorAssetRefs,
  injectResolvedUrlsIntoPage,
  injectResolvedUrlsIntoBgBlock,
} from "./peblor-resolved-assets";
import type { BackgroundTransitionEffect } from "@pb/contracts";
import { createMemoizedComputeContainerWidthPx } from "./server/peblor-container-width-server";
import { walkBgBlock } from "./resolved-assets/peblor-asset-tree-walk";
import { buildBlurDataUri } from "./resolved-assets/peblor-blur-data-uri";

const BG_TYPES_FOR_DEFINITIONS = new Set(BG_BLOCK_TYPE_STRINGS);

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
  const { cdnBase } = getCoreGlobals();
  // When no CDN is configured (dev, local-only), skip proxy URL generation
  // entirely — assets use their original refs as direct URLs.
  if (!cdnBase) return m;
  for (const ref of refs) {
    const valid = validateAssetKey(ref);
    if (valid) m.set(ref, buildProxyUrl(valid));
  }
  return m;
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

function buildImageTransformParams(
  params: ReturnType<typeof getBunnyImageParams>,
  widthOverride?: number
): Record<string, string> | undefined {
  const extraParams: Record<string, unknown> = {};
  if (params.class != null && params.class !== "") {
    extraParams.class = params.class;
    if (params.format) extraParams.format = params.format;
  } else {
    extraParams.format = params.format;
    extraParams.quality = String(params.quality);
    extraParams.width = String(widthOverride ?? params.width);
    if (params.aspect_ratio) extraParams.aspect_ratio = params.aspect_ratio;
    if (params.height != null) extraParams.height = String(params.height);
  }
  return normalizeImageTransformParams(extraParams);
}

function buildImageSrcSet(
  assetKey: string,
  params: ReturnType<typeof getBunnyImageParams>
): string | undefined {
  if (!params.widths || params.widths.length === 0) return undefined;
  const entries = params.widths.map((width) => {
    const transforms = buildImageTransformParams(params, width);
    return `${buildProxyUrl(assetKey, transforms)} ${width}w`;
  });
  return entries.length > 1 ? entries.join(", ") : undefined;
}

function buildResolveImageAsset(
  urlByRef: Map<string, string | null>,
  proxyUrlByRef: Map<string, string>,
  options: { isMobile?: boolean; viewportWidthPx?: number } | undefined,
  computeContainerWidthPxMemo: (
    section: SectionBlock,
    elementId: string | undefined,
    viewportWidthPx?: number
  ) => number | undefined
): ResolveImageAssetFn {
  return (ref, obj, assetKey, elementContext) => {
    const valid = validateAssetKey(ref);
    if (!valid) {
      return { src: urlByRef.get(ref) ?? proxyUrlByRef.get(ref) ?? ref };
    }
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
    const src = buildProxyUrl(valid, buildImageTransformParams(params));
    const isElementImage = obj.type === "elementImage";
    const srcSet = isElementImage ? buildImageSrcSet(valid, params) : undefined;
    const blurDataURL = isElementImage ? buildBlurDataUri(valid, obj) : undefined;
    const result: ResolvedImageAsset = { src };
    if (srcSet) result.srcSet = srcSet;
    if (blurDataURL) result.blurDataURL = blurDataURL;
    return result;
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

  const proxyUrlByRef = buildProxyUrlMapServer(refs);
  const urlByRef = new Map<string, string | null>(proxyUrlByRef);

  const computeContainerWidthPxMemo = createMemoizedComputeContainerWidthPx();
  const resolveImageAsset = buildResolveImageAsset(
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
    resolveImageAsset
  );

  const bgDefinitions: Record<string, bgBlock> = {};
  for (const [key, block] of Object.entries(bgDefinitionsRaw)) {
    bgDefinitions[key] = lowerThemeValueDeep(
      injectResolvedUrlsIntoBgBlock(block, urlByRef, proxyUrlByRef, resolveImageAsset)
    ) as bgBlock;
  }

  return {
    resolvedBg: lowerThemeValueDeep(injected.resolvedBg) as bgBlock | null,
    resolvedSections: injected.resolvedSections,
    bgDefinitions,
  };
}
