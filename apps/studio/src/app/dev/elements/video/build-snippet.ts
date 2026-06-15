import { mergeTypographyDevRuntime } from "@/app/dev/elements/image/runtime-draft";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { VideoVariantDefaults, VideoVariantKey } from "./types";

export function buildVideoElementSnippet(
  _variantKey: VideoVariantKey,
  variant: VideoVariantDefaults,
  draft: ImageRuntimeDraft
): Record<string, unknown> {
  return mergeTypographyDevRuntime(draft, {
    type: "elementVideo",
    ...variant,
  });
}
