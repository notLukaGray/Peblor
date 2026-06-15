import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { HeadingVariantDefaults, HeadingVariantKey } from "./types";

export function buildHeadingElementSnippet(
  _variantKey: HeadingVariantKey,
  variant: HeadingVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementHeading",
    ...variant,
  });
}
