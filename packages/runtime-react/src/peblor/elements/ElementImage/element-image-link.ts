import type { ElementBlock } from "@pb/contracts/types";
import { resolveGraphicLinkHref } from "@pb/runtime-react/core/lib/url-policy";

type ElementImageProps = Extract<ElementBlock, { type: "elementImage" }>;

export function resolveElementImageLink(link: ElementImageProps["link"]) {
  const resolvedHref = resolveGraphicLinkHref(link?.ref, link?.external ?? false);
  const isExternal = link?.external === true;
  const isInternal = Boolean(resolvedHref && !isExternal && resolvedHref.startsWith("/"));
  return { resolvedHref, isInternal };
}
