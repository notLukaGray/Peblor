import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { RiveVariantDefaults, RiveVariantKey } from "./types";

export function buildRiveElementSnippet(
  _variantKey: RiveVariantKey,
  variant: RiveVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementRive",
    ...variant,
  });
}
