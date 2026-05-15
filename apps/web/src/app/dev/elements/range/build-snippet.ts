import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { RangeVariantDefaults, RangeVariantKey } from "./types";

export function buildRangeElementSnippet(
  _variantKey: RangeVariantKey,
  variant: RangeVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementRange",
    ...variant,
  });
}
