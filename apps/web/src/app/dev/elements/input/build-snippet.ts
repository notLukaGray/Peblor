import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { InputVariantDefaults, InputVariantKey } from "./types";

export function buildInputElementSnippet(
  _variantKey: InputVariantKey,
  variant: InputVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementInput",
    ...variant,
  });
}
