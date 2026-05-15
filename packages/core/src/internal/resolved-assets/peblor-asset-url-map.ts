import { isImageRef } from "../../lib/proxy-url";
import type { bgBlock, ElementBlock, SectionBlock } from "@pb/contracts";
import { ASSET_URL_KEYS } from "@pb/contracts";

/** Optional context when resolving URLs for an element; used to compute container width per-element. */
export type ElementInjectionContext = { section: SectionBlock; element: ElementBlock };

export type GetSignedImageUrlFn = (
  ref: string,
  obj: Record<string, unknown>,
  key: string,
  context?: ElementInjectionContext
) => string;

export function urlMapKey(ref: string, blockId: string): string {
  return `${ref}:${blockId}`;
}

function recordObjIntoUrlByKey(
  obj: Record<string, unknown>,
  blockId: string,
  getSignedImageUrl: GetSignedImageUrlFn,
  urlByKey: Record<string, string>
): void {
  for (const key of ASSET_URL_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && isImageRef(v)) {
      urlByKey[urlMapKey(v, blockId)] = getSignedImageUrl(v, obj, key);
    }
  }
  if (obj.type === "backgroundTransition") {
    const from = obj.from as Record<string, unknown> | undefined;
    const to = obj.to as Record<string, unknown> | undefined;
    if (from && typeof from === "object" && "type" in from) {
      recordObjIntoUrlByKey(from, `${blockId}:from`, getSignedImageUrl, urlByKey);
    }
    if (to && typeof to === "object" && "type" in to) {
      recordObjIntoUrlByKey(to, `${blockId}:to`, getSignedImageUrl, urlByKey);
    }
  }
}

function recordElementIntoUrlByKey(
  el: Record<string, unknown>,
  getSignedImageUrl: GetSignedImageUrlFn,
  urlByKey: Record<string, string>
): void {
  const blockId = (el.id as string | undefined) ?? "unknown";
  recordObjIntoUrlByKey(el, blockId, getSignedImageUrl, urlByKey);
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
        recordElementIntoUrlByKey(def as Record<string, unknown>, getSignedImageUrl, urlByKey);
      }
    }
  }
}

export type BuildUrlByKeyMapOptions = {
  onElement?: (section: SectionBlock, element: ElementBlock) => void;
};

export function buildUrlByKeyMap(
  bg: bgBlock | null,
  sections: SectionBlock[],
  bgDefinitions: Record<string, bgBlock>,
  getSignedImageUrl: GetSignedImageUrlFn,
  options?: BuildUrlByKeyMapOptions
): Record<string, string> {
  const urlByKey: Record<string, string> = {};
  const onElement = options?.onElement;
  if (bg) recordObjIntoUrlByKey(bg as Record<string, unknown>, "bg", getSignedImageUrl, urlByKey);
  for (const section of sections) {
    const elements = (section as Record<string, unknown>).elements;
    if (Array.isArray(elements)) {
      for (const el of elements as ElementBlock[]) {
        onElement?.(section, el);
        recordElementIntoUrlByKey(el as Record<string, unknown>, getSignedImageUrl, urlByKey);
      }
    }
  }
  for (const [key, block] of Object.entries(bgDefinitions)) {
    recordObjIntoUrlByKey(block as Record<string, unknown>, key, getSignedImageUrl, urlByKey);
  }
  return urlByKey;
}
