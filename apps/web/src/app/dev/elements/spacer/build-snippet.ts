import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { SpacerVariantDefaults, SpacerVariantKey } from "./types";

export function buildSpacerElementSnippet(
  _variantKey: SpacerVariantKey,
  variant: SpacerVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementSpacer",
    ...variant,
  });
}
