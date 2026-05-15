import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { Model3dVariantDefaults, Model3dVariantKey } from "./types";

export function buildModel3dElementSnippet(
  _variantKey: Model3dVariantKey,
  variant: Model3dVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementModel3D",
    ...variant,
  });
}
