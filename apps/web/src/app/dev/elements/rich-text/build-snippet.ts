import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { RichTextVariantDefaults, RichTextVariantKey } from "./types";

export function buildRichTextElementSnippet(
  _variantKey: RichTextVariantKey,
  variant: RichTextVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementRichText",
    ...variant,
  });
}
