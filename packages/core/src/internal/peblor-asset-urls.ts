import { ASSET_URL_KEYS } from "@pb/contracts";
import type { ElementBlock, ResolvedPage, SectionBlock } from "@pb/contracts";
import {
  getAssetBaseUrl,
  resolveBgBlockUrls,
  resolveElementBlockUrls,
  resolveSectionBlockUrls,
} from "./peblor-blocks";

function collectAssetUrlsFromElement(block: ElementBlock, base: string, urls: string[]): void {
  const resolved = resolveElementBlockUrls(block, base);
  for (const key of ASSET_URL_KEYS) {
    const v = (resolved as Record<string, unknown>)[key];
    if (typeof v === "string" && v) urls.push(v);
  }
}

function collectAssetUrlsFromSection(block: SectionBlock, base: string, urls: string[]): void {
  const resolved = resolveSectionBlockUrls(block, base);
  const hasElements =
    (resolved.type === "contentBlock" ||
      resolved.type === "scrollContainer" ||
      resolved.type === "sectionColumn") &&
    Array.isArray(resolved.elements);
  if (hasElements) {
    for (const child of resolved.elements) collectAssetUrlsFromElement(child, base, urls);
  }
  if (resolved.type === "revealSection") {
    const r = resolved as {
      collapsedElements?: ElementBlock[];
      revealedElements?: ElementBlock[];
    };
    const collapsed = r.collapsedElements ?? [];
    const revealed = r.revealedElements ?? [];
    for (const child of [...collapsed, ...revealed]) {
      collectAssetUrlsFromElement(child, base, urls);
    }
  }
}

export function getAllAssetUrlsFromPage(page: ResolvedPage): string[] {
  const base = getAssetBaseUrl(page);
  const urls: string[] = [];
  if (page.bg) {
    const resolved = resolveBgBlockUrls(page.bg, base);
    for (const key of ASSET_URL_KEYS) {
      const v = (resolved as Record<string, unknown>)[key];
      if (typeof v === "string" && v) urls.push(v);
    }
  }
  for (const section of page.sections ?? []) {
    collectAssetUrlsFromSection(section, base, urls);
  }
  return [...new Set(urls)];
}
