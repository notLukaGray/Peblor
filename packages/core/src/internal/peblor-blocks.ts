import { getCoreGlobals } from "../lib/globals";
import { buildProxyUrl, isAssetKey } from "../lib/proxy-url";
import type { ElementBlock, ResolvedPage, SectionBlock, bgBlock } from "@pb/contracts";
import { walkBgBlock, walkElement, walkSection } from "./resolved-assets/peblor-asset-tree-walk";

const BG_BLOCK_TYPES = new Set([
  "backgroundVideo",
  "backgroundImage",
  "backgroundVariable",
  "backgroundPattern",
  "backgroundTransition",
]);

export function isBgBlockShape(value: unknown): value is bgBlock {
  return (
    value != null &&
    typeof value === "object" &&
    "type" in value &&
    typeof (value as { type: string }).type === "string" &&
    BG_BLOCK_TYPES.has((value as { type: string }).type)
  );
}

export function getAssetBaseUrl(page: ResolvedPage | null): string {
  if (page?.assetBaseUrl != null && typeof page.assetBaseUrl === "string") return page.assetBaseUrl;
  return getCoreGlobals().assetBaseUrl;
}

export function resolveBgBlockUrls(block: bgBlock, _base: string): bgBlock {
  return walkBgBlock(block, (key, value, node) => {
    if (typeof value !== "string") return;
    if (!isAssetKey(value)) return;
    (node as Record<string, string>)[key] = buildProxyUrl(value);
  });
}

export function resolveElementBlockUrls(block: ElementBlock, _base: string): ElementBlock {
  return walkElement(block, (key, value, node) => {
    if (typeof value !== "string") return;
    if (!isAssetKey(value)) return;
    (node as Record<string, string>)[key] = buildProxyUrl(value);
  });
}

export function resolveSectionBlockUrls(block: SectionBlock, _base: string): SectionBlock {
  return walkSection(block, (key, value, node) => {
    if (typeof value !== "string") return;
    if (!isAssetKey(value)) return;
    (node as Record<string, string>)[key] = buildProxyUrl(value);
  });
}
