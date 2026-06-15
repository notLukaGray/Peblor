import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { LinkVariantDefaults, LinkVariantKey } from "./types";

export function buildLinkElementSnippet(
  _variantKey: LinkVariantKey,
  variant: LinkVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementLink",
    ...variant,
  });
}
