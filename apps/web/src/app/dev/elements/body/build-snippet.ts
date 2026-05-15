import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { BodyVariantDefaults, BodyVariantKey } from "./types";

export function buildBodyElementSnippet(
  _variantKey: BodyVariantKey,
  variant: BodyVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementBody",
    ...variant,
  });
}
