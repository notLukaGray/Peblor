import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { ScrollProgressBarVariantDefaults, ScrollProgressBarVariantKey } from "./types";

export function buildScrollProgressBarElementSnippet(
  _variantKey: ScrollProgressBarVariantKey,
  variant: ScrollProgressBarVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementScrollProgressBar",
    ...variant,
  });
}
