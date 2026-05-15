import { isImageRef } from "../../lib/proxy-url";
import type { bgBlock, ElementBlock, SectionBlock } from "@pb/contracts";
import { walkBgBlock, walkElement, walkSectionKeys } from "./peblor-asset-tree-walk";
import type { GetSignedImageUrlFn, ElementInjectionContext } from "./peblor-asset-url-map";

function resolveAssetRef(
  ref: string,
  urlByRef: Map<string, string | null>,
  proxyUrlByRef: Map<string, string> | undefined,
  getSignedImageUrl: GetSignedImageUrlFn | undefined,
  obj: Record<string, unknown>,
  key: string,
  isModel3D: boolean,
  elementContext?: ElementInjectionContext
): string {
  const proxy = proxyUrlByRef?.get(ref);
  const cdn = urlByRef.get(ref);
  const lower = ref.toLowerCase();
  const isRawVideoRef = lower.endsWith(".webm") || lower.endsWith(".mp4");
  const isHlsPlaylistRef = lower.endsWith(".m3u8");

  if (isModel3D) {
    return proxy ?? (cdn !== undefined ? (cdn ?? ref) : ref);
  }

  if (isImageRef(ref) && getSignedImageUrl) {
    return getSignedImageUrl(ref, obj, key, elementContext);
  }

  if (isImageRef(ref)) {
    return cdn !== undefined && cdn != null ? cdn : (proxy ?? ref);
  }

  // For videos, prefer direct signed CDN URL over same-origin proxy redirect.
  if (isRawVideoRef) {
    return cdn !== undefined && cdn != null ? cdn : (proxy ?? ref);
  }

  // HLS should stream directly from Bunny; CORS and playlist child URLs are handled at the CDN.
  if (isHlsPlaylistRef) {
    return cdn !== undefined && cdn != null ? cdn : (proxy ?? ref);
  }

  return proxy ?? (cdn !== undefined ? (cdn ?? ref) : ref);
}

export type InjectResolvedUrlsOptions = {
  onElement?: (section: SectionBlock, element: ElementBlock) => void;
};

export function injectResolvedUrlsIntoPage(
  bg: bgBlock | null,
  sections: SectionBlock[],
  urlByRef: Map<string, string | null>,
  proxyUrlByRef?: Map<string, string>,
  getSignedImageUrl?: GetSignedImageUrlFn,
  options?: InjectResolvedUrlsOptions
): { resolvedBg: bgBlock | null; resolvedSections: SectionBlock[] } {
  const onElement = options?.onElement;
  const resolvedBg: bgBlock | null = bg
    ? walkBgBlock(bg, (key, value, node, kind) => {
        if (typeof value !== "string") return;
        const resolved = resolveAssetRef(
          value,
          urlByRef,
          proxyUrlByRef,
          getSignedImageUrl,
          node,
          key,
          kind === "model3d"
        );
        node[key] = resolved;
      })
    : null;

  const resolvedSections: SectionBlock[] = sections.map((section) => {
    const out = walkSectionKeys(section, (key, value, node, kind) => {
      if (typeof value !== "string") return;
      const resolved = resolveAssetRef(
        value,
        urlByRef,
        proxyUrlByRef,
        getSignedImageUrl,
        node,
        key,
        kind === "model3d"
      );
      node[key] = resolved;
    });

    const injectElement = (el: ElementBlock): ElementBlock => {
      onElement?.(section, el);
      const elementContext: ElementInjectionContext = {
        section,
        element: el,
      };
      return walkElement(el, (key, value, node, kind) => {
        if (typeof value !== "string") return;

        if (kind === "model3d" && el.type !== "elementModel3D") {
          return;
        }

        node[key] = resolveAssetRef(
          value,
          urlByRef,
          proxyUrlByRef,
          getSignedImageUrl,
          node,
          key,
          kind === "model3d",
          elementContext
        );
      });
    };

    const output = out as SectionBlock & {
      elements?: ElementBlock[];
      collapsedElements?: ElementBlock[];
      revealedElements?: ElementBlock[];
    };
    if (Array.isArray(output.elements)) {
      output.elements = output.elements.map((el) =>
        el && typeof el === "object" ? injectElement(el) : el
      );
    }
    if (Array.isArray(output.collapsedElements)) {
      output.collapsedElements = output.collapsedElements.map((el) =>
        el && typeof el === "object" ? injectElement(el) : el
      );
    }
    if (Array.isArray(output.revealedElements)) {
      output.revealedElements = output.revealedElements.map((el) =>
        el && typeof el === "object" ? injectElement(el) : el
      );
    }
    return out;
  });

  return { resolvedBg, resolvedSections };
}

/** Inject URLs into a single bg block (for bg definitions). Avoids full page inject. */
export function injectResolvedUrlsIntoBgBlock(
  bg: bgBlock,
  urlByRef: Map<string, string | null>,
  proxyUrlByRef?: Map<string, string>,
  getSignedImageUrl?: GetSignedImageUrlFn
): bgBlock {
  return walkBgBlock(bg, (key, value, node, kind) => {
    if (typeof value !== "string") return;
    const resolved = resolveAssetRef(
      value,
      urlByRef,
      proxyUrlByRef,
      getSignedImageUrl,
      node,
      key,
      kind === "model3d"
    );
    node[key] = resolved;
  });
}
