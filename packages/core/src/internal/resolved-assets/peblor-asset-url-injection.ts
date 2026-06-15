import { isImageRef } from "../../lib/proxy-url";
import type { bgBlock, ElementBlock, SectionBlock } from "@pb/contracts";
import { walkBgBlock, walkElement, walkSectionKeys } from "./peblor-asset-tree-walk";
import type {
  ResolveImageAssetFn,
  ResolvedImageAsset,
  ElementInjectionContext,
} from "./peblor-asset-url-map";

function isResolvedImageAsset(value: string | ResolvedImageAsset): value is ResolvedImageAsset {
  return typeof value === "object" && value != null && typeof value.src === "string";
}

function resolveAssetRef(
  ref: string,
  urlByRef: Map<string, string | null>,
  proxyUrlByRef: Map<string, string> | undefined,
  resolveImageAsset: ResolveImageAssetFn | undefined,
  obj: Record<string, unknown>,
  key: string,
  isModel3D: boolean,
  elementContext?: ElementInjectionContext
): string | ResolvedImageAsset {
  const proxy = proxyUrlByRef?.get(ref);
  const resolved = urlByRef.get(ref);

  if (isModel3D) {
    return proxy ?? (resolved !== undefined ? (resolved ?? ref) : ref);
  }

  if (isImageRef(ref) && resolveImageAsset) {
    return resolveImageAsset(ref, obj, key, elementContext);
  }

  if (isImageRef(ref)) {
    return resolved !== undefined && resolved != null ? resolved : (proxy ?? ref);
  }

  return proxy ?? (resolved !== undefined ? (resolved ?? ref) : ref);
}

function applyResolvedAssetToNode(
  node: Record<string, unknown>,
  key: string,
  resolved: string | ResolvedImageAsset
): void {
  if (!isResolvedImageAsset(resolved)) {
    node[key] = resolved;
    return;
  }

  node[key] = resolved.src;
  if (node.type === "elementImage" && key === "src") {
    if (resolved.srcSet) node.srcSet = resolved.srcSet;
    if (resolved.blurDataURL) node.blurDataURL = resolved.blurDataURL;
  }
}

export type InjectResolvedUrlsOptions = {
  onElement?: (section: SectionBlock, element: ElementBlock) => void;
};

export function injectResolvedUrlsIntoPage(
  bg: bgBlock | null,
  sections: SectionBlock[],
  urlByRef: Map<string, string | null>,
  proxyUrlByRef?: Map<string, string>,
  resolveImageAsset?: ResolveImageAssetFn,
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
          resolveImageAsset,
          node,
          key,
          kind === "model3d"
        );
        applyResolvedAssetToNode(node, key, resolved);
      })
    : null;

  const resolvedSections: SectionBlock[] = sections.map((section) => {
    const out = walkSectionKeys(section, (key, value, node, kind) => {
      if (typeof value !== "string") return;
      const resolved = resolveAssetRef(
        value,
        urlByRef,
        proxyUrlByRef,
        resolveImageAsset,
        node,
        key,
        kind === "model3d"
      );
      applyResolvedAssetToNode(node, key, resolved);
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

        const resolved = resolveAssetRef(
          value,
          urlByRef,
          proxyUrlByRef,
          resolveImageAsset,
          node,
          key,
          kind === "model3d",
          elementContext
        );
        applyResolvedAssetToNode(node, key, resolved);
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
  resolveImageAsset?: ResolveImageAssetFn
): bgBlock {
  return walkBgBlock(bg, (key, value, node, kind) => {
    if (typeof value !== "string") return;
    const resolved = resolveAssetRef(
      value,
      urlByRef,
      proxyUrlByRef,
      resolveImageAsset,
      node,
      key,
      kind === "model3d"
    );
    applyResolvedAssetToNode(node, key, resolved);
  });
}
