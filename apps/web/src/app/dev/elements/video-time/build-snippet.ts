import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { VideoTimeVariantDefaults, VideoTimeVariantKey } from "./types";

export function buildVideoTimeElementSnippet(
  _variantKey: VideoTimeVariantKey,
  variant: VideoTimeVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementVideoTime",
    ...variant,
  });
}
