import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { VectorVariantDefaults, VectorVariantKey } from "./types";

export function buildVectorElementSnippet(
  _variantKey: VectorVariantKey,
  variant: VectorVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementVector",
    ...variant,
  });
}
