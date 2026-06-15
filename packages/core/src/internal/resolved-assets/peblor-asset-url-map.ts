import { isImageRef } from "../../lib/proxy-url";
import type { bgBlock, ElementBlock, SectionBlock } from "@pb/contracts";
import { ASSET_URL_KEYS } from "@pb/contracts";

/** Optional context when resolving URLs for an element; used to compute container width per-element. */
export type ElementInjectionContext = { section: SectionBlock; element: ElementBlock };

export type ResolvedImageAsset = {
  src: string;
  srcSet?: string;
  /** Low-quality image placeholder data URI, resolved at build time. */
  blurDataURL?: string;
};

export type ResolveImageAssetFn = (
  ref: string,
  obj: Record<string, unknown>,
  key: string,
  context?: ElementInjectionContext
) => ResolvedImageAsset;

export function urlMapKey(ref: string, blockId: string): string {
  return `${ref}:${blockId}`;
}

function recordObjIntoUrlByKey(
  obj: Record<string, unknown>,
  blockId: string,
  resolveImageAsset: ResolveImageAssetFn,
  urlByKey: Record<string, string>
): void {
  for (const key of ASSET_URL_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && isImageRef(v)) {
      urlByKey[urlMapKey(v, blockId)] = resolveImageAsset(v, obj, key).src;
    }
  }
  if (obj.type === "backgroundTransition") {
    const from = obj.from as Record<string, unknown> | undefined;
    const to = obj.to as Record<string, unknown> | undefined;
    if (from && typeof from === "object" && "type" in from) {
      recordObjIntoUrlByKey(from, `${blockId}:from`, resolveImageAsset, urlByKey);
    }
    if (to && typeof to === "object" && "type" in to) {
      recordObjIntoUrlByKey(to, `${blockId}:to`, resolveImageAsset, urlByKey);
    }
  }
}

function recordElementIntoUrlByKey(
  el: Record<string, unknown>,
  resolveImageAsset: ResolveImageAssetFn,
  urlByKey: Record<string, string>
): void {
  const blockId = (el.id as string | undefined) ?? "unknown";
  recordObjIntoUrlByKey(el, blockId, resolveImageAsset, urlByKey);
  const moduleConfig = el.moduleConfig as Record<string, unknown> | undefined;
  if (!moduleConfig || typeof moduleConfig !== "object" || !moduleConfig.slots) return;
  const slots = moduleConfig.slots as Record<
    string,
    { section?: { definitions?: Record<string, unknown> } }
  >;
  for (const slot of Object.values(slots)) {
    const section = slot?.section;
    if (!section?.definitions || typeof section.definitions !== "object") continue;
    for (const def of Object.values(section.definitions)) {
      if (def && typeof def === "object") {
        recordElementIntoUrlByKey(def as Record<string, unknown>, resolveImageAsset, urlByKey);
      }
    }
  }
}

export function buildUrlByKeyMap(
  bg: bgBlock | null,
  sections: SectionBlock[],
  bgDefinitions: Record<string, bgBlock>,
  resolveImageAsset: ResolveImageAssetFn
): Record<string, string> {
  const urlByKey: Record<string, string> = {};
  if (bg) recordObjIntoUrlByKey(bg as Record<string, unknown>, "bg", resolveImageAsset, urlByKey);
  for (const section of sections) {
    const elements = (section as Record<string, unknown>).elements;
    if (Array.isArray(elements)) {
      for (const el of elements as ElementBlock[]) {
        recordElementIntoUrlByKey(el as Record<string, unknown>, resolveImageAsset, urlByKey);
      }
    }
  }
  for (const [key, block] of Object.entries(bgDefinitions)) {
    recordObjIntoUrlByKey(block as Record<string, unknown>, key, resolveImageAsset, urlByKey);
  }
  return urlByKey;
}
