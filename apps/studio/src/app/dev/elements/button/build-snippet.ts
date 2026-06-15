import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { ButtonVariantDefaults, ButtonVariantKey } from "./types";

export function buildButtonElementSnippet(
  _variantKey: ButtonVariantKey,
  variant: ButtonVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementButton",
    ...variant,
  });
}
