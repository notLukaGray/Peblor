import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { SvgVariantDefaults, SvgVariantKey } from "./types";

export function buildSvgElementSnippet(
  _variantKey: SvgVariantKey,
  variant: SvgVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementSVG",
    ...variant,
  });
}
